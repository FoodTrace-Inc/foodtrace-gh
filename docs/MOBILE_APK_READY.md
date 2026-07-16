# FoodTrace GH Mobile APK Readiness

Use this checklist before presenting the mobile app on a real Android phone.

## Current Setup

- Expo dev client is installed through `expo-dev-client`.
- Android APK builds are configured in `mobile/eas.json`.
- Camera permission is declared in `mobile/app.json`.
- The app auto-detects the Expo host IP when possible.
- The API URL can be edited and saved inside the app.

## Start Local Services

From the repo root:

```bash
npm run dev:backend
npm run dev:web
```

Check backend health:

```text
http://localhost:3000/health
```

The expected result is:

```json
{ "status": "ok", "database": "connected", "redis": "connected" }
```

## Find Your PC API URL

Your phone cannot use `localhost` to reach the PC backend. The phone must use your computer's LAN IP.

On Windows:

```powershell
ipconfig
```

Use the IPv4 address for your Wi-Fi adapter, for example:

```text
http://192.168.1.25:3000/api
```

Open the mobile app, paste that into **API base URL**, and tap **Save API URL**.

## Run With Expo Go

This is quickest for testing:

```bash
cd mobile
npx expo start
```

Scan the QR code with Expo Go. Make sure your phone and laptop are on the same Wi-Fi.

## Run With Development APK

Use this when Expo Go is not enough or when you want an installable demo app:

```bash
cd mobile
npx eas build --profile development --platform android
```

After EAS finishes, install the APK on your Android phone. Then start the dev server:

```bash
npm run dev:client
```

## Demo Checks

1. Open the app and confirm the API URL points to your PC IP.
2. Tap **Scan Food** and grant camera permission.
3. Scan or type `FT-FD1001-2B5B7A`; expect a safe food result (ZenMalt Barley Drink).
4. Scan or type `FT-FD1000-932BF6`; expect a recalled food result (AquaFresh Pure Water).
5. Tap **Scan Drug** (requires `VITE_ENABLE_DRUG_MODULE=true`) and type `DR-DR2001-7FEA32`; expect AmoxiCure 500mg Capsules.
6. Type `DR-DR2000-C652FA`; expect AmoxiCure 250mg Capsules as recalled.

## Common Fixes

- If scans fail with network errors, verify the phone and laptop are on the same Wi-Fi.
- If the backend works on the laptop but not on the phone, allow the backend through Windows Firewall.
- If camera does not open, reinstall the app after confirming camera permissions in `app.json`.
- If a result looks old, restart the backend (the main API does not use Redis for scan cache).
