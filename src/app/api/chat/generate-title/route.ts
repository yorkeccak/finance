import { generateText } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  let requestBody: { message: string } | null = null;

  try {
    requestBody = await req.json();
    const { message } = requestBody;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
    const ollamaEnabled = req.headers.get('x-ollama-enabled') !== 'false';
    let selectedModel;

    // Try to use Ollama in development mode if enabled
    if (isDevelopment && ollamaEnabled) {
      try {
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });

        if (ollamaResponse.ok) {
          const data = await ollamaResponse.json();
          const models = data.models || [];

          if (models.length > 0) {
            const preferredModels = ['llama3.1', 'gemma3:4b', 'gemma3', 'llama3.2', 'llama3', 'qwen2.5'];
            let selectedModelName = models[0].name;

            // Try to find a preferred model
            for (const preferred of preferredModels) {
              if (models.some((m: any) => m.name.includes(preferred))) {
                selectedModelName = models.find((m: any) => m.name.includes(preferred))?.name;
                break;
              }
            }

            const ollamaAsOpenAI = createOpenAI({
              baseURL: `${ollamaBaseUrl}/v1`,
              apiKey: 'ollama',
            });

            selectedModel = ollamaAsOpenAI.chat(selectedModelName);
            console.log(`[Title Gen] Using Ollama model: ${selectedModelName}`);
          }
        }
      } catch (error) {
        console.log('[Title Gen] Ollama not available, falling back to OpenAI:', error);
      }
    }

    // Fallback to OpenAI if Ollama not available
    if (!selectedModel) {
      selectedModel = openai('gpt-5-nano');
    }

    // Generate title using AI
    const { text } = await generateText({
      model: selectedModel,
      prompt: `Generate a concise title (max 50 characters) for a chat conversation that starts with this message.
      The title should capture the main topic or question.
      If it's about a specific company/stock ticker, include it.
      Return ONLY the title, no quotes, no explanation.

      User message: "${message}"`,
      temperature: 0.3
    });

    const title = text.trim().substring(0, 50);

    return new Response(JSON.stringify({ title }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Title generation error:', error);
    // Fallback to simple truncation using cached request body
    if (requestBody?.message) {
      const fallbackTitle = requestBody.message.substring(0, 47) + '...';

      return new Response(JSON.stringify({ title: fallbackTitle }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If we don't have the message, return a generic title
    return new Response(JSON.stringify({ title: 'New Chat' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}