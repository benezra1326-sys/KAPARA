import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const BASE = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000';
/** Demo mode: the app runs on local fictional data, no server needed. */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO !== '0';

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('token').catch(() => null);
  const res = await fetch(`${BASE}/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({}))).message ?? 'http_error');
  return res.json() as Promise<T>;
}
