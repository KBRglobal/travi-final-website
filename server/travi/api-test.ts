/**
 * TRAVI API Test Utilities
 * 
 * Simple test functions for each external API to verify they work correctly.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Test results interface
export interface APITestResult {
  service: string;
  success: boolean;
  response?: string;
  error?: string;
  duration: number;
}

// Test Gemini API
export async function testGeminiAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  console.log('=== GEMINI API TEST START ===');
  console.log('API Key configured:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    return {
      service: 'gemini',
      success: false,
      error: 'No API key configured (checked AI_INTEGRATIONS_GEMINI_API_KEY and GEMINI_API_KEY)',
      duration: Date.now() - startTime
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log('Calling Gemini API...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Write a 30-word description of Burj Khalifa in Dubai.' }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    });
    
    const response = result.response;
    const text = response.text();
    
    console.log('✅ GEMINI SUCCESS');
    console.log('Response:', text);
    
    return {
      service: 'gemini',
      success: true,
      response: text,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    console.log('❌ GEMINI FAILED');
    console.log('Error:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      response: error.response?.data,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    return {
      service: 'gemini',
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Test OpenAI API
export async function testOpenAIAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  console.log('=== OPENAI API TEST START ===');
  console.log('API Key configured:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    return {
      service: 'openai',
      success: false,
      error: 'No API key configured (checked AI_INTEGRATIONS_OPENAI_API_KEY and OPENAI_API_KEY)',
      duration: Date.now() - startTime
    };
  }

  try {
    const openai = new OpenAI({ apiKey });
    
    console.log('Calling OpenAI API...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Write a 30-word description of Burj Khalifa in Dubai.' }],
      temperature: 0.7,
      max_tokens: 100,
    });
    
    const text = response.choices[0]?.message?.content || '';
    
    console.log('✅ OPENAI SUCCESS');
    console.log('Response:', text);
    
    return {
      service: 'openai',
      success: true,
      response: text,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    console.log('❌ OPENAI FAILED');
    console.log('Error:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      response: error.response?.data,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    return {
      service: 'openai',
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Test Anthropic API
export async function testAnthropicAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  console.log('=== ANTHROPIC API TEST START ===');
  console.log('API Key configured:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    return {
      service: 'anthropic',
      success: false,
      error: 'No API key configured (checked AI_INTEGRATIONS_ANTHROPIC_API_KEY and ANTHROPIC_API_KEY)',
      duration: Date.now() - startTime
    };
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    
    console.log('Calling Anthropic API...');
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Write a 30-word description of Burj Khalifa in Dubai.' }],
    });
    
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    
    console.log('✅ ANTHROPIC SUCCESS');
    console.log('Response:', text);
    
    return {
      service: 'anthropic',
      success: true,
      response: text,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    console.log('❌ ANTHROPIC FAILED');
    console.log('Error:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      response: error.response?.data,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    return {
      service: 'anthropic',
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Test Freepik API
export async function testFreepikAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  const apiKey = process.env.FREEPIK_API_KEY;
  
  console.log('=== FREEPIK API TEST START ===');
  console.log('API Key configured:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    return {
      service: 'freepik',
      success: false,
      error: 'No API key configured (FREEPIK_API_KEY)',
      duration: Date.now() - startTime
    };
  }

  try {
    const params = new URLSearchParams({
      term: 'Dubai Burj Khalifa',
      page: '1',
      per_page: '5',
    });
    
    console.log('Calling Freepik API...');
    console.log('URL:', `https://api.freepik.com/v1/resources?${params}`);
    
    const response = await fetch(`https://api.freepik.com/v1/resources?${params}`, {
      headers: {
        'Accept': 'application/json',
        'x-freepik-api-key': apiKey,
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.log('Error body:', errorBody);
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    
    const data = await response.json();
    const imageCount = data.data?.length || 0;
    
    console.log('✅ FREEPIK SUCCESS');
    console.log('Images found:', imageCount);
    console.log('First image:', data.data?.[0]?.title || 'N/A');
    
    return {
      service: 'freepik',
      success: true,
      response: `Found ${imageCount} images`,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    console.log('❌ FREEPIK FAILED');
    console.log('Error:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    return {
      service: 'freepik',
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Test Google Places API
export async function testGooglePlacesAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  console.log('=== GOOGLE PLACES API TEST START ===');
  console.log('API Key configured:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    return {
      service: 'google_places',
      success: false,
      error: 'No API key configured (GOOGLE_PLACES_API_KEY)',
      duration: Date.now() - startTime
    };
  }

  try {
    const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
    
    console.log('Calling Google Places API...');
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: 'Burj Khalifa Dubai',
        maxResultCount: 3,
      }),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.log('Error body:', errorBody);
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    
    const data = await response.json();
    const placeCount = data.places?.length || 0;
    
    console.log('✅ GOOGLE PLACES SUCCESS');
    console.log('Places found:', placeCount);
    console.log('First place:', data.places?.[0]?.displayName?.text || 'N/A');
    
    return {
      service: 'google_places',
      success: true,
      response: `Found ${placeCount} places`,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    console.log('❌ GOOGLE PLACES FAILED');
    console.log('Error:', {
      message: error.message,
      status: error.status,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    return {
      service: 'google_places',
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Run all API tests
export async function testAllAPIs(): Promise<{
  results: APITestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}> {
  console.log('\n========================================');
  console.log('TRAVI API TESTS - Running All Tests');
  console.log('========================================\n');
  
  const results: APITestResult[] = [];
  
  // Test each API sequentially to avoid rate limits
  results.push(await testGeminiAPI());
  results.push(await testOpenAIAPI());
  results.push(await testAnthropicAPI());
  results.push(await testFreepikAPI());
  results.push(await testGooglePlacesAPI());
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n========================================');
  console.log('TRAVI API TESTS - Summary');
  console.log('========================================');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.service}: ${r.success ? 'OK' : r.error}`);
  });
  console.log('========================================\n');
  
  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed,
    },
  };
}

/**
 * Test a single API with a specific API key
 * Used by the API keys management page
 */
