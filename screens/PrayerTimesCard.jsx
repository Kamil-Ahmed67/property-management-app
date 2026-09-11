import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { Coordinates, CalculationMethod, Madhab, PrayerTimes, SunnahTimes } from 'adhan';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
const MOSQUE_ART = require('../assets/images/mosque-skyline2.png');
/* ------------------------------------------------------------------ *
 * Location + calculation method
 * ------------------------------------------------------------------ *
 * Dhaka, Bangladesh — swap for live GPS coordinates (expo-location) if
 * the app should support other cities. Karachi method + Hanafi madhab
 * is the standard preset used by most Bangladeshi prayer-time apps and
 * matches published Dhaka timetables to within a minute.
 */
const LOCATION_COORDINATES = new Coordinates(23.8103, 90.4125);

function getCalculationParams() {
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  return params;
}

function localeFor(lang) {
  return lang === 'bn' ? 'bn-BD' : 'en-US';
}

/* ------------------------------------------------------------------ *
 * Hijri conversion — standard tabular ("Kuwaiti algorithm")
 * ------------------------------------------------------------------ */
function gregorianToHijri(date) {
  const day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  if (month < 3) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5;

  const l1 = jd - 1948440 + 10632;
  const n = Math.floor((l1 - 1) / 10631);
  const l2 = l1 - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = Math.floor(l3 - Math.floor((709 * hMonth) / 24));
  const hYear = 30 * n + j - 30;

  return { day: hDay, month: hMonth, year: hYear };
}

/* ------------------------------------------------------------------ *
 * Waqt metadata — icon + the exact Bengali/English phrasing shown in
 * the card. Bengali possessive suffixes ("-এর", "-র") differ per word
 * ending, so these composed phrases are kept as direct translations
 * here rather than built at runtime from a single root word. If the
 * app's LanguageProvider should own these strings instead, move this
 * table into the translation files under matching keys (e.g.
 * `prayer.fajrTime` / `prayer.fajrEnding`) and swap the lookups below
 * for t('prayer.fajrTime') etc.
 * ------------------------------------------------------------------ */
const WAQT_META = {
  tahajjud: {
    icon: (props) => <MaterialCommunityIcons name="star-crescent" {...props} />,
    timeLabel: { bn: 'তাহাজ্জুদের সময়', en: 'Tahajjud Time' },
    endingLabel: { bn: 'তাহাজ্জুদ শেষ হতে', en: 'Time left until Tahajjud ends' },
  },
  fajr: {
    icon: (props) => <MaterialCommunityIcons name="mosque" {...props} />,
    timeLabel: { bn: 'ফজরের সময়', en: 'Fajr Time' },
    endingLabel: { bn: 'ফজরের শেষ হতে', en: 'Time left until Fajr ends' },
  },
  ishraq: {
    icon: (props) => <MaterialCommunityIcons name="weather-sunset-up" {...props} />,
    timeLabel: { bn: 'যোহরের অপেক্ষা', en: 'Waiting for Dhuhr' },
    endingLabel: { bn: 'যোহর শুরু হতে', en: 'Time left until Dhuhr begins' },
  },
  dhuhr: {
    icon: (props) => <MaterialCommunityIcons name="weather-sunny" {...props} />,
    timeLabel: { bn: 'যোহরের সময়', en: 'Dhuhr Time' },
    endingLabel: { bn: 'যোহরের শেষ হতে', en: 'Time left until Dhuhr ends' },
  },
  asr: {
    icon: (props) => <MaterialCommunityIcons name="weather-sunset" {...props} />,
    timeLabel: { bn: 'আসরের সময়', en: 'Asr Time' },
    endingLabel: { bn: 'আসরের শেষ হতে', en: 'Time left until Asr ends' },
  },
  maghrib: {
    icon: (props) => <MaterialCommunityIcons name="weather-sunset-down" {...props} />,
    timeLabel: { bn: 'মাগরিবের সময়', en: 'Maghrib Time' },
    endingLabel: { bn: 'মাগরিবের শেষ হতে', en: 'Time left until Maghrib ends' },
  },
  isha: {
    icon: (props) => <Ionicons name="moon" {...props} />,
    timeLabel: { bn: 'এশার সময়', en: 'Isha Time' },
    endingLabel: { bn: 'এশার শেষ হতে', en: 'Time left until Isha ends' },
  },
};

