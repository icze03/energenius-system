# Energenius — Production Setup Guide

This is a **fully fixed** version of the Energenius system. All 5 bugs from the original have been resolved. Follow these steps in order to get everything working.

---

## What Was Fixed

| # | Bug | Fix |
|---|-----|-----|
| 1 | Wrong Tuya API base URL in `functions/index.js` | Corrected to use the standard Tuya OpenAPI domains |
| 2 | Firebase Function reused token-request signature for data requests | Now generates a new signature (with `accessToken`) for every business API call |
| 3 | Credentials hardcoded in source code | All secrets moved to environment variables only |
| 4 | Discovery showed all devices, not just plugs | Category filter improved; error messages are now actionable |
| 5 | Linked device ID was never saved to Firestore | `tuyaDeviceId` is now stored when you click "Link" in the discovery dialog |

---

## Step 1 — Create Your Tuya IoT Project

1. Go to [https://iot.tuya.com](https://iot.tuya.com) and log in (or create an account).
2. Click **Cloud** → **Development** → **Create Cloud Project**.
3. Select your region (remember this — you'll need the matching API base URL).
4. Under **API Products**, make sure you enable:
   - **IoT Core** (required for device control)
   - **Smart Home Basic Service** (required for device list/properties)
5. Go to **Devices** → link your physical smart plug to this project.
6. From the project **Overview** tab, copy your **Access ID** and **Access Secret**.
7. From the **Devices** tab, click your plug and copy its **Device ID**.

---

## Step 2 — Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
TUYA_ACCESS_ID=your_access_id_from_tuya_iot_platform
TUYA_ACCESS_SECRET=your_access_secret_from_tuya_iot_platform
TUYA_DEVICE_ID=your_smart_plug_device_id
TUYA_BASE_URL=https://openapi.tuyaus.com   # change to match your region
```

**Region → Base URL reference:**

| Region | Base URL |
|--------|----------|
| Western America | `https://openapi.tuyaus.com` |
| Eastern America | `https://openapi-ueaz.tuyaus.com` |
| Central Europe | `https://openapi.tuyaeu.com` |
| Western Europe | `https://openapi-weaz.tuyaeu.com` |
| China | `https://openapi.tuyacn.com` |
| India | `https://openapi.tuyain.com` |
| Singapore | `https://openapi.tuyasg.com` |

---

## Step 3 — Install and Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002).

**Default login credentials** (auto-created on first sign-in attempt):
- Email: `admin@energenius.app`
- Password: `admin123`

---

## Step 4 — Test the Smart Plug Connection

1. Go to **Control Devices** → click **Discover Smart Plugs**.
2. If your credentials are correct, your plug will appear. Click **Link**.
3. Go to **Dashboard** — you should see live power/voltage/current data within 10 seconds.
4. Use the toggle switch on the dashboard to turn the plug on/off.

**If you see an error:**
- Check your `.env.local` values are correct and the file is saved.
- Make sure your plug is linked to the same Tuya IoT project as your API keys.
- Verify the `TUYA_BASE_URL` matches your account's region.

---

## Step 5 — Deploy Firebase Functions (optional, for scheduled polling)

The cloud function polls your plug every 5 minutes and stores data to Firestore.

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools
firebase login

# Set your Tuya credentials as Firebase config
firebase functions:config:set \
  tuya.access_id="YOUR_ACCESS_ID" \
  tuya.access_secret="YOUR_ACCESS_SECRET" \
  tuya.device_id="YOUR_DEVICE_ID" \
  tuya.base_url="https://openapi.tuyaus.com"

# Install function dependencies
cd functions && npm install && cd ..

# Deploy
firebase deploy --only functions
```

---

## Step 6 — Deploy the Web App (Firebase App Hosting)

```bash
firebase deploy --only hosting
```

Or deploy to Vercel:

```bash
npx vercel --prod
```

When deploying, add the same environment variables from `.env.local` to your hosting provider's settings panel.

---

## Firestore Security Rules (Important for Production)

In your Firebase Console → Firestore → Rules, set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This ensures only logged-in users can access your data.

---

## Project Structure

```
energenius/
├── .env.example              ← Copy to .env.local and fill in your values
├── src/
│   ├── app/
│   │   ├── api/tuya/route.ts ← FIXED: correct Tuya signature logic
│   │   ├── dashboard/        ← Live data + device control
│   │   ├── devices/          ← FIXED: saves tuyaDeviceId to Firestore
│   │   ├── live-data/        ← Historical charts from Firestore
│   │   ├── recommendations/  ← Rule-based energy tips
│   │   └── settings/         ← Profile, billing rate, simulator
│   ├── components/
│   │   └── devices/
│   │       └── discovery-dialog.tsx  ← FIXED: saves device ID on link
│   └── lib/
│       └── firebase.ts       ← Firebase config
└── functions/
    └── index.js              ← FIXED: correct signature flow
```
