// Hospital.city is a single English string (e.g. "Amman") — it's not bilingual
// in the DB, so translate it on the client when rendering for Arabic users.
const CITY_AR: Record<string, string> = {
  amman: 'عمّان',
  irbid: 'إربد',
  zarqa: 'الزرقاء',
  aqaba: 'العقبة',
  mafraq: 'المفرق',
  jerash: 'جرش',
  ajloun: 'عجلون',
  balqa: 'البلقاء',
  madaba: 'مأدبا',
  karak: 'الكرك',
  tafilah: 'الطفيلة',
  'ma\'an': 'معان',
  maan: 'معان',
};

export function localizeCity(city: string | null | undefined, isRtl: boolean): string {
  if (!city) return '';
  if (!isRtl) return city;
  return CITY_AR[city.trim().toLowerCase()] ?? city;
}