export async function testSingleAPI(serviceName: string, apiKey: string): Promise<APITestResult> {
  const startTime = Date.now();
  
  console.log(`=== TESTING ${serviceName.toUpperCase()} API ===`);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    return {
      service: serviceName,
      success: false,
      error: 'No API key provided',
      duration: Date.now() - startTime
    };
  }

  try {
    switch (serviceName) {
      case 'gemini': {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Say "API test successful" in 5 words or less.' }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 20 },
        });
        
        const text = result.response.text();
        return { service: serviceName, success: true, response: text, duration: Date.now() - startTime };
      }
      
      case 'openai': {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey });
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say "API test successful" in 5 words or less.' }],
          temperature: 0.1,
          max_tokens: 20,
        });
        
        const text = response.choices[0]?.message?.content || '';
        return { service: serviceName, success: true, response: text, duration: Date.now() - startTime };
      }
      
      case 'anthropic': {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey });
        
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Say "API test successful" in 5 words or less.' }],
        });
        
        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
        return { service: serviceName, success: true, response: text, duration: Date.now() - startTime };
      }
      
      case 'google_places': {
        const params = new URLSearchParams({
          input: 'Burj Khalifa Dubai',
          inputtype: 'textquery',
          fields: 'place_id,name',
          key: apiKey,
        });
        
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`);
        const data = await response.json();
        
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          throw new Error(`API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
        }
        
        return { service: serviceName, success: true, response: `Status: ${data.status}`, duration: Date.now() - startTime };
      }
      
      case 'freepik': {
        const params = new URLSearchParams({ term: 'Dubai', page: '1', per_page: '1' });
        
        const response = await fetch(`https://api.freepik.com/v1/resources?${params}`, {
          headers: {
            'Accept': 'application/json',
            'x-freepik-api-key': apiKey,
          },
        });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
        }
        
        const data = await response.json();
        return { service: serviceName, success: true, response: `Found ${data.meta?.total || 0} results`, duration: Date.now() - startTime };
      }
      
      default:
        return {
          service: serviceName,
          success: false,
          error: `Unknown service: ${serviceName}`,
          duration: Date.now() - startTime
        };
    }
  } catch (error: any) {
    console.log(`❌ ${serviceName.toUpperCase()} FAILED:`, error.message);
    return {
      service: serviceName,
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}
