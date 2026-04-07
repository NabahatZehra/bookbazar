import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

function getClient() {
  if (!apiKey || !String(apiKey).trim() || String(apiKey).includes('sk-ant-xxxx')) {
    // Throwing here makes the route catch blocks handle failures consistently.
    throw new Error('ANTHROPIC_API_KEY is missing or not configured');
  }

  return new Anthropic({ apiKey: String(apiKey) });
}

export function getAnthropicClient() {
  return getClient();
}

