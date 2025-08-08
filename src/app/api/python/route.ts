import { NextRequest, NextResponse } from 'next/server';
import { Daytona } from '@daytonaio/sdk';

// Ensure we run on the Node.js runtime since Daytona SDK requires Node APIs
export const runtime = 'nodejs';

// Handle OPTIONS requests for CORS
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    // Parse the request body to get the code and description
    const { code, description } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid request: code is required and must be a string',
        output: '',
        code: '',
        success: false,
        executionTime: 0,
        description
      }, { status: 400 });
    }

    // Check for reasonable code length
    if (code.length > 10000) {
      return NextResponse.json({ 
        error: '🚫 Code too long. Please limit your code to 10,000 characters.',
        output: '',
        code,
        success: false,
        executionTime: 0,
        description
      }, { status: 400 });
    }
    
    const startTime = Date.now();

    // Initialize Daytona client
    const daytonaApiKey = process.env.DAYTONA_API_KEY;
    if (!daytonaApiKey) {
      return NextResponse.json({
        error: 'Daytona API key is not configured. Please set DAYTONA_API_KEY in your environment.',
        output: '',
        code,
        success: false,
        executionTime: 0,
        description,
      }, { status: 500 });
    }

    const daytona = new Daytona({
      apiKey: daytonaApiKey,
      // Optional overrides if provided
      serverUrl: process.env.DAYTONA_API_URL,
      target: (process.env.DAYTONA_TARGET as any) || undefined,
    });

    let sandbox: any | null = null;
    try {
      // Create a Python sandbox
      sandbox = await daytona.create({ language: 'python' });

      // Execute the user's code
      const execution = await sandbox.process.codeRun(code);
      const executionTime = Date.now() - startTime;

      // Daytona returns exitCode and result (stdout/stderr)
      if (execution.exitCode !== 0) {
        // Provide helpful error messages for common issues
        let helpfulError = execution.result || 'Unknown execution error';
        if (helpfulError.includes('NameError')) {
          helpfulError = `${helpfulError}\n\n💡 **Tip**: Make sure all variables are defined before use. If you're trying to calculate something, include the full calculation in your code.`;
        } else if (helpfulError.includes('SyntaxError')) {
          helpfulError = `${helpfulError}\n\n💡 **Tip**: Check your Python syntax. Make sure all parentheses, quotes, and indentation are correct.`;
        } else if (helpfulError.includes('ModuleNotFoundError')) {
          helpfulError = `${helpfulError}\n\n💡 **Tip**: You can install packages inside the Daytona sandbox using pip if needed (e.g., pip install numpy).`;
        }

        return NextResponse.json({
          success: false,
          output: '',
          error: `❌ **Execution Error**: ${helpfulError}`,
          executionTime,
          description,
          executedCode: code,
          artifacts: execution.artifacts || null,
        });
      }

      // Success
      return NextResponse.json({
        success: true,
        output: execution.result || '(No output)',
        error: null,
        executionTime,
        description,
        executedCode: code,
        artifacts: execution.artifacts || null,
      });
    } finally {
      // Clean up sandbox
      try {
        if (sandbox) {
          await sandbox.delete();
        }
      } catch (cleanupError) {
        console.error('Failed to delete Daytona sandbox:', cleanupError);
      }
    }
    
  } catch (error: any) {
    console.error('Error in Python execution route:', error);
    
    return NextResponse.json({
      error: `Server error: ${error.message || 'Unknown error'}`,
      output: '',
      code: '',
      success: false,
      executionTime: 0
    }, { status: 500 });
  }
}