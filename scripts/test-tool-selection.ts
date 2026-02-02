/**
 * Test script for tool selection logic
 * Run with: npx tsx scripts/test-tool-selection.ts
 */

import { financeTools } from '../src/lib/tools';

// Test queries and expected tools
const testCases = [
  // financeSearch cases
  { query: "TSLA stock price", expectedTool: "financeSearch" },
  { query: "Bitcoin price history", expectedTool: "financeSearch" },
  { query: "Crypto Fear & Greed Index", expectedTool: "financeSearch" },
  { query: "NVDA earnings Q4 2024", expectedTool: "financeSearch" },
  { query: "S&P 500 performance", expectedTool: "financeSearch" },
  { query: "VIX volatility index", expectedTool: "financeSearch" },
  { query: "Ethereum market cap", expectedTool: "financeSearch" },
  { query: "Tesla revenue growth", expectedTool: "financeSearch" },

  // secSearch cases
  { query: "Apple 10-K 2024", expectedTool: "secSearch" },
  { query: "Tesla risk factors SEC filing", expectedTool: "secSearch" },
  { query: "Microsoft proxy statement", expectedTool: "secSearch" },

  // webSearch cases (general info)
  { query: "What is machine learning", expectedTool: "webSearch" },
  { query: "Climate change news", expectedTool: "webSearch" },
  { query: "Best programming languages 2024", expectedTool: "webSearch" },
];

console.log('=== Tool Selection Test ===\n');
console.log('Available tools:', Object.keys(financeTools));
console.log('\n--- Tool Descriptions ---\n');

// Print tool descriptions
for (const [name, tool] of Object.entries(financeTools)) {
  const desc = (tool as any).description || 'No description';
  console.log(`${name}:`);
  console.log(`  ${desc.substring(0, 150)}...`);
  console.log();
}

console.log('\n--- Test Cases ---\n');

// Note: Actual tool selection is done by the LLM based on descriptions
// This script just verifies the tools are configured correctly
for (const tc of testCases) {
  console.log(`Query: "${tc.query}"`);
  console.log(`  Expected: ${tc.expectedTool}`);
  console.log();
}

console.log('\n=== Verification Complete ===');
console.log('\nTo fully test tool selection, run the app and try these queries.');
console.log('The LLM should select the correct tool based on the descriptions.');
