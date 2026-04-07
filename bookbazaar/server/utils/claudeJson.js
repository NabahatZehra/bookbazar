export function extractTextFromClaudeResponse(response) {
  const content = response?.content;
  if (!content) return '';

  // `content` is typically an array of blocks like: { type: 'text', text: '...' }
  if (Array.isArray(content)) {
    return content
      .map((block) => (block && block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
  }

  // Fallback if SDK changes shape.
  if (typeof content === 'string') return content.trim();
  return '';
}

export function extractJsonCandidate(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Expected a string response for JSON extraction');
  }

  // Prefer fenced code blocks.
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) return fencedMatch[1].trim();

  // Otherwise, grab from first opening bracket to last closing bracket.
  const firstCurly = text.indexOf('{');
  const firstSquare = text.indexOf('[');

  // If no brackets exist, just fail.
  if (firstCurly === -1 && firstSquare === -1) {
    throw new Error('No JSON object/array found in Claude response');
  }

  // Decide whether we expect array or object by the earliest bracket.
  if (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
    const lastSquare = text.lastIndexOf(']');
    if (lastSquare === -1) throw new Error('JSON array is missing closing bracket');
    return text.slice(firstSquare, lastSquare + 1).trim();
  }

  const lastCurly = text.lastIndexOf('}');
  if (lastCurly === -1) throw new Error('JSON object is missing closing brace');
  return text.slice(firstCurly, lastCurly + 1).trim();
}

export function parseJsonFromClaude(text) {
  const candidate = extractJsonCandidate(text);
  try {
    return JSON.parse(candidate);
  } catch (err) {
    const preview = candidate.length > 300 ? `${candidate.slice(0, 300)}...` : candidate;
    throw new Error(`Failed to parse JSON from Claude response. Preview: ${preview}`);
  }
}

export function escapeRegExp(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

