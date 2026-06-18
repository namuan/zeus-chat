# Sideloading Zeus Chat onto your iPhone (command line only)

No Xcode GUI, no App Store. Two routes from the terminal:

| Route | What you get | Needs Xcode? | Needs Apple ID? | Best for |
| --- | --- | --- | --- | --- |
| **A. Local dev build** (`expo run:ios --device`) | The real app installed on your phone | Yes | Free Apple ID | Daily use / testing the actual app |
| **B. Expo Go** (`expo start`) | The app running inside Expo Go | No | No | 30-second preview |

> This app uses only SDK modules (`expo-sqlite`, `expo-secure-store`, `expo-clipboard`, `expo-haptics`, `expo-file-system`, `expo-sharing`) plus pure-JS deps (`react-native-sse`, `zustand`). **Both routes work fully**, including streaming.

---

## Prerequisites (one-time)

**1. Mac with Xcode + Command Line Tools** (required only for Route A)

```bash
xcode-select --install            # install Command Line Tools
sudo xcodebuild -license accept   # accept the license
```

**2. CocoaPods** (required only for Route A) — already installed if `pod --version` prints a version.

```bash
brew install cocoapods            # or: sudo gem install cocoapods
```

**3. Apple ID** (free is fine — no paid $99 program needed for Route A). You'll sign in once when Expo asks.

**4. iPhone prep**

- Plug the iPhone into your Mac via USB (first time only — Wi-Fi debugging can be enabled later).
- Unlock the phone and tap **Trust This Computer** when prompted.
- Make sure the phone and Mac are on the **same Wi-Fi** (needed for Metro to push JS to the device).

---

## Route A — Standalone sideload (recommended)

This compiles the native app, signs it with your free Apple ID, installs it on the phone, and launches it.

```bash
# from the project root
npx expo run:ios --device
```

What happens automatically, in order:

1. `expo prebuild -p ios` → generates the native `ios/` folder (first run only; cached after).
2. `pod install` → installs CocoaPods dependencies.
3. Prompts for your **Apple ID** → logs in, creates a free Personal Team development certificate + provisioning profile.
4. `xcodebuild` → builds the app for your connected device.
5. Installs the `.app` onto the iPhone and launches it.

If more than one device is connected, Expo shows a picker. To target a specific one:

```bash
# list connected devices
xcrun devicectl list devices          # Xcode 15+
# or
xcrun xctrace list devices

# build for a named device
npx expo run:ios --device "Your iPhone Name"
```

### ⚠️ Trust the developer profile (one-time, on the phone)

The first launch will show **"Untrusted Developer"** until you trust your own signing certificate:

1. On the iPhone: **Settings → General → VPN & Device Management**
   *(on older iOS: Settings → General → Profiles & Device Management)*
2. Tap your Apple ID under **Developer App**.
3. Tap **Trust &nbsp;"&lt;your Apple ID&gt;"** → **Trust**.
4. Launch Zeus Chat from the home screen.

### Iterating after the first build

Once `ios/` exists, you don't rebuild native code for every change — only JS changes reload over Metro:

```bash
npx expo start --dev-client      # starts Metro; app on phone auto-reloads on save
```

Rebuild native (after adding a native module or changing `app.json` plugins):

```bash
npx expo run:ios --device
```

### Optional: self-contained build (no Metro needed)

A debug build loads JS from Metro over Wi-Fi. For an app that runs fully offline/standalone, bundle the JS into the binary:

```bash
npx expo run:ios --device --variant release
```

This still uses your free dev cert (same 7-day limit) but the app launches without needing Metro running.

---

## Route B — Expo Go (fastest, no build)

Use this if you just want to see it run in 30 seconds and don't want to compile anything.

1. Install **Expo Go** from the App Store on your iPhone.
2. Start the dev server:
   ```bash
   npm start
   ```
3. With Expo Go open on your phone, scan the QR code shown in the terminal
   (or open the Camera app and scan it — it deep-links into Expo Go).

That's it. Edits hot-reload instantly. No Xcode, no Apple ID, no signing.

> Limitation: you're running *inside* Expo Go, not the standalone app, so the home-screen icon and bundle id are Expo Go's. Use Route A for the real app experience.

---

## Limitations of a free Apple ID (Route A)

- The development certificate expires after **7 days**. After that the app won't launch — just re-run `npx expo run:ios --device` to rebuild (fast, since `ios/` is cached).
- A free Apple ID can have at most **3 sideloaded apps** installed at once.
- You can only install onto **your own devices** registered to your Apple ID.
- For a build that lasts a full year and can be shared, you need a paid Apple Developer Program ($99/yr) + EAS Build (see below).

---

## Optional: longer-lived installable build (paid Apple Developer account)

If you have a paid Apple Developer Program membership, you can produce an installable `.ipa` from the command line and install it without a 7-day expiry:

```bash
npm i -g eas-cli
eas login                              # your Apple ID
eas build:configure                    # creates eas.json (first time)
npx eas build --platform ios --profile preview --local
```

Then install the produced `.ipa`:

```bash
# if ios-deploy is installed (brew install ios-deploy)
ios-deploy --bundle "path/to/zeus-chat.ipa"
```

A `preview` profile uses ad-hoc distribution (lasts up to a year) and requires the device's UDID to be registered with your developer account. This is **not** needed for the free Route A above.

---

## Troubleshooting

**`Unable to locate a development device` / no device in the picker**
- Unlock the phone, keep it plugged in, and re-run. Verify with `xcrun devicectl list devices`.
- If the device shows but won't connect: open **Window → Devices and Simulators** in Xcode once to pair it, then retry the command.

**Signing errors / "No profiles for … were found"**
- Expo's automatic signing can occasionally fail for a free team. Fallback:
  1. `npx expo prebuild -p ios` (generate the native project if missing).
  2. `open ios/zeuschat.xcworkspace` in Xcode.
  3. Select the **zeus-chat** target → **Signing & Capabilities** → choose your Personal Team → check "Automatically manage signing".
  4. Close Xcode and re-run `npx expo run:ios --device`.
- If you hit "You have reached the maximum number of registered devices," remove an old device in the Apple Developer portal (paid accounts) or wait (free accounts auto-rotate).

**`pod install` fails / Ruby errors**
- `sudo xcodebuild -license accept` then `pod repo update`, then retry.
- Or reset pods: `cd ios && pod deintegrate && pod install` (from project root after prebuild).

**App builds and installs but won't launch ("Untrusted Developer")**
- You skipped the trust step — see **Trust the developer profile** above.

**App launches but shows a red/white screen ("No bundle URL present")**
- Debug build can't reach Metro. Ensure Mac and iPhone are on the same Wi-Fi, no VPN blocking local traffic, and Metro is running (`npx expo start --dev-client`).
- Or build the self-contained variant: `npx expo run:ios --device --variant release`.

**App builds but immediately crashes**
- A native module changed since the last build. Rebuild native: `npx expo run:ios --device`. If still failing, reset the native project: `rm -rf ios && npx expo run:ios --device` (re-runs prebuild).

**"Maximum number of apps reached" (free Apple ID)**
- You have 3 sideloaded apps. Delete one from the phone, or sign in with a different free Apple ID.

**Want a clean rebuild from scratch**
```bash
rm -rf ios android node_modules .expo
npm install
npx expo run:ios --device
```

---

## Quick reference

```bash
# Route A — real sideload (first time + after native changes)
npx expo run:ios --device

# Route A — fast JS iteration (after the first native build)
npx expo start --dev-client

# Route B — no build, run inside Expo Go
npm start            # then scan the QR with Expo Go on your iPhone
```
