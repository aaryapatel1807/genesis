# LLM.md — Genesis Language Model Choice

## v1: Groq free tier
| Use | Model | Why |
|---|---|---|
| Entity/relation extraction | `llama-3.3-70b-versatile` | Best structured-output reliability on Groq free tier |
| Simulator | `llama-3.3-70b-versatile` | Same call pattern, different prompt |
| Fallback | `llama-3.1-8b-instant` | If 70b rate-limits mid-build |

## Why Groq (₹0)
- Free tier with generous rate limits; OpenAI-compatible SDK.
- Fast inference — extraction over 10 search results returns in ~2-3s.
- No card required.

## Constraints honored
- **No autonomous loops.** The LLM never calls tools, never chains itself, never runs
  unprompted. Every call is one-shot: evidence in → JSON out (see Agents.md).
- **No user-facing chat.** Genesis has no chatbot; the LLM is a pipeline component,
  invisible behind the universe.
- **Temperature 0** for extraction (deterministic-ish); 0.7 for the simulator
  (scenarios benefit from variation — still labeled fiction).

## If Groq is down (build-time)
Build script retries with the 8b fallback, then fails loudly — a partial world with
silent gaps is worse than no world. Runtime expansion failures degrade to cache
(see UIUX.md states).
