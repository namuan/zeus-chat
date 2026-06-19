import type { ModelInfo, ProviderConfig } from '@/lib/providers/types';

// ── Provider-specific response shapes ──────────────────────────────────

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: Record<string, string>;
  context_length?: number;
  description?: string;
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

interface RequestyModel {
  id: string;
  object: string;
  input_price: number;
  output_price: number;
  cached_price: number;
  context_window?: number;
  description?: string;
}

interface RequestyResponse {
  object: string;
  data: RequestyModel[];
}

// ── Normalizers ────────────────────────────────────────────────────────

function normalizeOpenRouter(raw: OpenRouterResponse): ModelInfo[] {
  return raw.data.map((m) => {
    const promptPrice = parseFloat(m.pricing?.prompt ?? '0');
    const completionPrice = parseFloat(m.pricing?.completion ?? '0');
    const free = promptPrice === 0 && completionPrice === 0;

    return {
      id: m.id,
      name: m.name || m.id,
      free,
      contextLength: m.context_length ?? undefined,
      description: m.description ?? undefined,
    };
  });
}

function normalizeRequesty(raw: RequestyResponse): ModelInfo[] {
  return raw.data.map((m) => {
    const free =
      m.input_price === 0 &&
      m.output_price === 0 &&
      m.cached_price === 0;

    return {
      id: m.id,
      name: m.id,
      free,
      contextLength: m.context_window ?? undefined,
      description: m.description ?? undefined,
    };
  });
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Fetch all models available from the given provider.
 *
 * Returns a sorted (by id) list of normalised `ModelInfo` objects.
 * Throws on network / parse errors with a human-readable message.
 */
export async function fetchAllModels(
  provider: ProviderConfig,
  apiKey?: string | null,
): Promise<ModelInfo[]> {
  if (!provider.modelsUrl) {
    throw new Error(`${provider.name} does not support listing models.`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach auth if we have a key; the model endpoint may work without it
  // but rate limits are often more generous with a key.
  if (apiKey) {
    Object.assign(headers, provider.buildHeaders(apiKey));
  }

  let response: Response;
  try {
    response = await fetch(provider.modelsUrl, { headers });
  } catch {
    throw new Error(`Network error — could not reach ${provider.name}.`);
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new Error(
        `Authentication failed. Check your ${provider.name} API key.`,
      );
    }
    if (status === 429) {
      throw new Error(
        `Rate limited by ${provider.name}. Please wait a moment and try again.`,
      );
    }
    throw new Error(
      `${provider.name} returned status ${status}.`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Invalid response from ${provider.name}.`);
  }

  const models = normalizeResponse(provider.id, json);
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

/**
 * Convenience: fetch only free models from a provider.
 */
export async function fetchFreeModels(
  provider: ProviderConfig,
  apiKey?: string | null,
): Promise<ModelInfo[]> {
  const all = await fetchAllModels(provider, apiKey);
  return all.filter((m) => m.free);
}

// ── Internal ───────────────────────────────────────────────────────────

function normalizeResponse(providerId: string, json: unknown): ModelInfo[] {
  switch (providerId) {
    case 'openrouter':
      return normalizeOpenRouter(json as OpenRouterResponse);
    case 'requesty':
      return normalizeRequesty(json as RequestyResponse);
    default:
      throw new Error(`Unknown provider "${providerId}" — cannot parse model list.`);
  }
}
