import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Reminder } from '@services/api/reminders.api';
import { updateMyPushToken } from '@services/api/users.api';

// Local-only medication reminders. No push server yet — we schedule on the
// device when the reminder list refreshes.

const STORAGE_KEY = 'reminder-notif-map-v1';
const MAX_SCHEDULED = 60; // iOS limit is 64; keep headroom

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionRequested = false;

export async function ensureNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (permissionRequested) return false;
  permissionRequested = true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function setupMedicationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('medication', {
    name: 'Medication reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function loadMap(): Promise<Record<string, string>> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (typeof window !== 'undefined'
            ? window.localStorage.getItem(STORAGE_KEY)
            : null)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function saveMap(map: Record<string, string>): Promise<void> {
  const value = JSON.stringify(map);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  } else {
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  }
}

/**
 * Reconcile OS-level scheduled notifications with the reminders fetched from
 * the server. Schedules for PENDING future reminders, cancels for anything
 * marked DONE / SKIPPED / removed.
 */
export async function syncReminderNotifications(
  reminders: Reminder[],
): Promise<void> {
  const granted = await ensureNotificationPermissions();
  if (!granted) return;
  await setupMedicationChannel();

  const map = await loadMap();
  const now = Date.now();

  const keep = new Set<string>();
  const toSchedule: Reminder[] = [];

  for (const r of reminders) {
    const when = new Date(r.scheduledAt).getTime();
    if (r.status !== 'PENDING' || when <= now) continue;
    keep.add(r.id);
    if (!map[r.id]) toSchedule.push(r);
  }

  // Cancel notifications that no longer have a matching pending reminder.
  for (const [reminderId, notifId] of Object.entries(map)) {
    if (!keep.has(reminderId)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      } catch {
        // already gone
      }
      delete map[reminderId];
    }
  }

  // Respect per-device scheduled-notification ceiling.
  const available = Math.max(0, MAX_SCHEDULED - Object.keys(map).length);
  const upcoming = toSchedule
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
    .slice(0, available);

  for (const r of upcoming) {
    try {
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.subtitle ?? '',
          data: { reminderId: r.id, type: r.type },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(r.scheduledAt),
          channelId: 'medication',
        },
      });
      map[r.id] = notifId;
    } catch {
      // Skip one that fails — keep going.
    }
  }

  await saveMap(map);
}

// Expo Go on SDK 53+ removed remote-push support. A dev build (expo-dev-client)
// is required to actually receive pushes — token registration silently no-ops
// on Expo Go so we don't spam the server with unusable tokens.
export async function registerExpoPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (Constants.appOwnership === 'expo') return;
  try {
    const granted = await ensureNotificationPermissions();
    if (!granted) return;
    await setupMedicationChannel();
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
        ?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (tokenResponse.data) {
      await updateMyPushToken(tokenResponse.data);
    }
  } catch {
    // Non-fatal: user just won't receive pushes until next launch.
  }
}

export async function clearExpoPushToken(): Promise<void> {
  try {
    await updateMyPushToken(null);
  } catch {
    // server may be unreachable on logout — fine, token expires eventually.
  }
}

export async function cancelAllReminderNotifications(): Promise<void> {
  const map = await loadMap();
  for (const notifId of Object.values(map)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
    } catch {
      // ignore
    }
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }
}
