# Hayat Mobile

Expo (React Native) + TypeScript app for the Hayat healthcare platform. Arabic-first, RTL-forced, with English fallback.

## Prerequisites

- Node.js 20+
- Expo CLI via `npx` (no global install needed)
- **iOS simulator:** Xcode 15+ with Command Line Tools
- **Android emulator:** Android Studio with an AVD running API 34+
- **Physical device:** [Expo Go](https://expo.dev/client) (iOS / Android)
- Backend running locally on `http://localhost:4000` (see [`backend/README.md`](../backend/README.md))

## First-time setup

```bash
cd mobile
cp .env.example .env
npm install
```

### Point the app at your backend

`.env` defaults to `http://localhost:4000/api/v1`, which only works on the iOS simulator and web.

| Target                  | `EXPO_PUBLIC_API_BASE_URL`                           |
| ----------------------- | ---------------------------------------------------- |
| iOS simulator / web     | `http://localhost:4000/api/v1`                       |
| Android emulator        | `http://10.0.2.2:4000/api/v1`                        |
| Physical device (LAN)   | `http://<your-mac-lan-ip>:4000/api/v1`               |

Find your LAN IP on macOS: `ipconfig getifaddr en0`. The phone and Mac must be on the same Wi-Fi.

> The backend binds to `0.0.0.0` in dev, so LAN access works without extra config. If your firewall blocks port 4000, allow inbound on it or run Expo tunnel (`npm run start -- --tunnel`).

## Run

```bash
npm run start          # Metro bundler with QR code
npm run ios            # open in iOS simulator
npm run android        # open in Android emulator
npm run web            # open in browser (limited: no Location / Haptics)
```

Press `i` / `a` / `w` in the Metro terminal to launch a target after `npm run start`.

## End-to-end test flow

1. Start backend (`npm run start:dev` in `../backend`) and confirm it logs `Nest application successfully started`.
2. Start the app (`npm run ios`).
3. On the **Login** screen, enter a Jordanian phone number (e.g. `0791234567`).
4. The backend console (SMS provider = `console`) prints the 6-digit OTP. Copy it.
5. Enter the code on **Verify** → you land on the home tab.
6. Smoke-test each tab:
   - **Home:** greeting renders with your name after you save it from Profile.
   - **Chat:** type "headache for two days" → should get a safe-mode reply. Then type "chest pain going to my left arm" → must come back as a red-flagged emergency escalation (bubble is red-tinted).
   - **Emergency:** tap SOS → allow Location → confirm the alert shows the nearest seeded hospital.
   - **Booking:** hospital → department → time slot → confirm. It should appear under `/appointments`.
   - **Profile:** edit full name → Save → confirm persists after logout/login.

## Scripts

| Script               | Purpose                          |
| -------------------- | -------------------------------- |
| `npm run start`      | Expo dev server                  |
| `npm run ios`        | Build + open iOS simulator       |
| `npm run android`    | Build + open Android emulator    |
| `npm run web`        | Web preview                      |
| `npm run typecheck`  | `tsc --noEmit`                   |
| `npm run lint`       | ESLint (auto-fix)                |

## Troubleshooting

- **"Network request failed" on Android emulator:** you're pointing at `localhost`. Change `EXPO_PUBLIC_API_BASE_URL` to `http://10.0.2.2:4000/api/v1` and restart Metro with `--clear`.
- **Phone can't reach backend:** Mac and phone must share Wi-Fi; try `npm run start -- --tunnel` as a fallback.
- **RTL text wrong direction after locale change:** Expo requires a full reload — shake device → Reload, or `r` in Metro.
- **Token expiry loops:** clear SecureStore by reinstalling the app (simulator: `xcrun simctl uninstall booted com.hayat.app`; Android emulator: long-press app → Uninstall).
- **Metro cache weirdness after `.env` change:** `npm run start -- --clear`.
- **`EXPO_PUBLIC_*` var not visible in app:** it must be prefixed `EXPO_PUBLIC_` and Metro must be restarted.
