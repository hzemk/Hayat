import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { tokenStorage } from '@services/storage';

const envBase =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

// On web the browser and backend typically run on the same host, so always
// prefer localhost — LAN IPs force a cross-origin call and often fail CORS.
const baseURL =
  Platform.OS === 'web'
    ? 'http://localhost:4000/api/v1'
    : envBase ?? 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 15_000,
});

let onForceLogout: (() => void | Promise<void>) | null = null;

export function registerForceLogoutHandler(fn: () => void | Promise<void>) {
  onForceLogout = fn;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccess();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Dedupes concurrent refreshes. If 5 requests fail with 401 at once, we refresh
// exactly once and replay all of them with the new token.
let refreshInFlight: Promise<string | null> | null = null;

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Never try to refresh the auth endpoints themselves.
    if (typeof original.url === 'string' && original.url.startsWith('/auth/')) {
      return Promise.reject(error);
    }

    original._retry = true;

    refreshInFlight = refreshInFlight ?? performRefresh();
    const newAccess = await refreshInFlight;
    refreshInFlight = null;

    if (!newAccess) {
      if (onForceLogout) await onForceLogout();
      return Promise.reject(error);
    }

    original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newAccess}` };
    return api(original);
  },
);

async function performRefresh(): Promise<string | null> {
  const refresh = await tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${baseURL}/auth/refresh`,
      { refreshToken: refresh },
      { timeout: 10_000 },
    );
    await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    await tokenStorage.clear();
    return null;
  }
}
