/**
 * Fallback context window sizes for well-known models.
 * Used when the provider's models endpoint hasn't been fetched yet,
 * or the current model isn't in the fetched list.
 *
 * Values are in tokens (approximate). Sources: provider documentation.
 */
const KNOWN_CONTEXTS: Record<string, number> = {
  // OpenAI
  'openai/gpt-4o': 128_000,
  'openai/gpt-4o-mini': 128_000,
  'openai/gpt-4-turbo': 128_000,
  'openai/gpt-4': 8_192,
  'openai/gpt-3.5-turbo': 16_385,

  // Anthropic
  'anthropic/claude-3.5-sonnet': 200_000,
  'anthropic/claude-3.5-haiku': 200_000,
  'anthropic/claude-3-opus': 200_000,
  'anthropic/claude-3-sonnet': 200_000,
  'anthropic/claude-3-haiku': 200_000,
  'anthropic/claude-2': 100_000,

  // Google
  'google/gemini-pro': 32_768,
  'google/gemini-pro-vision': 16_384,
  'google/gemini-1.5-pro': 1_048_576,
  'google/gemini-1.5-flash': 1_048_576,
  'google/gemini-2.0-flash': 1_048_576,

  // Meta / Llama
  'meta-llama/llama-3.1-405b': 128_000,
  'meta-llama/llama-3.1-70b': 128_000,
  'meta-llama/llama-3.1-8b': 128_000,
  'meta-llama/llama-3-70b': 8_192,
  'meta-llama/llama-3-8b': 8_192,
  'meta-llama/llama-2-70b': 4_096,

  // Mistral
  'mistralai/mistral-large': 128_000,
  'mistralai/mistral-medium': 32_000,
  'mistralai/mistral-small': 32_000,
  'mistralai/mixtral-8x22b': 65_536,
  'mistralai/mixtral-8x7b': 32_768,

  // DeepSeek
  'deepseek/deepseek-chat': 64_000,
  'deepseek/deepseek-coder': 128_000,

  // Cohere
  'cohere/command-r-plus': 128_000,
  'cohere/command-r': 128_000,

  // Miscellaneous / proxied
  'openrouter/free': 128_000,
  'openrouter/auto': 128_000,
};

/**
 * Look up the context window for a model ID.
 * Checks the known map first, then tries prefix matching for fallback.
 */
export function getModelContextLength(modelId: string): number | undefined {
  // Exact match first.
  if (KNOWN_CONTEXTS[modelId]) return KNOWN_CONTEXTS[modelId];

  // Try prefix matching — e.g. "openai/gpt-4o-2024-08-06" matches "openai/gpt-4o".
  const parts = modelId.split('/');
  if (parts.length >= 2) {
    const family = `${parts[0]}/${parts[1]}`;
    if (KNOWN_CONTEXTS[family]) return KNOWN_CONTEXTS[family];
  }

  return undefined;
}
