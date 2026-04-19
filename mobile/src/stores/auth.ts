import { create } from 'zustand';
import { tokenStorage, userStorage } from '@services/storage';
import { api, registerForceLogoutHandler } from '@services/api/client';
import {
  cancelAllReminderNotifications,
  clearExpoPushToken,
  registerExpoPushToken,
} from '@services/notifications';

export type AuthProvider = 'LOCAL' | 'SANAD';

export interface User {
  id: string;
  email: string;
  phoneNumber: string | null;
  fullName: string | null;
  role: 'PATIENT' | 'DOCTOR' | 'HOSPITAL_ADMIN' | 'ADMIN';
  authProvider: AuthProvider;
  preferredLocale: string;
  emailVerified: boolean;
  defaultDoctorId?: string | null;
  hospitalId?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  isProfileComplete?: boolean;
}

interface AuthState {
  user: User | null;
  isHydrated: boolean;
  setSession: (params: { user: User; accessToken: string; refreshToken: string }) => Promise<void>;
  setUser: (user: User) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,

  async setSession({ user, accessToken, refreshToken }) {
    await tokenStorage.saveTokens(accessToken, refreshToken);
    await userStorage.save(user);
    set({ user });
    void registerExpoPushToken();
  },

  setUser(user) {
    set({ user });
    userStorage.save(user).catch(() => undefined);
  },

  async hydrate() {
    // Dev: force login every launch — skip backend, clear any stale session.
    await tokenStorage.clear().catch(() => undefined);
    set({ isHydrated: true, user: null });
  },

  async logout() {
    const refresh = await tokenStorage.getRefresh();
    await clearExpoPushToken().catch(() => undefined);
    if (refresh) {
      await api.post('/auth/logout', { refreshToken: refresh }).catch(() => undefined);
    }
    await tokenStorage.clear();
    await cancelAllReminderNotifications().catch(() => undefined);
    set({ user: null });
  },
}));

registerForceLogoutHandler(async () => {
  await tokenStorage.clear();
  useAuthStore.setState({ user: null });
});
