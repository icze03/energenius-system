/**
 * Energenius – Firebase Cloud Functions
 *
 * fetchEnergyData  – HTTP endpoint that polls the Tuya plug and writes to Firestore.
 * scheduledFetch   – Scheduled version (every 5 minutes).
 *
 * ── HOW TO DEPLOY ────────────────────────────────────────────────────────────
 *   1. firebase functions:config:set \
 *        tuya.access_id="YOUR_ID" \
 *        tuya.access_secret="YOUR_SECRET" \
 *        tuya.device_id="YOUR_DEVICE_ID" \
 *        tuya.base_url="https://openapi.tuyaus.com"
 *   2. firebase deploy --only functions
 * ─────────────────────────────────────────────────────────────────────────────
 */

const functions = require('firebase-functions');
const axios = require('axios');
const crypto = require('crypto');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Credentials come from Firebase config, NOT hardcoded in source.
function getConfig() {
  const cfg = functions.config().tuya || {};
  const accessId = cfg.access_id;
  const accessSecret = cfg.access_secret;
  const deviceId = cfg.device_id;
  const baseUrl = cfg.base_url || 'https://openapi.tuyaus.com';

  if (!accessId || !accessSecret || !deviceId) {
    throw new Error(
      'Missing Tuya config. Run: firebase functions:config:set tuya.access_id="..." tuya.access_secret="..." tuya.device_id="..."'
    );
  }
  return { accessId, accessSecret, deviceId, baseUrl };
}

// ─── SIGNATURE HELPERS ───────────────────────────────────────────────────────

function buildStringToSign(method, path) {
  // Tuya signature format: METHOD\n\n\nFULL_PATH
  return method.toUpperCase() + '\n' + '\n' + '\n' + path;
}

function hmacSign(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex').toUpperCase();
}

/**
 * Step 1: Get an access token.
 * Sign = HMAC-SHA256(accessId + timestamp + stringToSign)
 * NOTE: No accessToken in this sign.
 */
async function getAccessToken(accessId, accessSecret, baseUrl) {
  const timestamp = Date.now().toString();
  const path = '/v1.0/token?grant_type=1';
  const signStr = accessId + timestamp + buildStringToSign('GET', path);
  const sign = hmacSign(accessSecret, signStr);

  const response = await axios.get(`${baseUrl}${path}`, {
    headers: {
      client_id: accessId,
      sign,
      t: timestamp,
      sign_method: 'HMAC-SHA256',
    },
  });

  if (!response.data?.success) {
    throw new Error(`Token error: ${response.data?.msg} (code ${response.data?.code})`);
  }

  return { accessToken: response.data.result.access_token, timestamp };
}

/**
 * Step 2: Sign a business request.
 * BUG FIX: The original functions/index.js reused the token-request signature here.
 * The correct sign MUST include the accessToken between accessId and timestamp.
 * Sign = HMAC-SHA256(accessId + accessToken + timestamp + stringToSign)
 */
function signBusinessRequest(accessId, accessSecret, accessToken, timestamp, method, path) {
  const signStr = accessId + accessToken + timestamp + buildStringToSign(method, path);
  return hmacSign(accessSecret, signStr);
}

// ─── CORE DATA FETCH ─────────────────────────────────────────────────────────

async function fetchPlugData() {
  const { accessId, accessSecret, deviceId, baseUrl } = getConfig();

  // Step 1: get token
  const { accessToken, timestamp } = await getAccessToken(accessId, accessSecret, baseUrl);

  // Step 2: build new signature for the data endpoint (timestamp is reused intentionally)
  const path = `/v2.0/cloud/thing/${deviceId}/shadow/properties`;
  const sign = signBusinessRequest(accessId, accessSecret, accessToken, timestamp, 'GET', path);

  const response = await axios.get(`${baseUrl}${path}`, {
    headers: {
      client_id: accessId,
      access_token: accessToken,
      t: timestamp,
      sign_method: 'HMAC-SHA256',
      sign,
    },
  });

  if (!response.data?.success) {
    throw new Error(`Data error: ${response.data?.msg} (code ${response.data?.code})`);
  }

  const props = response.data.result.properties || [];
  const getNum = (code) => {
    const p = props.find((x) => x.code === code);
    return typeof p?.value === 'number' ? p.value : 0;
  };

  return {
    power: getNum('cur_power') / 10,
    voltage: getNum('cur_voltage') / 10,
    current: getNum('cur_current') / 1000,
    energy_kwh: getNum('add_ele') / 100,
    deviceId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ─── HTTP TRIGGER ─────────────────────────────────────────────────────────────

exports.fetchEnergyData = functions.https.onRequest(async (req, res) => {
  try {
    const energyData = await fetchPlugData();
    await db.collection('sensor-data').add(energyData);
    res.json({ success: true, data: energyData });
  } catch (error) {
    console.error('[fetchEnergyData]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── SCHEDULED TRIGGER (every 5 minutes) ─────────────────────────────────────

exports.scheduledFetchEnergyData = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    try {
      const energyData = await fetchPlugData();
      await db.collection('sensor-data').add(energyData);
      console.log('[scheduledFetch] Stored energy data:', energyData.power, 'W');
    } catch (error) {
      console.error('[scheduledFetch] Error:', error.message);
    }
    return null;
  });
