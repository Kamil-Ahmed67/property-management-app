import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import {
  TOLET_RED,
  TOLET_RED_SOFT,
  WHATSAPP_GREEN,
  VACANT_GREEN,
  VACANT_GREEN_SOFT,
  toBn,
  floorLabel,
  typeLabel,
  sinceLabel,
  groupByFloor,
  callNumber,
  openWhatsApp,
  openMap,
} from '../utils/toLet';

/**
 * Full public detail of one property's vacant flats — every floor, every
 * flat with its layout, and owner + security contact with call/WhatsApp.
 * Opened from FindPropertyScreen; `property` is a groupByProperty() item.
 */
export default function ToLetDetailScreen({ property, onBack }) {
  const insets = useSafeAreaInsets();
  const floors = useMemo(() => groupByFloor(property.units), [property.units]);

  // Bottom bar calls the owner first, security if the owner has no number.
  const primaryPhone = property.ownerPhone || property.securityPhone;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={19} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{property.name}</Text>
        <View style={styles.stamp}>
          <Text style={styles.stampText}>TO-LET</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="business" size={26} color={colors.primary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>{property.name}</Text>
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>{typeLabel(property.type)}</Text>
              </View>
            </View>
          </View>

          {property.address ? (
            <TouchableOpacity
              style={styles.addressBox}
              onPress={() => openMap(property.address)}
              activeOpacity={0.8}
            >
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.addressText}>{property.address}</Text>
              <View style={styles.mapLink}>
                <Text style={styles.mapLinkText}>ম্যাপ</Text>
                <Ionicons name="open-outline" size={12} color={colors.primaryDark} />
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.statsRow}>
            <StatBox value={toBn(property.units.length)} label="খালি ফ্ল্যাট" highlight />
            <StatBox value={toBn(floors.length)} label="তলায়" />
            <StatBox value={sinceLabel(property.latest) || '—'} label="সর্বশেষ" small />
          </View>
        </View>

        {/* Vacant flats */}
        <Text style={styles.sectionTitle}>খালি ফ্ল্যাটসমূহ</Text>

        {floors.map((f) => (
          <View key={f.floor} style={styles.floorBlock}>
            <View style={styles.floorHeader}>
              <View style={styles.floorBadge}>
                <Ionicons name="layers" size={13} color={colors.primary} />
                <Text style={styles.floorBadgeText}>{floorLabel(f.floor)}</Text>
              </View>
              <Text style={styles.floorCount}>{toBn(f.units.length)}টি খালি</Text>
            </View>

            {f.units.map((u) => (
              <View key={u.PropDetailsId} style={styles.unitCard}>
                <View style={styles.unitTop}>
                  <Text style={styles.unitName}>{u.FlatName}</Text>
                  <View style={styles.vacantPill}>
                    <View style={styles.vacantDot} />
                    <Text style={styles.vacantPillText}>খালি</Text>
                  </View>
                </View>

                <View style={styles.specGrid}>
                  <Spec icon="bed-outline" value={toBn(u.Room || 0)} label="রুম" />
                  <Spec icon="water-outline" value={toBn(u.Bathroom || 0)} label="বাথরুম" />
                  <Spec icon="sunny-outline" value={toBn(u.Balcony || 0)} label="বারান্দা" />
                </View>

                {u.AvailableSince ? (
                  <View style={styles.unitSince}>
                    <Ionicons name="time-outline" size={12} color={colors.muted} />
                    <Text style={styles.unitSinceText}>{sinceLabel(u.AvailableSince)}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}

        {/* Contact */}
        <Text style={styles.sectionTitle}>যোগাযোগ</Text>
        <View style={styles.contactCard}>
          <ContactRow
            icon="person"
            role="বাড়িওয়ালা"
            name={property.ownerName}
            phone={property.ownerPhone}
            propertyName={property.name}
            showWhatsApp
          />
          {property.ownerPhone && property.securityPhone ? <View style={styles.contactDivider} /> : null}
          <ContactRow
            icon="shield-checkmark"
            role="সিকিউরিটি / কেয়ারটেকার"
            name={property.securityName}
            phone={property.securityPhone}
            propertyName={property.name}
          />
          {!property.ownerPhone && !property.securityPhone ? (
            <Text style={styles.noContact}>এই প্রপার্টির কোনো যোগাযোগ নম্বর দেওয়া নেই।</Text>
          ) : null}
        </View>

        <View style={styles.tipBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={styles.tipText}>
            ফ্ল্যাট দেখতে যাওয়ার আগে ফোন করে সময় ঠিক করে নিন। অগ্রিম টাকা দেওয়ার আগে চুক্তিপত্র দেখে নিন।
          </Text>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      {primaryPhone ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.actionWhatsApp}
            onPress={() => openWhatsApp(primaryPhone, property.name)}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.actionText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCall}
            onPress={() => callNumber(primaryPhone)}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={17} color="#FFFFFF" />
            <Text style={styles.actionText}>
              {property.ownerPhone ? 'বাড়িওয়ালাকে কল করুন' : 'সিকিউরিটিকে কল করুন'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function StatBox({ value, label, highlight = false, small = false }) {
  return (
    <View style={[styles.statBox, highlight && styles.statBoxHighlight]}>
      <Text
        style={[styles.statValue, highlight && styles.statValueHighlight, small && styles.statValueSmall]}
        numberOfLines={2}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Spec({ icon, value, label }) {
  return (
    <View style={styles.spec}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function ContactRow({ icon, role, name, phone, propertyName, showWhatsApp = false }) {
  if (!phone) return null;
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>

      <View style={styles.contactTextWrap}>
        <Text style={styles.contactRole}>{role}</Text>
        {name ? <Text style={styles.contactName} numberOfLines={1}>{name}</Text> : null}
        <Text style={styles.contactPhone} selectable>{phone}</Text>
      </View>

      {showWhatsApp ? (
        <TouchableOpacity
          style={styles.roundWhatsApp}
          onPress={() => openWhatsApp(phone, propertyName)}
          hitSlop={6}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.roundCall}
        onPress={() => callNumber(phone)}
        hitSlop={6}
        activeOpacity={0.8}
      >
        <Ionicons name="call" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 22, fontFamily: 'Manrope-Bold' },
  stamp: {
    backgroundColor: TOLET_RED_SOFT, borderWidth: 1.5, borderColor: TOLET_RED, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: '-4deg' }],
  },
  stampText: { color: TOLET_RED, fontSize: 10.5, fontFamily: 'Manrope-ExtraBold', letterSpacing: 0.8 },

  content: { paddingHorizontal: 20, paddingTop: 16 },

  /* Hero */
  hero: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 16,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 13, backgroundColor: `${colors.primary}14`,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTextWrap: { flex: 1, alignItems: 'flex-start' },
  heroTitle: { color: colors.text, fontSize: 18, lineHeight: 24, fontFamily: 'Manrope-ExtraBold', marginBottom: 5 },
  typePill: { backgroundColor: colors.bg, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  typePillText: { color: colors.text, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-SemiBold' },

  addressBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 14,
    backgroundColor: colors.bg, borderRadius: 10, padding: 11,
  },
  addressText: { flex: 1, color: colors.text, fontSize: 12.5, lineHeight: 19, fontFamily: 'Manrope-Medium' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 1 },
  mapLinkText: { color: colors.primaryDark, fontSize: 11.5, lineHeight: 17, fontFamily: 'Manrope-Bold' },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statBox: {
    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center',
  },
  statBoxHighlight: { backgroundColor: VACANT_GREEN_SOFT, borderColor: VACANT_GREEN_SOFT },
  statValue: { color: colors.text, fontSize: 18, lineHeight: 24, fontFamily: 'Manrope-ExtraBold', textAlign: 'center' },
  statValueHighlight: { color: VACANT_GREEN },
  statValueSmall: { fontSize: 11.5, lineHeight: 16, fontFamily: 'Manrope-Bold' },
  statLabel: { color: colors.muted, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-Medium', marginTop: 2 },

  sectionTitle: {
    color: colors.text, fontSize: 14, lineHeight: 20, fontFamily: 'Manrope-Bold',
    marginTop: 22, marginBottom: 10,
  },

  /* Floors */
  floorBlock: { marginBottom: 14 },
  floorHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  floorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${colors.primary}14`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  floorBadgeText: { color: colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope-Bold' },
  floorCount: { color: colors.muted, fontSize: 11, lineHeight: 16, fontFamily: 'Manrope-SemiBold' },

  unitCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 13, marginBottom: 8,
  },
  unitTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  unitName: { color: colors.text, fontSize: 15, lineHeight: 21, fontFamily: 'Manrope-ExtraBold' },
  vacantPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: VACANT_GREEN_SOFT,
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4,
  },
  vacantDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#12B76A' },
  vacantPillText: { color: VACANT_GREEN, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-Bold' },

  specGrid: { flexDirection: 'row', gap: 8 },
  spec: {
    flex: 1, alignItems: 'center', backgroundColor: colors.bg, borderRadius: 9, paddingVertical: 9,
  },
  specValue: { color: colors.text, fontSize: 14, lineHeight: 19, fontFamily: 'Manrope-Bold', marginTop: 3 },
  specLabel: { color: colors.muted, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-Medium' },

  unitSince: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  unitSinceText: { color: colors.muted, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-Medium' },

  /* Contact */
  contactCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  contactIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: `${colors.primary}14`,
    alignItems: 'center', justifyContent: 'center',
  },
  contactTextWrap: { flex: 1 },
  contactRole: { color: colors.muted, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-SemiBold' },
  contactName: { color: colors.text, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope-Bold' },
  contactPhone: { color: colors.primaryDark, fontSize: 13, lineHeight: 19, fontFamily: 'Manrope-Bold', marginTop: 1 },
  contactDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  roundWhatsApp: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: WHATSAPP_GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  roundCall: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  noContact: {
    color: colors.muted, fontSize: 12, lineHeight: 18, fontFamily: 'Manrope-Medium',
    paddingVertical: 12, textAlign: 'center',
  },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 14,
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    padding: 11,
  },
  tipText: { flex: 1, color: colors.muted, fontSize: 11.5, lineHeight: 18, fontFamily: 'Manrope-Regular' },

  /* Action bar */
  actionBar: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  actionWhatsApp: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: WHATSAPP_GREEN, borderRadius: 12, paddingHorizontal: 16, minHeight: 48,
  },
  actionCall: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.primary, borderRadius: 12, minHeight: 48,
  },
  actionText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontFamily: 'Manrope-Bold' },
});