const LOCATION_LABEL = { bn: 'ঢাকা, বাংলাদেশ', en: 'Dhaka, Bangladesh' };
const COUNTDOWN_WORDS = {
  bn: { hour: 'ঘণ্টা', minute: 'মিনিট', remaining: 'বাকি' },
  en: { hour: 'hr', minute: 'min', remaining: 'left' },
};

/* ------------------------------------------------------------------ *
 * Formatting helpers
 * ------------------------------------------------------------------ *
 * Clock times and the countdown always render with Latin numerals and
 * English AM/PM (matching standard Bangladeshi prayer-app convention),
 * while the Hijri/Gregorian date line uses Bengali numerals and month/
 * weekday names when the active language is Bengali.
 */
function formatTime(date) {
  if (!date || Number.isNaN(date.getTime?.())) return '--:--';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatCountdown(ms, lang) {
  const words = COUNTDOWN_WORDS[lang] || COUNTDOWN_WORDS.en;
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} ${words.minute} ${words.remaining}`;
  return `${hours} ${words.hour} ${minutes} ${words.minute} ${words.remaining}`;
}

/* ------------------------------------------------------------------ *
 * Full waqt timeline
 * ------------------------------------------------------------------ *
 * Builds every named period (Tahajjud, Fajr, the sunrise→Dhuhr gap,
 * Dhuhr, Asr, Maghrib, Isha) across yesterday/today/tomorrow, then
 * returns whichever period "now" currently falls inside. Each period
 * carries its own start and end instant, so the card can show an
 * accurate time range and an accurate countdown to when it ends.
 * ------------------------------------------------------------------ */
function buildDayPeriods(dayDate) {
  const params = getCalculationParams();
  const at = (offset) => {
    const d = new Date(dayDate);
    d.setDate(d.getDate() + offset);
    return new PrayerTimes(LOCATION_COORDINATES, d, params);
  };

  const prev = at(-1);
  const curr = at(0);

  const tahajjudStart = new SunnahTimes(prev).lastThirdOfTheNight;
  const ishaEnd = new SunnahTimes(curr).lastThirdOfTheNight; // -> tomorrow's Tahajjud start

  return [
    { id: 'tahajjud', start: tahajjudStart, end: curr.fajr },
    { id: 'fajr', start: curr.fajr, end: curr.sunrise },
    { id: 'ishraq', start: curr.sunrise, end: curr.dhuhr },
    { id: 'dhuhr', start: curr.dhuhr, end: curr.asr },
    { id: 'asr', start: curr.asr, end: curr.maghrib },
    { id: 'maghrib', start: curr.maghrib, end: curr.isha },
    { id: 'isha', start: curr.isha, end: ishaEnd },
  ];
}

function findCurrentPeriod(now) {
  const candidates = [
    ...buildDayPeriods(new Date(now.getTime() - 86400000)),
    ...buildDayPeriods(now),
    ...buildDayPeriods(new Date(now.getTime() + 86400000)),
  ].sort((a, b) => a.start - b.start);

  const match = candidates.find((p) => now >= p.start && now < p.end);
  return match || candidates[candidates.length - 1];
}

/* ------------------------------------------------------------------ */

export default function PrayerTimesCard() {
  const { t, lang } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const enter = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  // Recompute astronomy once a minute; the second tick drives the clock/countdown only.
  const minuteKey = Math.floor(now.getTime() / 60000);
  const period = useMemo(() => findCurrentPeriod(now), [minuteKey]);
  const hijri = useMemo(() => gregorianToHijri(now), [minuteKey]);

  const meta = WAQT_META[period.id];
  const localeTag = localeFor(lang);

  const dayName = now.toLocaleDateString(localeTag, { weekday: 'long' });
  const gregorianDate = now.toLocaleDateString(localeTag, { day: 'numeric', month: 'long', year: 'numeric' });
  const hijriMonthName = t ? t(`hijri.${hijri.month}`) : '';
  const hijriDay = hijri.day.toLocaleString(localeTag);
  const hijriYear = hijri.year.toLocaleString(localeTag);

  const totalWindowMs = Math.max(1, period.end - period.start);
  const progress = Math.min(1, Math.max(0, (now - period.start) / totalWindowMs));
  const remainingMs = Math.max(0, period.end - now);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const enterTranslate = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  const timeLabel = meta.timeLabel[lang] || meta.timeLabel.en;
  const endingLabel = meta.endingLabel[lang] || meta.endingLabel.en;
  const locationLabel = LOCATION_LABEL[lang] || LOCATION_LABEL.en;
  const countdownText = formatCountdown(remainingMs, lang);

  return (
    <Animated.View style={[styles.card, { opacity: enter, transform: [{ translateY: enterTranslate }] }]}>
      <DecorativeArt />

      <View style={styles.topRow}>
        <View style={styles.leftBlock}>
          <View style={styles.iconBadge}>
  {meta.icon({ size: 32, color: colors.teal })}
</View>
          <View style={styles.leftTextWrap}>
            <Text style={styles.waqtLabel} numberOfLines={1}>{timeLabel}</Text>
            <Text style={styles.waqtRange} numberOfLines={1}>
              {formatTime(period.start)} – {formatTime(period.end)}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={13} color={colors.teal} />
              <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rightBlock}>
          <View style={styles.dateRow}>
            <View style={styles.calendarBadge}>
              <Ionicons name="calendar" size={11} color="#ffffff" />
            </View>
            <Text style={styles.hijriText} numberOfLines={1}>
              {hijriDay} {hijriMonthName}, {hijriYear} {t ? t('prayer.ah') : 'AH'}
            </Text>
          </View>
          <Text style={styles.gregorianText} numberOfLines={1}>
            {gregorianDate}, {dayName}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <Text style={styles.endingLabel}>{endingLabel}</Text>

      <View style={styles.countdownRow}>
        <View style={styles.clockBadge}>
          <Ionicons name="time-outline" size={14} color={colors.teal} />
        </View>
        <Text style={styles.countdownText}>{countdownText}</Text>
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ *
 * Decorative artwork: a soft mosque-skyline silhouette bottom-right,
 * a small crescent, and light corner flourishes top-left/top-right —
 * drawn as vectors (react-native-svg) so no image asset is required.
 * ------------------------------------------------------------------ */
function DecorativeArt() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Top-left decorative flourish */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 400 210"
        pointerEvents="none"
      >
        {/* Crescent */}
        <G opacity={0.55}>
          <Path
            d="M382 8 a10 10 0 1 0 0.4 19.9 a7.6 7.6 0 1 1 -0.4 -19.9 Z"
            fill={colors.teal}
          />
        </G>
      </Svg>

      {/* Mosque image — bottom right */}
      <Image
        source={MOSQUE_ART}
        resizeMode="contain"
        style={styles.mosqueArtwork}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginHorizontal: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',

    ...Platform.select({
      ios: {
        shadowColor: '#14402a',
        shadowOpacity: 0.10,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },

  leftBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    flex: 0.6,
    minWidth: 0,
  },

iconBadge: {
  width: 56,
  height: 56,
  borderRadius: 6,
  backgroundColor: colors.badge || 'rgba(31,122,76,0.14)',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
},
leftTextWrap: {
  flex: 1,
  height: 52,
  justifyContent: 'center',
  minWidth: 0,
  paddingLeft: 2,
},
waqtLabel: {
  color: colors.teal,
  fontSize: 11,
  fontFamily: 'Manrope-Bold',
  marginBottom: 2,
},

waqtRange: {
  color: colors.text,
  fontSize: 13,
  fontFamily: 'Manrope-ExtraBold',
  letterSpacing: -0.2,
  marginBottom: 3,
},

locationRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
},

locationText: {
  color: colors.teal,
  fontSize: 10,
  fontFamily: 'Manrope-Medium',
  flexShrink: 1,
},

  rightBlock: {
    flex: 0.4,
    alignItems: 'flex-end',
    minWidth: 0,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },

  calendarBadge: {
    width: 13,
    height: 13,
    borderRadius: 4,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  hijriText: {
    color: colors.text,
    fontSize: 8,
    fontFamily: 'Manrope-Bold',
    flexShrink: 1,
  },

  gregorianText: {
    color: colors.muted,
    fontSize: 7.5,
    fontFamily: 'Manrope-Medium',
  },

progressTrack: {
  marginTop: 11,
  height: 6,
  width: 260,      
  borderRadius: 3,
  backgroundColor: colors.border,
  overflow: 'hidden',
  alignSelf: 'flex-start',
},

progressFill: {
  height: '100%',
  borderRadius: 3,
  backgroundColor: colors.teal,
},

  endingLabel: {
    marginTop: 9,
    marginBottom: 3,
    color: colors.text,
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },

  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  clockBadge: {
    width: 21,
    height: 21,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countdownText: {
    color: colors.text,
    fontSize: 12.5,
    fontFamily: 'Manrope-ExtraBold',
  },

  mosqueArtwork: {
    position: 'absolute',
    right: -8,
    bottom: -12,
    width: 220,
    height: 98,
    opacity: 0.80,
  },
});