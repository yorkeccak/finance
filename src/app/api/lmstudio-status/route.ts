import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface LMStudioModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface LMStudioModelsResponse {
  object: string;
  data: LMStudioModel[];
}

export async function GET() {
  const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';

  if (!isSelfHosted) {
    return NextResponse.json({
      connected: false,
      available: false,
      mode: 'valyu' as const,
      message: 'LM Studio is only available in self-hosted mode'
    });
  }

  const baseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LM Studio responded with status ${response.status}`);
    }

    const data: LMStudioModelsResponse = await response.json();

    // Transform LM Studio's OpenAI-format response to our format
    const models = data.data.map(model => ({
      name: model.id,
      // LM Studio doesn't provide size or modified_at in /v1/models
      size: 0,
      modified_at: new Date().toISOString(), // Use current time since LM Studio doesn't provide this
    }));

    return NextResponse.json({
      connected: true,
      available: true,
      mode: 'self-hosted' as const,
      baseUrl,
      models,
      message: models.length > 0
        ? `Connected to LM Studio with ${models.length} model${models.length === 1 ? '' : 's'}`
        : 'Connected to LM Studio but no models are loaded',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          connected: false,
          available: true,
          mode: 'self-hosted' as const,
          message: 'LM Studio connection timeout (5s). Make sure LM Studio server is running.',
          error: 'Connection timeout',
        });
      }

      if (error.message.includes('ECONNREFUSED')) {
        return NextResponse.json({
          connected: false,
          available: true,
          mode: 'self-hosted' as const,
          message: 'LM Studio server is not running. Start the server in LM Studio.',
          error: 'Connection refused',
        });
      }

      return NextResponse.json({
        connected: false,
        available: true,
        mode: 'self-hosted' as const,
        message: `Failed to connect to LM Studio: ${error.message}`,
        error: error.message,
      });
    }

    return NextResponse.json({
      connected: false,
      available: true,
      mode: 'self-hosted' as const,
      message: 'Unknown error connecting to LM Studio',
      error: 'Unknown error',
    });
  }
}
