/**
 * lib/groq.ts — the ONLY Groq access point. One-shot JSON calls, no tool use.
 * Throws `GROQ_KEY_MISSING` when GROQ_API_KEY is unset (callers degrade).
 */
interface GroqMessage {
  content: string | null | undefined;
}
interface GroqChoice {
  message?: GroqMessage;
}
interface GroqCompletion {
  choices: GroqChoice[];
}
interface GroqCreateArgs {
  model: string;
  temperature: number;
  max_tokens: number;
  response_format: { type: 'json_object' };
  messages: { role: 'system' | 'user'; content: string }[];
}
interface GroqClient {
  chat: { completions: { create(args: GroqCreateArgs): Promise<GroqCompletion> } };
}
type GroqCtor = new (opts: { apiKey: string }) => GroqClient;

export interface GroqJsonOpts {
  temperature?: number;
  maxTokens?: number;
}

export async function groqJson(system: string, user: string, opts?: GroqJsonOpts): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_KEY_MISSING');
  }
  const mod = (await import('groq-sdk')) as unknown as { default: GroqCtor };
  const client = new mod.default({ apiKey });
  const completion = await client.chat.completions.create({
    // llama-3.3-70b-versatile was decommissioned by Groq on 2026-08-16;
    // openai/gpt-oss-120b is Groq's recommended replacement.
    model: 'openai/gpt-oss-120b',
    temperature: opts?.temperature ?? 0.2,
    max_tokens: opts?.maxTokens ?? 1200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user.slice(0, 6000) },
    ],
  });
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('GROQ_EMPTY_RESPONSE');
  }
  return JSON.parse(content) as unknown;
}
