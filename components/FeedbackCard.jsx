import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import FeedbackSheet from './FeedbackSheet';
import { useLanguage } from '../providers/LanguageProvider';

const WHATSAPP_GREEN = '#25D366';

export default function FeedbackCard({ onSubmit, onWhatsApp }) {
  const { t } = useLanguage();
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {/* Decorative depth circles — same motif used on the welcome
            illustration, for visual consistency across the app */}
        <View style={styles.decorCircleLarge} />
        <View style={styles.decorCircleSmall} />

        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color="#ffffff" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{t('feedback.title')}</Text>
            <Text style={styles.subtitle}>{t('feedback.cardText')}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane-outline" size={15} color={colors.tealDark} />
            <Text style={styles.primaryButtonLabel}>{t('feedback.submit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={onWhatsApp}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
            <Text style={styles.whatsappLabel}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} onSubmit={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, marginBottom: 28 },
  card: {
    backgroundColor: colors.tealDark,
    borderRadius: 10,
    padding: 16,
    overflow: 'hidden',
    shadowColor: colors.tealDark,
  },
  decorCircleLarge: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -50,
    right: -35,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -26,
    left: -18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    color: colors.tealDark,
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 6,
    paddingVertical: 6,
    shadowColor: WHATSAPP_GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  whatsappLabel: {
    color: '#ffffff',
    fontSize: 10.5,
    fontFamily: 'Manrope-Bold',
  },
});





// import { useState } from 'react';
// import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { colors } from '../theme';
// import FeedbackSheet from './FeedbackSheet';
// import { useLanguage } from '../providers/LanguageProvider';

// const WHATSAPP_GREEN = '#25D366';
// // Accent green pulled from the reference design. If you'd rather keep a single
// // source of truth, move this into theme.js as `colors.accentGreen`.
// const ACCENT_GREEN = '#1FAA5C';
// const ACCENT_GREEN_SOFT = '#E7F6EC';

// export default function FeedbackCard({ onSubmit, onWhatsApp, illustrationSource }) {
//   const { t } = useLanguage();
//   const [sheetVisible, setSheetVisible] = useState(false);

//   // Falls back gracefully if `feedback.badge` hasn't been added to the
//   // translation files yet (most i18n libs echo the key back when missing).
//   const badgeLabel = t('feedback.badge') !== 'feedback.badge' ? t('feedback.badge') : t('feedback.title');

//   return (
//     <View style={styles.wrap}>
//       <View style={styles.card}>
//         {/* Decorative wash — soft tint in the corner, same quiet-depth motif
//             used elsewhere in the app, just re-tuned for a light card */}
//         <View style={styles.decorWash} />

//         <View style={styles.badge}>
//           <Ionicons name="heart" size={11} color={ACCENT_GREEN} />
//           <Text style={styles.badgeText} numberOfLines={1}>{badgeLabel}</Text>
//         </View>

//         <View style={styles.textBlock}>
//           <Text style={styles.title}>{t('feedback.title')}</Text>
//           <Text style={styles.subtitle}>{t('feedback.cardText')}</Text>
//         </View>

//         <View style={styles.actionsRow}>
//           <View style={styles.buttonGroup}>
//             <TouchableOpacity
//               style={styles.primaryButton}
//               onPress={() => setSheetVisible(true)}
//               activeOpacity={0.85}
//             >
//               <Text style={styles.primaryButtonLabel}>{t('feedback.submit')}</Text>
//               <View style={styles.arrowCircle}>
//                 <Ionicons name="arrow-forward" size={13} color={ACCENT_GREEN} />
//               </View>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.whatsappButton}
//               onPress={onWhatsApp}
//               activeOpacity={0.85}
//             >
//               <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
//             </TouchableOpacity>
//           </View>

//           {/* reserves space so the sticker below doesn't sit on top of the buttons */}
//           <View style={styles.stickerSpacer} />
//         </View>

//         {/* Illustration echoing the reference image. Pass your own artwork via
//             the `illustrationSource` prop, e.g. require('../assets/images/donate.png') */}
//         {illustrationSource ? (
//           <Image source={illustrationSource} style={styles.stickerImage} resizeMode="contain" />
//         ) : (
//           <View style={styles.stickerCircle}>
//             <Ionicons name="leaf-outline" size={24} color={ACCENT_GREEN} />
//           </View>
//         )}
//       </View>

//       <FeedbackSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} onSubmit={onSubmit} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrap: { paddingHorizontal: 14, marginBottom: 28 },
//   card: {
//     backgroundColor: colors.surface,
//     borderRadius: 18,
//     padding: 16,
//     paddingBottom: 18,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: 'rgba(0,0,0,0.05)',
//     shadowColor: '#000000',
//     shadowOpacity: 0.06,
//     shadowRadius: 10,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 2,
//   },
//   decorWash: {
//     position: 'absolute',
//     width: 180,
//     height: 180,
//     borderRadius: 90,
//     backgroundColor: ACCENT_GREEN_SOFT,
//     top: -90,
//     right: -60,
//   },
//   badge: {
//     alignSelf: 'flex-start',
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//     backgroundColor: ACCENT_GREEN_SOFT,
//     borderRadius: 20,
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//     marginBottom: 12,
//   },
//   badgeText: {
//     color: ACCENT_GREEN,
//     fontSize: 10.5,
//     fontFamily: 'Manrope-Bold',
//   },
//   textBlock: {
//     marginBottom: 16,
//     paddingRight: 72,
//   },
//   title: {
//     color: colors.tealDark,
//     fontSize: 16,
//     fontFamily: 'Manrope-ExtraBold',
//     marginBottom: 5,
//   },
//   subtitle: {
//     color: '#6B7A72',
//     fontSize: 12,
//     fontFamily: 'Manrope-Regular',
//     lineHeight: 18,
//   },
//   actionsRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   buttonGroup: {
//     flexDirection: 'row',
//     gap: 8,
//     flex: 1,
//   },
//   primaryButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     backgroundColor: ACCENT_GREEN,
//     borderRadius: 24,
//     paddingVertical: 10,
//     paddingLeft: 16,
//     paddingRight: 6,
//     flexShrink: 1,
//   },
//   primaryButtonLabel: {
//     color: '#ffffff',
//     fontSize: 11.5,
//     fontFamily: 'Manrope-Bold',
//   },
//   arrowCircle: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: '#ffffff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   whatsappButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: WHATSAPP_GREEN,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: WHATSAPP_GREEN,
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 3 },
//     elevation: 3,
//   },
//   stickerSpacer: {
//     width: 64,
//   },
//   stickerImage: {
//     position: 'absolute',
//     right: 4,
//     bottom: -16,
//     width: 120,
//     height: 120,
//   },
//   // Fallback used when no illustrationSource is passed in.
//   stickerCircle: {
//     position: 'absolute',
//     right: 10,
//     bottom: 8,
//     width: 52,
//     height: 52,
//     borderRadius: 26,
//     backgroundColor: ACCENT_GREEN_SOFT,
//     alignItems: 'center',
//     justifyContent: 'center',
//     transform: [{ rotate: '-8deg' }],
//   },
// });