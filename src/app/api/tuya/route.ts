import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

const accessId = process.env.TUYA_ACCESS_ID!;
const accessSecret = process.env.TUYA_ACCESS_SECRET!;
const deviceId = process.env.TUYA_DEVICE_ID!;
const baseUrl = 'https://openapi.tuyaus.com';

function buildStringToSign(method: string, path: string, body: string = ''): string {
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  return method.toUpperCase() + '\n' + bodyHash + '\n' + '\n' + path;
}

function signForToken(timestamp: string): string {
  const path = '/v1.0/token?grant_type=1';
  const str = buildStringToSign('GET', path);
  const signStr = accessId + timestamp + str;
  return crypto
    .createHmac('sha256', accessSecret)
    .update(signStr)
    .digest('hex')
    .toUpperCase();
}

function signForBusiness(method: string, path: string, timestamp: string, accessToken: string, body: string = ''): string {
  const str = buildStringToSign(method, path, body);
  const signStr = accessId + accessToken + timestamp + str;
  return crypto.createHmac('sha256', accessSecret).update(signStr).digest('hex').toUpperCase();
}

async function getAccessToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const tokenPath = '/v1.0/token?grant_type=1';
  const sign = signForToken(timestamp);

  console.log('=== TUYA DEBUG ===');
  console.log('baseUrl:', baseUrl);
  console.log('accessId:', accessId);
  console.log('timestamp:', timestamp);
  console.log('sign:', sign);

  let response;
  try {
    response = await axios.get(`${baseUrl}${tokenPath}`, {
      headers: {
        client_id: accessId,
        sign,
        t: timestamp,
        sign_method: 'HMAC-SHA256',
      },
    });
  } catch (axiosError: any) {
    console.log('Axios network error:', axiosError.message);
    console.log('Response data:', JSON.stringify(axiosError.response?.data));
    throw new Error(`Network error: ${axiosError.message}`);
  }

  console.log('Tuya raw response:', JSON.stringify(response.data));

  if (!response.data?.success) {
    throw new Error(
      `Tuya token error: ${response.data?.msg || 'no message'} (code: ${response.data?.code || 'no code'})`
    );
  }

  return response.data.result.access_token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const accessToken = await getAccessToken();
    const timestamp = Date.now().toString();

    if (action === 'discover') {
      const path = '/v1.0/iot-03/devices';
      const sign = signForBusiness('GET', path, timestamp, accessToken);
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
        throw new Error(`Tuya discovery error: ${response.data?.msg}`);
      }
      return NextResponse.json(response.data.result?.list || []);
    }

    if (!deviceId) {
      throw new Error('Missing TUYA_DEVICE_ID in environment variables.');
    }

    const path = `/v2.0/cloud/thing/${deviceId}/shadow/properties`;
    const sign = signForBusiness('GET', path, timestamp, accessToken);
    const response = await axios.get(`${baseUrl}${path}`, {
      headers: {
        client_id: accessId,
        access_token: accessToken,
        t: timestamp,
        sign_method: 'HMAC-SHA256',
        sign,
      },
    });

    console.log('Device data response:', JSON.stringify(response.data));

    if (!response.data?.success) {
      throw new Error(`Tuya data error: ${response.data?.msg} (code: ${response.data?.code})`);
    }

    const props: { code: string; value: number | boolean }[] = response.data.result.properties;
    const getNum = (code: string): number => {
      const p = props.find((x) => x.code === code);
      return typeof p?.value === 'number' ? p.value : 0;
    };
    const getBool = (code: string): boolean => {
      const p = props.find((x) => x.code === code);
      return p?.value === true;
    };

    return NextResponse.json({
      power: getNum('cur_power') / 10,
      voltage: getNum('cur_voltage') / 10,
      current: getNum('cur_current') / 1000,
      total_kwh: getNum('add_ele') / 100,
      switch_1: getBool('switch_1'),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Tuya API] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { command, targetDeviceId } = body;
    const plugId = targetDeviceId || deviceId;

    if (!plugId) {
      throw new Error('No device ID provided.');
    }

    const accessToken = await getAccessToken();
    const timestamp = Date.now().toString();
    const path = `/v1.0/iot-03/devices/${plugId}/commands`;
    const payload = { commands: [{ code: 'switch_1', value: command === 'ON' }] };
    const bodyStr = JSON.stringify(payload);
    const sign = signForBusiness('POST', path, timestamp, accessToken, bodyStr);

    const response = await axios.post(`${baseUrl}${path}`, bodyStr, {
      headers: {
        client_id: accessId,
        access_token: accessToken,
        t: timestamp,
        sign_method: 'HMAC-SHA256',
        sign,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data?.success) {
      throw new Error(`Tuya command error: ${response.data?.msg}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Tuya API] POST error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}