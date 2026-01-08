import { generateText } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  let requestBody: { message: string } | null = null;

  try {
    requestBody = await req.json();

    if (!requestBody) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { message } = requestBody;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';
    const localEnabled = req.headers.get('x-ollama-enabled') !== 'false';
    const localProvider = (req.headers.get('x-local-provider') as 'ollama' | 'lmstudio' | null) || 'ollama';
    let selectedModel;

    // Try to use local provider in self-hosted mode if enabled
    if (isSelfHosted && localEnabled) {
      try {
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const lmstudioBaseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234';

        let models: any[] = [];
        let providerName = '';
        let baseURL = '';

        if (localProvider === 'lmstudio') {
          const lmstudioResponse = await fetch(`${lmstudioBaseUrl}/v1/models`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
          });

          if (lmstudioResponse.ok) {
            const data = await lmstudioResponse.json();
            models = data.data.map((m: any) => ({ name: m.id })) || [];
            providerName = 'LM Studio';
            baseURL = `${lmstudioBaseUrl}/v1`;
          }
        } else {
          const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
          });

          if (ollamaResponse.ok) {
            const data = await ollamaResponse.json();
            models = data.models || [];
            providerName = 'Ollama';
            baseURL = `${ollamaBaseUrl}/v1`;
          }
        }

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

          const localProviderClient = createOpenAI({
            baseURL: baseURL,
            apiKey: localProvider === 'lmstudio' ? 'lm-studio' : 'ollama',
          });

          selectedModel = localProviderClient.chat(selectedModelName);
        }
      } catch (error) {
        // Silently fallback to OpenAI
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