import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate title using AI
    const { text } = await generateText({
      model: openai('gpt-5-nano'),
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
    // Fallback to simple truncation
    const { message } = await req.json();
    const fallbackTitle = message.substring(0, 47) + '...';
    
    return new Response(JSON.stringify({ title: fallbackTitle }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}