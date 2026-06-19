import type { ProviderConfig } from '@/lib/providers/types';

export const OPENROUTER_PROVIDER: ProviderConfig = {
  id: 'openrouter',
  name: 'OpenRouter',
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  keysUrl: 'https://openrouter.ai/keys',
  defaultModel: 'openrouter/free',
  apiKeyPlaceholder: 'sk-or-v1-…',
  modelPlaceholder: 'openrouter/free',
  modelHint:
    'Any OpenRouter model, e.g. "openrouter/auto" or a ":free" model.',
  buildHeaders: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/zeus-chat',
    'X-Title': 'Zeus Chat',
  }),
};
