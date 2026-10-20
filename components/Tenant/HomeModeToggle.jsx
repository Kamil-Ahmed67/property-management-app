import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme';

// A LOCAL dashboard toggle only — not the real interface-switcher (that
// lives in the navbar and actually swaps to the Owner app). This just
// toggles which content shows inline on the dashboard.
//
// Shared by both sides. Each segment's active colour follows WHO it is
// about: tenant-related segments use colors.primary, landlord-related
// segments use colors.teal. An option can still override this with its
// own `activeColor`.
const KEY_COLORS = {
  tenant: colors.primary,       // tenant dashboard: "Tenant"
  requests: colors.teal,     // landlord dashboard: "Tenant Requests"
  landlord: colors.teal,        // landlord dashboard: "Landlord"
  connections: colors.primary,     // tenant dashboard: "Landlord Requests"
};

const DEFAULT_OPTIONS = [
  { key: 'tenant', label: 'Tenant' },
  { key: 'connections', label: 'Landlord Requests' },
];

function activeColorFor(opt) {
  return opt.activeColor || KEY_COLORS[opt.key] || colors.primary;
}

export default function HomeModeToggle({ mode, onChange, options = DEFAULT_OPTIONS }) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = mode === opt.key;
        const activeColor = activeColorFor(opt);
        const showBadge = Number(opt.badge) > 0;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, active && { backgroundColor: activeColor }]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
          >
            <View style={styles.segmentInner}>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {opt.label}
              </Text>
              {showBadge ? (
                <View style={[styles.badge, active && styles.badgeActive]}>
                  <Text style={[styles.badgeText, active && { color: activeColor }]}>
                    {opt.badgeText ?? opt.badge}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 4,
    gap: 4,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#dfe8e4',
        shadowOpacity: 0.0010,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
    color: colors.muted,
  },
  labelActive: {
    color: '#ffffff',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});