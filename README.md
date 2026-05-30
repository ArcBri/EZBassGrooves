# EZBassGrooves

Mobile-first PWA for jotting down bass grooves and riffs the easy way.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Features

- **Library** — multiple named grooves, rename, duplicate, delete, JSON import/export
- **Main view** — continuous 4-string staff (G, D, A, E top to bottom) like real sheet music; tap a bar to zoom in
- **Bar view** — full tab + rhythm notation; ◀ ▶ to move between bars
- **Edit mode** — tap **Edit**, append rhythm slots (♩ ♪ ♬ rest), tap a string cell to enter fret (0–24 or X), **Save** to commit or **Cancel** to discard
- **Root note** — set per bar in edit mode (top right)

Data is stored in `localStorage` under `ezbassgrooves.v1` (legacy `groovemaker.v1` data is migrated automatically on first load).

## iOS app (Capacitor)

The web app is wrapped as a native iOS shell via [Capacitor](https://capacitorjs.com/).

- **Bundle ID:** `com.arcb.ezbassgrooves`
- **App name:** EZBassGrooves

### Develop on Windows

After changing the React app:

```bash
npm run ios:sync
```

This builds `dist/` and copies it into the Xcode project. Commit and push; GitHub Actions builds an unsigned `.ipa` on every push to `main`.

### Download a build from CI

1. Open the repo on GitHub → **Actions** → **iOS Build (unsigned)**.
2. Open the latest successful run → download **EZBassGrooves-unsigned-ipa**.

Unsigned builds cannot be installed on a physical iPhone. They confirm the pipeline works.

### Install on a real device (TestFlight / App Store)

You need:

1. [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. An App ID matching `com.arcb.ezbassgrooves`.
3. A distribution certificate and provisioning profile.
4. GitHub repository secrets for signing, for example:
   - `APPLE_CERT_P12_BASE64`
   - `APPLE_CERT_PASSWORD`
   - `APPLE_PROVISION_PROFILE_BASE64`
   - App Store Connect API key fields for upload

Then extend the workflow with `apple-actions/import-codesign-certs`, `xcodebuild -exportArchive`, and `apple-actions/upload-testflight-build`.

### Open in Xcode (Mac only)

```bash
npm run ios:open
```

## Android app (Capacitor)

The web app is wrapped as a native Android shell via [Capacitor](https://capacitorjs.com/).

- **Application ID:** `com.arcb.ezbassgrooves`
- **App name:** EZBassGrooves

### Develop on Windows

After changing the React app:

```bash
npm run android:sync
```

This builds `dist/` and copies it into the Android Studio project. Commit and push; GitHub Actions builds a debug `.apk` on every push to `main`.

Open the project in Android Studio:

```bash
npm run android:open
```

### Regenerate launcher icons and splash

Source logo: [`assets/logo.svg`](assets/logo.svg) (copied from [`public/favicon.svg`](public/favicon.svg)).

```bash
npx @capacitor/assets generate --android --iconBackgroundColor '#0f172a' --iconBackgroundColorDark '#0f172a' --splashBackgroundColor '#0f172a' --splashBackgroundColorDark '#0f172a'
```

### Download a build from CI

1. Open the repo on GitHub → **Actions** → **Android Build**.
2. Open the latest successful run → download **EZBassGrooves-debug-apk** (installable on any device with USB debugging enabled).

When signing secrets are configured, the same workflow also produces **EZBassGrooves-release-aab** for Google Play upload.

### Publish to Google Play

You need:

1. [Google Play Developer account](https://play.google.com/console/signup) ($25 one-time).
2. An app in Play Console with package name `com.arcb.ezbassgrooves`.
3. A release keystore (keep the `.jks` out of git):

   ```bash
   keytool -genkey -v -keystore ezbassgrooves-release.jks -alias ezbassgrooves -keyalg RSA -keysize 2048 -validity 10000
   ```

4. GitHub repository secrets for signing:

   - `ANDROID_KEYSTORE_BASE64` — base64-encoded keystore file
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` — e.g. `ezbassgrooves`
   - `ANDROID_KEY_PASSWORD`

   Encode the keystore for the secret:

   ```bash
   # Linux / macOS / Git Bash
   base64 -w 0 ezbassgrooves-release.jks

   # PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("ezbassgrooves-release.jks"))
   ```

5. Push to `main` → download **EZBassGrooves-release-aab** from Actions → upload to Play Console (Internal testing → Closed → Production).

Play Store listing assets (screenshots, feature graphic, descriptions) are uploaded directly in the Play Console.
