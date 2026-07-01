/**
 * llm-provider.service.ts
 *
 * LLM Provider Abstraction Layer
 *
 * Konfiguration über Environment Variables:
 *   LLM_PROVIDER=openai          (Standard)
 *   OPENAI_API_KEY=sk-...        (Pflicht wenn LLM_PROVIDER=openai)
 *   OPENAI_MODEL=gpt-4o-mini     (Optional, Standard: gpt-4o-mini)
 *   FACTORY_LLM_ENABLED=true     (Optional, Standard: true wenn API Key gesetzt)
 *
 * Kein Placeholder-Key wird als gültig akzeptiert.
 * Wenn kein gültiger Key gesetzt ist: Factory gibt klare Fehlermeldung,
 * restliches System läuft weiter.
 *
 * Dieses System hat KEINE Abhängigkeit von Manus oder anderen externen
 * Plattformen — es läuft vollständig eigenständig über Railway.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProviderConfig {
  provider: string;
  model: string;
  enabled: boolean;
  reason?: string;
}

// ─── Validate API Key ─────────────────────────────────────────────────────────
function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false;
  if (key.startsWith("REPLACE_")) return false;
  if (key === "your-api-key-here") return false;
  if (key === "sk-placeholder") return false;
  if (key.length < 20) return false;
  return true;
}

// ─── Get Provider Config ──────────────────────────────────────────────────────
export function getLLMProviderConfig(): LLMProviderConfig {
  const provider = process.env.LLM_PROVIDER ?? "openai";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const factoryEnabled = process.env.FACTORY_LLM_ENABLED;

  if (factoryEnabled === "false") {
    return { provider, model, enabled: false, reason: "FACTORY_LLM_ENABLED=false" };
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!isValidApiKey(apiKey)) {
      return {
        provider,
        model,
        enabled: false,
        reason: "OPENAI_API_KEY fehlt oder ist ein Platzhalter. Bitte in Railway unter Variables setzen.",
      };
    }
    return { provider, model, enabled: true };
  }

  return {
    provider,
    model,
    enabled: false,
    reason: `Unbekannter LLM_PROVIDER: ${provider}. Unterstützt: openai`,
  };
}

// ─── Invoke LLM ───────────────────────────────────────────────────────────────
export async function invokeLLM(
  messages: LLMMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json";
  }
): Promise<LLMResponse> {
  const config = getLLMProviderConfig();

  if (!config.enabled) {
    throw new Error(
      `LLM nicht verfügbar: ${config.reason ?? "Kein API Key konfiguriert"}. ` +
      `Bitte OPENAI_API_KEY in Railway Environment Variables setzen.`
    );
  }

  if (config.provider === "openai") {
    return invokeOpenAI(messages, config.model, options);
  }

  throw new Error(`Unbekannter Provider: ${config.provider}`);
}

// ─── OpenAI Provider ──────────────────────────────────────────────────────────
async function invokeOpenAI(
  messages: LLMMessage[],
  model: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json";
  }
): Promise<LLMResponse> {
  // Dynamic import to avoid hard dependency when not configured
  const { default: OpenAI } = await import("openai");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const requestParams: any = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4000,
  };

  if (options?.responseFormat === "json") {
    requestParams.response_format = { type: "json_object" };
  }

  const response = await client.chat.completions.create(requestParams);

  const content = response.choices[0]?.message?.content ?? "";

  return {
    content,
    model: response.model,
    provider: "openai",
    usage: response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
  };
}
