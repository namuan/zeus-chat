# Zeus Chat

**Local‑first AI chat app** for iOS (simulator or side‑loaded). Built with Expo / React Native — no backend, no accounts, no cloud sync. Your API key stays in the device Keychain; conversations live in a local SQLite database.

Powered by the [OpenRouter free model](https://openrouter.ai/models?order=pricing) (`openrouter/free`) — a BYO‑key single‑model chat experience.

---

## Quick start

```bash
npm install
npx expo start
```

Press **`i`** to open the iOS simulator, or scan the QR with **Expo Go** on your phone.

### On first launch

1. Paste an [OpenRouter API key](https://openrouter.ai/keys) — it's stored in the device SecureStore.
2. Start chatting. Every response streams in token‑by‑token (markdown rendered live).

---

## Run on a physical iPhone

See [`SIDELOAD.md`](./SIDELOAD.md) for two command‑line options:

| Method | Command | Needs Xcode? | Best for |
|---|---|---|---|
| Expo Go | `npm start` → scan QR | No | 30‑second preview |
| Real app (`expo run:ios`) | `npx expo run:ios --device` | Yes | Full app with home‑screen icon |

A free Apple ID is sufficient — no paid Developer Program needed. The app will be valid for 7 days and can be re‑built with the same command.

---

## Features

- **Streaming** — responses appear token‑by‑token as the model generates them.
- **Markdown rendering** — bold, italic, code blocks (with copy), headings, lists, blockquotes, **tables** (horizontally scrollable), and links.
- **Local storage** — everything persists in SQLite. API key in SecureStore.
- **Full offline history** — past conversations are available even without a network connection (only the AI request itself needs a network).
- **Dark / light / system theme** — toggle in Settings.
- **Prompt starters** — built‑in templates in the Prompts tab.
- **Export** — single chat as Markdown or JSON; export all as JSON via the Share sheet.
- **Regenerate / edit & resend** — long‑press any message for options.
- **Swipe to delete** a chat from the list.
- **No accounts, no sync, no backend.**

---

## Settings

| Setting | Default | Note |
|---|---|---|
| API key | — | Required. Get one at [openrouter.ai/keys](https://openrouter.ai/keys). |
| Model | `openrouter/free` | Any OpenRouter model id can be used (e.g. `anthropic/claude-3.5-sonnet`, any `:free` model). |
| Theme | System | Switch to Light or Dark independently of the OS setting. |

---

## Building

```bash
# TypeScript
npx tsc --noEmit

# Bundle check (iOS)
npx expo export --platform ios

# Full native build + simulator
npx expo run:ios

# Full native build + physical device (debug — loads JS from Metro)
npx expo run:ios --device
```

### Release bundle — sideload a self‑contained app

A debug build loads JS over Wi‑Fi from Metro, which means the phone needs `npx expo start` running on your Mac. A **Release** build bundles the JS directly into the binary — the app launches standalone with no Metro dependency:

```bash
# One‑shot: clean native project, then build & install in Release
rm -rf ios && npx expo run:ios --device --configuration Release
```

After the first Release build, subsequent iterations (native‑only changes):

```bash
# Incremental release rebuild (no prebuild)
npx expo run:ios --device --configuration Release
```

The full step‑by‑step walkthrough (pre‑requisites, free Apple ID, 7‑day cert limitations, trust the developer profile on the phone, troubleshooting) is in [`SIDELOAD.md`](./SIDELOAD.md).

---

## License

[MIT](./LICENSE)
