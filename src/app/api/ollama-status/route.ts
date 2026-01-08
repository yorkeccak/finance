import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in self-hosted mode with Ollama support
    const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';

    if (!isSelfHosted) {
      return NextResponse.json({
        connected: false,
        available: false,
        message: 'Ollama is only available in self-hosted mode',
        mode: 'valyu'
      });
    }

    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    try {
      // Try to connect to Ollama API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];

        return NextResponse.json({
          connected: true,
          available: true,
          mode: 'self-hosted',
          baseUrl: ollamaBaseUrl,
          models: models.map((model: any) => ({
            name: model.name,
            size: model.size,
            modified_at: model.modified_at
          })),
          message: `Connected to Ollama with ${models.length} model(s) available`
        });
      } else {
        return NextResponse.json({
          connected: false,
          available: true,
          mode: 'self-hosted',
          baseUrl: ollamaBaseUrl,
          models: [],
          message: `Ollama server responded with status ${response.status}`,
          error: 'Server error'
        });
      }
    } catch (error: any) {
      // Check if it's a timeout or connection error
      if (error.name === 'AbortError') {
        return NextResponse.json({
          connected: false,
          available: true,
          mode: 'self-hosted',
          baseUrl: ollamaBaseUrl,
          models: [],
          message: 'Connection to Ollama timed out (5s)',
          error: 'Timeout'
        });
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
        return NextResponse.json({
          connected: false,
          available: true,
          mode: 'self-hosted',
          baseUrl: ollamaBaseUrl,
          models: [],
          message: 'Could not connect to Ollama server. Is it running?',
          error: 'Connection refused'
        });
      } else {
        return NextResponse.json({
          connected: false,
          available: true,
          mode: 'self-hosted',
          baseUrl: ollamaBaseUrl,
          models: [],
          message: 'Unexpected error connecting to Ollama',
          error: error.message
        });
      }
    }
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      available: false,
      mode: process.env.APP_MODE || 'valyu',
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
