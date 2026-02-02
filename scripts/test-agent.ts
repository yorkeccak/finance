/**
 * Test script to mimic the agent setup from api/chat/route.ts
 * Run with: npx tsx scripts/test-agent.ts
 *
 * This helps debug tool call structures and response formats
 */

import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { financeTools } from "../src/lib/tools";

// Load .env.local manually
import { readFileSync } from 'fs';
import { resolve } from 'path';
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
} catch (e) { /* no .env.local */ }

const QUERY = process.argv[2] || "Search for GameStop SEC filings about insider ownership";

async function main() {
  console.log("\n=== Agent Test Script ===\n");
  console.log("Query:", QUERY);
  console.log("Mode:", process.env.NEXT_PUBLIC_APP_MODE || 'default');
  console.log("VALYU_API_KEY:", process.env.VALYU_API_KEY ? '✓ Set' : '✗ Missing');
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing');
  console.log("\n---\n");

  const model = openai("gpt-4o-mini");

  const messages = [{ role: "user" as const, content: QUERY }];

  console.log("Starting generateText with tools...\n");

  try {
    const result = await generateText({
      model,
      messages,
      tools: financeTools,
      toolChoice: "auto",
      stopWhen: stepCountIs(5),
      system: `You are a helpful assistant. Use the available tools to answer the user's question.

      Available tools:
      - secSearch: Search SEC filings (10-K, 10-Q, 8-K, insider transactions)
      - financeSearch: Search financial data (stock prices, earnings, balance sheets)
      - webSearch: General web search
      `,
    });

    console.log("\n\n=== Final Result ===\n");
    console.log("Response ID:", result.response?.id);
    console.log("Finish Reason:", result.finishReason);
    console.log("Steps:", result.steps?.length);
    console.log("\nFinal Text:", result.text?.slice(0, 500));

    // Show detailed step info
    console.log("\n\n=== Detailed Steps ===\n");
    result.steps?.forEach((step, i) => {
      console.log(`\n--- Step ${i + 1} ---`);

      if (step.toolCalls?.length) {
        console.log("\nTool Calls:");
        step.toolCalls.forEach((call, j) => {
          console.log(`  [${j}] ${call.toolName}:`, JSON.stringify(call.args, null, 2).slice(0, 200));
        });
      }

      if (step.toolResults?.length) {
        console.log("\nTool Results:");
        step.toolResults.forEach((res, j) => {
          console.log(`  [${j}]:`);
          const r = res.result as any;
          if (typeof r === 'object' && r !== null) {
            console.log("    Type: object");
            console.log("    Keys:", Object.keys(r));
            console.log("    results.length:", r.results?.length);
            console.log("    error:", r.error);
            // Full first result
            if (r.results?.[0]) {
              console.log("    First result (full):", JSON.stringify(r.results[0], null, 2).slice(0, 500));
            }
          } else {
            console.log("    Value:", String(r).slice(0, 200));
          }
        });
      }

      if (step.text) {
        console.log("\nText:", step.text.slice(0, 200) + (step.text.length > 200 ? '...' : ''));
      }
    });

  } catch (error) {
    console.error("\n=== Error ===\n");
    console.error(error);
  }
}

main();
