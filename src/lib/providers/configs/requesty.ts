import type { ProviderConfig } from '@/lib/providers/types';

export const REQUESTY_PROVIDER: ProviderConfig = {
  id: 'requesty',
  name: 'Requesty',
  apiUrl: 'https://router.requesty.ai/v1/chat/completions',
  modelsUrl: 'https://router.requesty.ai/v1/models',
  keysUrl: 'https://app.requesty.ai/sign-up',
  defaultModel: 'google/gemma-4-31b-it',
  apiKeyPlaceholder: 'ry-…',
  modelPlaceholder: 'google/gemma-4-31b-it',
  modelHint:
    'Any model available through Requesty, e.g. "gpt-4o" or "claude-sonnet-4-20250514".',
  buildHeaders: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }),
};
