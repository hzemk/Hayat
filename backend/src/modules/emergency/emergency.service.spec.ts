// Stub the transitive imports so the spec doesn't drag in expo-server-sdk
// (ESM, not transformed by ts-jest). We only need the pure haversineKm helper.
jest.mock('@prisma-db/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@modules/push/push.service', () => ({ PushService: class {} }));

import { haversineKm } from './emergency.service';

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    const d = haversineKm(31.9552, 35.945, 31.9552, 35.945);
    expect(d).toBeLessThan(1e-6);
  });

  it('gives a plausible distance for two known Amman points', () => {
    // Jordan University Hospital ~ 32.00722, 35.87467
    // Al-Bashir Hospital         ~ 31.9324,  35.9411
    // Straight-line distance is roughly 10–11 km.
    const d = haversineKm(32.00722, 35.87467, 31.9324, 35.9411);
    expect(d).toBeGreaterThan(9);
    expect(d).toBeLessThan(13);
  });

  it('is symmetric', () => {
    const a = haversineKm(32.0, 35.9, 31.95, 35.93);
    const b = haversineKm(31.95, 35.93, 32.0, 35.9);
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
  });
});

describe('nearest-hospital ordering (haversine vs. squared-Euclidean)', () => {
  const user = { lat: 31.98, lng: 35.88 }; // central Amman test point

  // Three fixtures near Amman with Google-verified coordinates.
  const hospitals = [
    { id: 'juh', lat: 32.00722, lng: 35.87467 }, // Jordan University Hospital
    { id: 'hamza', lat: 31.98444, lng: 35.93611 }, // Prince Hamza
    { id: 'bashir', lat: 31.9324, lng: 35.9411 }, // Al-Bashir
  ];

  function sortedBy(
    fn: (lat1: number, lon1: number, lat2: number, lon2: number) => number,
  ) {
    return hospitals
      .map((h) => ({ id: h.id, d: fn(user.lat, user.lng, h.lat, h.lng) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.id);
  }

  it('haversine orders the three fixtures JUH → Hamza → Bashir', () => {
    const order = sortedBy(haversineKm);
    expect(order).toEqual(['juh', 'hamza', 'bashir']);
  });

  it('distances are in kilometres — all well under the 6371 km earth-radius cap', () => {
    for (const h of hospitals) {
      expect(haversineKm(user.lat, user.lng, h.lat, h.lng)).toBeLessThan(30);
    }
  });
});
