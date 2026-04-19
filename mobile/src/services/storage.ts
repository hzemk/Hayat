import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'hayat.accessToken';
const REFRESH_TOKEN_KEY = 'hayat.refreshToken';
const USER_KEY = 'hayat.user';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string) {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore quota / SSR */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  async saveTokens(access: string, refresh: string) {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, access),
      setItem(REFRESH_TOKEN_KEY, refresh),
    ]);
  },
  async getAccess(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },
  async getRefresh(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },
  async clear() {
    await Promise.all([
      deleteItem(ACCESS_TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
      deleteItem(USER_KEY),
    ]);
  },
};

export const userStorage = {
  async save<T>(user: T) {
    await setItem(USER_KEY, JSON.stringify(user));
  },
  async load<T>(): Promise<T | null> {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
};
