/**
 * Client-side token estimator for when the provider does not return
 * usage data in the API response.
 *
 * These are rough approximations. Real token counts depend on the
 * model's tokenizer (cl100k_base, p50k_base, etc.), but this gives
 * a reasonable ballpark for the pie-chart display.
 */

/** Rough token estimate for a single text string. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // ~4 chars per token for English, ~1.5 for CJK; 3.5 is a reasonable
  // mixed-language heuristic.
  return Math.ceil(text.length / 3.5);
}

/** Estimate total tokens for an array of API-formatted messages. */
export function estimateMessagesTokens(
  messages: { role: string; content: string }[],
): number {
  // Each message has structural overhead: role tags, formatting newlines.
  // OpenAI's tokenizer uses ~4 tokens per message in addition to content.
  const PER_MESSAGE_OVERHEAD = 4;
  return messages.reduce(
    (sum, m) => sum + PER_MESSAGE_OVERHEAD + estimateTokens(m.content),
    0,
  );
}
