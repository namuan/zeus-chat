# Context Size Pie Chart

Display the model's context window and current token usage as a pie chart in the chat UI.

## The Two Numbers

- **Total context window** — the maximum number of tokens the model supports (e.g. 128K)
- **Currently used context** — how many tokens the current conversation consumes

---

## Current State of the Codebase

### What Already Exists ✅

| Piece | Where | Status |
|---|---|---|
| **Model context length** | `ModelInfo.contextLength` — fetched from OpenRouter/Requesty model list APIs | Populated but **never displayed** |
| **Provider configs** | `lib/providers/configs/openrouter.ts`, `requesty.ts` | Works |
| **Model list fetching** | `lib/providers/models.ts` — normalizes provider responses into `ModelInfo[]` | Works |
| **Settings store** | `settings.store.ts` — holds `availableModels[]` in Zustand, persisted to AsyncStorage | Works |

### What's Missing ❌

| Piece | Why |
|---|---|
| **Token usage capture** | `extractDelta()` only parses `choices[0].delta.content` — the `usage` field that providers send in the final SSE chunk is silently discarded |
| **Token counting** | No client-side tokenizer exists (no `tiktoken`, no `gpt-tokenizer`, nothing) |
| **DB columns** | The `messages` table has no `prompt_tokens` / `completion_tokens` / `total_tokens` columns |
| **Message type** | `Message` in `chat.types.ts` has no token usage fields |
| **SVG / chart library** | No `react-native-svg`, no charting library at all |
| **Pie chart component** | Doesn't exist yet |
| **UI placement** | No slot for context info in the chat screen |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Provider API                          │
│                                                         │
│  GET /v1/models          POST /v1/chat/completions      │
│       │                           │                     │
│       ▼                           ▼                     │
│  context_length            { delta, usage }             │
│       │                           │                     │
│       ▼                           ▼                     │
│  ┌─────────────────────────────────────┐                │
│  │       Chat Service & Store          │                │
│  │  → lookup contextLength             │                │
│  │  → capture usage from response      │                │
│  │  → persist tokens with message      │                │
│  │  → compute running totals           │                │
│  └──────────────┬──────────────────────┘                │
│                 │                                       │
│                 ▼                                       │
│  ┌─────────────────────────────────────┐                │
│  │       ContextPieChart               │                │
│  │  (react-native-svg donut chart)     │                │
│  │  used={totalTokens}                 │                │
│  │  total={contextLength}              │                │
│  └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

---

## Stage 1: Capture Token Usage from API Responses

Currently `extractDelta()` in `lib/streaming.ts` only parses content deltas:

```typescript
// CURRENT — only returns token string
export function extractDelta(data: string): string | null {
  const json = JSON.parse(data);
  const delta = json?.choices?.[0]?.delta?.content;
  return typeof delta === 'string' ? delta : null;
}
```

OpenRouter and Requesty send `usage` in the final SSE chunk:

```json
{"choices":[{"delta":{"content":""}}],"usage":{"prompt_tokens":100,"completion_tokens":50,"total_tokens":150}}
```

**Change:** Return both token and usage:

```typescript
// NEW — returns { token, usage? }
export interface DeltaResult {
  token: string | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function extractDelta(data: string): DeltaResult | null {
  if (!data || data === '[DONE]') return null;
  try {
    const json = JSON.parse(data);
    const delta = json?.choices?.[0]?.delta?.content;
    const usage = json?.usage;
    return {
      token: typeof delta === 'string' ? delta : null,
      usage: usage
        ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}
```

This bubbles up through:
- `streamChat()` in `lib/providers/client.ts` → accumulates usage from final chunk
- `runCompletion()` in `chat.service.ts` → receives usage alongside full text
- `insertMessage()` → persists token counts with the assistant message

---

## Stage 2: Client-Side Token Estimation (Fallback)

Not all providers/models return `usage`. Add a simple estimator for those cases:

```typescript
// lib/tokenizer.ts (NEW FILE)

/** Rough token estimate: ~3.5 chars per token for mixed text */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
}

/** Estimate tokens for an array of API-formatted messages */
export function estimateMessagesTokens(
  messages: { role: string; content: string }[],
): number {
  // Each message has ~4 tokens of structural overhead (role tags, formatting)
  return messages.reduce((sum, m) => sum + 4 + estimateTokens(m.content), 0);
}
```

---

## Stage 3: Persist Token Data

### 3a. Database Migration (v5)

```typescript
// db/schema.ts — NEW migration
// v5: add token usage columns to messages
try {
  await db.execAsync(
    `ALTER TABLE messages ADD COLUMN prompt_tokens INTEGER`,
  );
  await db.execAsync(
    `ALTER TABLE messages ADD COLUMN completion_tokens INTEGER`,
  );
  await db.execAsync(
    `ALTER TABLE messages ADD COLUMN total_tokens INTEGER`,
  );
} catch {
  /* already exists */
}
```

### 3b. Update Message Type

