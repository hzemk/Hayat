import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  daysBetween,
  effectiveDaysAfterSlips,
  stageForDays,
  TreeStage,
} from '@services/quitSmoking';

const STORAGE_KEY = 'hayat.quitSmoking.v1';

export interface QuitSmokingSetup {
  /** ISO date (YYYY-MM-DD) — stored without time so the streak is local-day based. */
  quitDate: string;
  cigarettesPerDay: number;
  pricePerPack: number;
  cigarettesPerPack: number;
  currency: string; // e.g. 'JOD'
}

interface PersistedState {
  setup: QuitSmokingSetup | null;
  /** ISO dates of recorded slips. Newest first. */
  slips: string[];
  /** ISO date of the last "stayed smoke-free today" tap, or null. */
  lastCheckIn: string | null;
}

interface QuitSmokingState extends PersistedState {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  begin: (setup: QuitSmokingSetup) => Promise<void>;
  /** Records a slip with today's date. Pulls progress back one stage's worth. */
  recordSlip: () => Promise<void>;
  /** Marks today as a successful smoke-free day (purely a UI check-in). */
  checkInToday: () => Promise<void>;
  /** Wipes all progress — used when the user wants to start over fresh. */
  reset: () => Promise<void>;
}

const isWeb = Platform.OS === 'web';

async function readPersisted(): Promise<PersistedState | null> {
  try {
    const raw = isWeb
      ? window.localStorage.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      setup: parsed.setup ?? null,
      slips: Array.isArray(parsed.slips) ? parsed.slips : [],
      lastCheckIn: parsed.lastCheckIn ?? null,
    };
  } catch {
    return null;
  }
}

async function writePersisted(state: PersistedState): Promise<void> {
  const raw = JSON.stringify(state);
  try {
    if (isWeb) {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, raw);
    }
  } catch {
    // Best-effort persistence — losing one frame's worth of state is
    // acceptable here. The next tap will retry.
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useQuitSmokingStore = create<QuitSmokingState>((set, get) => ({
  setup: null,
  slips: [],
  lastCheckIn: null,
  isHydrated: false,

  async hydrate() {
    const data = await readPersisted();
    if (data) set({ ...data, isHydrated: true });
    else set({ isHydrated: true });
  },

  async begin(setup) {
    const next: PersistedState = { setup, slips: [], lastCheckIn: null };
    set(next);
    await writePersisted(next);
  },

  async recordSlip() {
    const slips = [todayISO(), ...get().slips];
    const next: PersistedState = {
      setup: get().setup,
      slips,
      lastCheckIn: get().lastCheckIn,
    };
    set({ slips });
    await writePersisted(next);
  },

  async checkInToday() {
    const today = todayISO();
    if (get().lastCheckIn === today) return;
    set({ lastCheckIn: today });
    await writePersisted({
      setup: get().setup,
      slips: get().slips,
      lastCheckIn: today,
    });
  },

  async reset() {
    set({ setup: null, slips: [], lastCheckIn: null });
    if (isWeb) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
    }
  },
}));

// Selectors — keep components lean. All derived from the raw persisted state
// + today's date, so they stay correct across app restarts.
export interface QuitSmokingDerived {
  /** Days since quitDate, ignoring slips. */
  rawDays: number;
  /** Days after the slip-penalty rules. Drives the tree stage. */
  effectiveDays: number;
  stage: TreeStage;
  moneySavedTotal: number;
  cigarettesAvoidedTotal: number;
  hasCheckedInToday: boolean;
}

export function deriveQuitSmoking(
  setup: QuitSmokingSetup | null,
  slips: string[],
  lastCheckIn: string | null,
  now: Date = new Date(),
): QuitSmokingDerived | null {
  if (!setup) return null;
  const quit = new Date(setup.quitDate);
  if (Number.isNaN(quit.getTime())) return null;
  const rawDays = daysBetween(quit, now);
  const effectiveDays = effectiveDaysAfterSlips(rawDays, slips.length);
  return {
    rawDays,
    effectiveDays,
    stage: stageForDays(effectiveDays),
    moneySavedTotal:
      setup.cigarettesPerPack > 0
        ? Math.round(
            ((effectiveDays * setup.cigarettesPerDay) /
              setup.cigarettesPerPack) *
              setup.pricePerPack *
              100,
          ) / 100
        : 0,
    cigarettesAvoidedTotal: effectiveDays * setup.cigarettesPerDay,
    hasCheckedInToday: lastCheckIn === todayISO(),
  };
}
