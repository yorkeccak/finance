import { Ingestion } from "@polar-sh/ingestion";
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM";
import { openai } from "@ai-sdk/openai";

// Initialize Polar LLM Ingestion Strategy
let llmIngestion: any = null;

export function initializePolarLLMStrategy() {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    console.error('[PolarLLM] POLAR_ACCESS_TOKEN not found');
    throw new Error('POLAR_ACCESS_TOKEN required for LLM tracking');
  }

  if (!llmIngestion) {
    
    llmIngestion = Ingestion({ 
      accessToken: process.env.POLAR_ACCESS_TOKEN 
    })
    .strategy(new LLMStrategy(openai("gpt-5"))) // Default model, can be overridden
    .ingest("llm_tokens"); // This should match your Polar meter filter
    
  }
  
  return llmIngestion;
}

// Get a wrapped model for a specific customer
export function getPolarTrackedModel(userId: string, modelName: string = "gpt-5") {
  const ingestion = initializePolarLLMStrategy();
  
  
  // Return the wrapped model with customer tracking
  const trackedModel = ingestion.client({
    externalCustomerId: userId
  });
  
  return trackedModel;
}

// Alternative function to get different model types
export function getPolarTrackedOpenAIModel(userId: string, modelName: string = "gpt-5") {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    console.error('[PolarLLM] POLAR_ACCESS_TOKEN not found - returning unwrapped model');
    return openai(modelName);
  }

  try {
    const ingestion = Ingestion({ 
      accessToken: process.env.POLAR_ACCESS_TOKEN 
    })
    .strategy(new LLMStrategy(openai(modelName)))
    .ingest("llm_tokens");
    
    return ingestion.client({
      externalCustomerId: userId
    });
  } catch (error) {
    console.error('[PolarLLM] Failed to create tracked model:', error);
    return openai(modelName);
  }
}