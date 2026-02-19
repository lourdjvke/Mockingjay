/**
 * Sanitizes AI response text to extract valid JSON.
 * Strips markdown code fences, leading/trailing text, and other non-JSON content.
 */
export const sanitizeAiJson = (raw) => {
  let cleaned = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Find the first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    // No valid JSON object found, return original for error handling downstream
    return cleaned;
  }

  return cleaned.substring(firstBrace, lastBrace + 1);
};
