import { Linking } from 'react-native';

// Classic Dhaka "TO-LET" sign red
export const TOLET_RED = '#C62828';
export const TOLET_RED_SOFT = '#FDECEC';
export const WHATSAPP_GREEN = '#25D366';
export const VACANT_GREEN = '#067647';
export const VACANT_GREEN_SOFT = '#ECFDF3';

/* ---------------- Bangla ---------------- */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const toBn = (value) => String(value ?? '').replace(/\d/g, (d) => BN_DIGITS[d]);

const BN_ORDINALS = {
  1: '১ম', 2: '২য়', 3: '৩য়', 4: '৪র্থ', 5: '৫ম',
  6: '৬ষ্ঠ', 7: '৭ম', 8: '৮ম', 9: '৯ম', 10: '১০ম',
};

export function floorLabel(floor) {
  if (!floor) return '';
  if (/ground/i.test(floor)) return 'নিচ তলা';
  const n = parseInt(floor, 10);
  if (Number.isNaN(n)) return floor;
  return `${BN_ORDINALS[n] || `${toBn(n)}তম`} তলা`;
}

const TYPE_LABELS = {
  building: 'বিল্ডিং',
  apartment: 'অ্যাপার্টমেন্ট',
  market: 'মার্কেট',
};
export const typeLabel = (type) => TYPE_LABELS[(type || '').toLowerCase()] || type || 'প্রপার্টি';

export function sinceLabel(dateValue) {
  if (!dateValue) return '';
  const days = Math.floor((Date.now() - new Date(dateValue).getTime()) / 86400000);
  if (days <= 0) return 'আজ খালি হয়েছে';
  if (days === 1) return 'গতকাল খালি হয়েছে';
  if (days < 30) return `${toBn(days)} দিন ধরে খালি`;
  return `${toBn(Math.floor(days / 30))} মাস ধরে খালি`;
}

/* ---------------- Grouping ---------------- */

// API rows (one per vacant flat) → one object per property
export function groupByProperty(units) {
  const map = new Map();
  units.forEach((u) => {
    if (!map.has(u.PropertyId)) {
      map.set(u.PropertyId, {
        id: u.PropertyId,
        name: u.PropertyName,
        address: u.Address,
        type: u.PropertyType,
        ownerName: u.OwnerName,
        ownerPhone: u.OwnerPhone,
        securityName: u.SecurityName,
        securityPhone: u.SecurityPhone,
        units: [],
        latest: null,
      });
    }
    const p = map.get(u.PropertyId);
    p.units.push(u);
    if (u.AvailableSince && (!p.latest || new Date(u.AvailableSince) > new Date(p.latest))) {
      p.latest = u.AvailableSince;
    }
  });
  return [...map.values()];
}

// Units → [{ floor, units }] keeping the SP's floor order
export function groupByFloor(units) {
  const list = [];
  units.forEach((u) => {
    let f = list.find((x) => x.floor === u.Floor);
    if (!f) {
      f = { floor: u.Floor, units: [] };
      list.push(f);
    }
    f.units.push(u);
  });
  return list;
}

/* ---------------- Contact ---------------- */

// "+880 1624-141177" → "+8801624141177"
export const cleanPhone = (phone) => String(phone || '').replace(/[^\d+]/g, '');

// wa.me needs the country code without "+": 01712345678 → 8801712345678
function whatsappNumber(phone) {
  const digits = cleanPhone(phone).replace(/^\+/, '');
  if (/^01\d{9}$/.test(digits)) return `88${digits}`;
  return digits;
}

export function callNumber(phone) {
  const number = cleanPhone(phone);
  if (number) Linking.openURL(`tel:${number}`).catch(() => {});
}

export function openWhatsApp(phone, propertyName) {
  const number = whatsappNumber(phone);
  if (!number) return;
  const text = encodeURIComponent(`আসসালামু আলাইকুম, "${propertyName}"-এর খালি ফ্ল্যাট নিয়ে জানতে চাই।`);
  Linking.openURL(`https://wa.me/${number}?text=${text}`).catch(() => {});
}

export function openMap(address) {
  if (!address) return;
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  ).catch(() => {});
}