```typescript
// features/chat/chat.types.ts — NEW fields on Message
export interface Message {
  id: string;
  chat_id: string;
  role: Role;
  content: string;
  created_at: number;
  queued?: boolean;
  model?: string;
  // NEW:
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}
```

### 3c. Update Message Repo

Update `insertMessage()` to write token columns and `listMessages()` (and all other SELECT queries) to read them.

### 3d. Update Store with Running Totals

```typescript
// features/chat/chat.store.ts — NEW state fields
interface ChatState {
  // ...existing...
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
}
```

- **On `loadActive`**: sum `total_tokens` from all loaded messages
- **On `addMessage`**: if the message has `total_tokens`, add to running total
- Select these fields in the chat screen to feed into the pie chart

---

## Stage 4: Pie Chart UI

### 4a. Install Dependency

```
npx expo install react-native-svg
```

No charting library needed — a donut chart is ~40 lines of SVG primitives.

### 4b. Pie Chart Component

```typescript
// components/ui/ContextPieChart.tsx (NEW)

interface ContextPieChartProps {
  used: number;       // tokens consumed
  total: number;      // model's max context window
  size?: number;      // diameter (default 28 for header)
  onPress?: () => void;
}
```

Built with two overlapping SVG `<Circle>` elements:

- **Background arc**: full circle in `colors.border`
- **Foreground arc**: partial circle via `strokeDasharray` + `strokeDashoffset`

**Color coding by usage:**

| Usage | Color |
|---|---|
| 0–50% | `colors.success` (green) |
| 51–80% | `colors.warning` (amber) |
| 81–100% | `colors.danger` (red) |

A tiny percentage label sits in the center of the donut.

### 4c. Expanded Info Panel

```typescript
// components/ui/ContextInfoPanel.tsx (NEW)
```

A modal/overlay shown when the user taps the pie chart:

```
┌─────────────────────────────────────┐
│  Context Usage                  ✕  │
│                                     │
│         ┌─────────────┐             │
│         │    ╭───╮    │             │
│         │    │ 9%│    │             │
│         │    ╰───╯    │             │
│         │             │             │
│         │  Used:  12,428 tokens    │
│         │  Total: 128,000 tokens   │
│         │  Model: openai/gpt-4o    │
│         └─────────────┘             │
└─────────────────────────────────────┘
```

---

## Stage 5: Placement in Chat Screen

### Option A: Navigation Header (Recommended)

Add the pie chart as a small element in the header's `headerRight`, alongside the existing icon buttons:

```tsx
// app/chat/[id].tsx — headerRight
<View style={styles.headerActions}>
  <ContextPieChart
    used={totalTokens}
    total={contextLength}
    onPress={() => setContextPanelVisible(true)}
  />
  <IconButton name="create-outline" ... />   {/* rename */}
  <IconButton name="ellipsis-vertical" ... /> {/* menu */}
</View>
```

Renders as a 28px donut in the top-right corner — minimal visual weight, always accessible.

### Option B: Status Bar Above Messages (Alternative)

A thin bar between the header and the message list that becomes visible when usage exceeds a threshold:

```
┌─────────────────────────────────────┐
│  Context: ████████░░░░ 12.4K/128K  │ ← info bar
├─────────────────────────────────────┤
│  [messages...]                      │
```

---

## Implementation Order

| # | Files | What |
|---|---|---|
| **1** | `lib/streaming.ts` | Modify `extractDelta` to return `DeltaResult` with optional `usage` |
| **2** | `lib/providers/client.ts` | Thread usage data through `streamChat` return value |
| **3** | `features/chat/chat.types.ts` | Add `prompt_tokens`, `completion_tokens`, `total_tokens` to `Message` |
| **4** | `db/schema.ts` | Add v5 migration: token columns on `messages` |
| **5** | `db/message.repo.ts` | Read/write token columns in all queries |
| **6** | `features/chat/chat.service.ts` | Capture usage in `runCompletion`, pass to `insertMessage` |
| **7** | `features/chat/chat.store.ts` | Add `totalTokens` state, compute on `loadActive` / `addMessage` |
| **8** | `lib/tokenizer.ts` (new) | Add `estimateTokens()` and `estimateMessagesTokens()` |
| **9** | — | `npx expo install react-native-svg` |
| **10** | `components/ui/ContextPieChart.tsx` (new) | SVG donut chart component |
| **11** | `components/ui/ContextInfoPanel.tsx` (new) | Expanded detail panel (modal) |
| **12** | `app/chat/[id].tsx` | Wire pie chart into `headerRight`, connect store selectors |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| `contextLength` is `undefined` | Hide the pie chart entirely (return `null`) |
| API doesn't return `usage` | Fall back to `estimateMessagesTokens()` |
| Provider/model changes mid-chat | Re-lookup `contextLength` from `availableModels` |
| Usage > 80% | Turn pie chart amber |
| Usage > 90% | Turn pie chart red + show a subtle warning text |
| No messages yet | Show 0 / total (empty donut) |
| Streaming in progress | Update `used` count in real-time as new tokens arrive |
| Existing messages (no token data) | Estimate tokens on load; backfill when API returns usage on next send |
