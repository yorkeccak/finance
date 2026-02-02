/**
 * Test script for SEC Search functionality
 * Run with: npx tsx scripts/test-sec-search.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually parse .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').replace(/^["']|["']$/g, '');
    // Handle inline comments
    const commentIdx = value.indexOf(' #');
    if (commentIdx > 0) value = value.slice(0, commentIdx).trim();
    process.env[key.trim()] = value;
  }
}

// Import Valyu SDK tools after env is loaded
import {
  secSearch as valyuSecSearch,
} from '@valyu/ai-sdk';

async function testSecSearch() {
  console.log('=== SEC Search Test ===\n');

  // Check environment
  const apiKey = process.env.VALYU_API_KEY;
  const appMode = process.env.NEXT_PUBLIC_APP_MODE;

  console.log('Environment:');
  console.log(`  NEXT_PUBLIC_APP_MODE: ${appMode}`);
  console.log(`  VALYU_API_KEY: ${apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT SET'}`);
  console.log();

  if (!apiKey) {
    console.error('ERROR: VALYU_API_KEY not set');
    process.exit(1);
  }

  // Create the tool
  const secSearchTool = valyuSecSearch({ maxNumResults: 5 });

  console.log('Tool created:');
  console.log(`  Description: ${secSearchTool.description?.slice(0, 100)}...`);
  console.log();

  // Test queries
  const testQueries = [
    'GameStop 10-K 2024',
    'Tesla risk factors SEC filing',
    'Apple 10-K annual report',
    'Microsoft proxy statement DEF 14A',
    'NVDA SEC filing 2024',
  ];

  for (const query of testQueries) {
    console.log(`\n--- Testing: "${query}" ---`);

    try {
      // Execute the tool
      const result = await secSearchTool.execute({ query }, {});

      console.log('Result type:', typeof result);

      if (typeof result === 'string') {
        console.log('String result:', result);
      } else if (result && typeof result === 'object') {
        // Check for results array
        if ('results' in result && Array.isArray(result.results)) {
          console.log(`Found ${result.results.length} results`);
          if (result.results.length > 0) {
            console.log('First result:');
            const first = result.results[0];
            console.log(`  Title: ${first.title || 'N/A'}`);
            console.log(`  URL: ${first.url || 'N/A'}`);
            console.log(`  Source: ${first.source || 'N/A'}`);
            console.log(`  Content: ${first.content?.slice(0, 200) || 'N/A'}...`);
          }
        } else {
          console.log('Full result:', JSON.stringify(result, null, 2).slice(0, 500));
        }

        // Check for cost info
        if ('total_deduction_dollars' in result) {
          console.log(`Cost: $${result.total_deduction_dollars}`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  console.log('\n=== Test Complete ===');
}

// Also test direct API call to Valyu
async function testDirectApiCall() {
  console.log('\n\n=== Direct Valyu API Test ===\n');

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    console.error('ERROR: VALYU_API_KEY not set');
    return;
  }

  const query = 'GameStop 10-K 2024';

  console.log(`Testing direct API call for: "${query}"`);

  try {
    const response = await fetch('https://api.valyu.ai/v1/deepsearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        search_type: 'proprietary',
        max_num_results: 5,
        included_sources: ['valyu/valyu-sec-filings'],
      }),
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('API Response:');
    console.log(`  Results count: ${data.results?.length || 0}`);
    console.log(`  Total deduction: $${data.total_deduction_dollars || 0}`);
    console.log(`  TX ID: ${data.tx_id || 'N/A'}`);

    if (data.results?.length > 0) {
      console.log('\nFirst result:');
      const first = data.results[0];
      console.log(`  Title: ${first.title || 'N/A'}`);
      console.log(`  URL: ${first.url || 'N/A'}`);
      console.log(`  Source: ${first.source || 'N/A'}`);
    } else {
      console.log('\nNo results returned!');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Test what sources are available
async function testAvailableSources() {
  console.log('\n\n=== Testing Different Source Configurations ===\n');

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) return;

  const query = 'Apple 10-K 2024';

  const sourceConfigs = [
    { name: 'valyu-sec-filings', sources: ['valyu/valyu-sec-filings'] },
    { name: 'sec-filings (no prefix)', sources: ['sec-filings'] },
    { name: 'category: sec', category: 'sec' },
    { name: 'category: finance', category: 'finance' },
    { name: 'no source filter (all)', sources: undefined },
  ];

  for (const config of sourceConfigs) {
    console.log(`\n--- Testing: ${config.name} ---`);

    try {
      const body: Record<string, any> = {
        query,
        search_type: 'proprietary',
        max_num_results: 3,
      };

      if (config.sources) {
        body.included_sources = config.sources;
      }
      if (config.category) {
        body.category = config.category;
      }

      const response = await fetch('https://api.valyu.ai/v1/deepsearch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`  Status: ${response.status} - ${errorText.slice(0, 100)}`);
        continue;
      }

      const data = await response.json();
      console.log(`  Results: ${data.results?.length || 0}`);
      if (data.results?.length > 0) {
        console.log(`  First source: ${data.results[0].source || 'N/A'}`);
        console.log(`  First title: ${data.results[0].title?.slice(0, 60) || 'N/A'}`);
      }
    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
    }
  }
}

// Run all tests
async function main() {
  await testSecSearch();
  await testDirectApiCall();
  await testAvailableSources();
}

main().catch(console.error);
