import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ImageBackground,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Coordinates, CalculationMethod, Madhab, PrayerTimes, SunnahTimes } from 'adhan';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';

/* Background artwork */
let MOSQUE_ART = null;
try {
  MOSQUE_ART = require('../assets/images/mosque-skyline2.png');
} catch (e) {
  MOSQUE_ART = null;
}

// Dhaka, Bangladesh — swap for real coordinates (expo-location) if needed.
const LOCATION_COORDINATES = new Coordinates(23.8103, 90.4125);

// Karachi method + Hanafi Asr — closest standard preset for Bangladesh.
function getCalculationParams() {
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  return params;
}

// Locale tag used for every date/time/number the card renders, so Bengali
// gets Bengali numerals and month names without any manual digit mapping.
function localeFor(lang) {
  return lang === 'bn' ? 'bn-BD' : 'en-US';
}

// Standard tabular ("Kuwaiti algorithm") Gregorian -> Hijri conversion.
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
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return { day: hDay, month: hMonth, year: hYear };
}

// Approximate Bengali six-season calendar, mapped by Gregorian month.
// Returns a translation key so the label follows the active language.
function getSeasonKey(date) {
  const month = date.getMonth(); // 0 = Jan
  if (month === 3 || month === 4) return 'season.summer';
  if (month === 5 || month === 6) return 'season.monsoon';
  if (month === 7 || month === 8) return 'season.autumn';
  if (month === 9 || month === 10) return 'season.lateAutumn';
  if (month === 11 || month === 0) return 'season.winter';
  return 'season.spring';
}

function formatTime(date, lang) {
  if (!date || Number.isNaN(date.getTime?.())) return '--:--';
  return date.toLocaleTimeString(localeFor(lang), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatClock(date, lang) {
  return date.toLocaleTimeString(localeFor(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatShort(date, lang) {
  if (!date) return '--:--';
  return date.toLocaleTimeString(localeFor(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatGap(ms, lang, t) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const num = (value) => value.toLocaleString(localeFor(lang));
  if (hours <= 0) return `${num(minutes)} ${t('prayer.min')}`;
  return `${num(hours)} ${t('prayer.hr')} ${num(minutes)} ${t('prayer.min')}`;
}

// Tahajjud window (last third of the night -> Fajr) — kept for the Fajr /
// sunrise / sunset readouts on the right.
function computeTahajjudWindow(now) {
  const params = getCalculationParams();

  const today = new Date(now);
  const todayPrayerTimes = new PrayerTimes(LOCATION_COORDINATES, today, params);

  if (now < todayPrayerTimes.fajr) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayPrayerTimes = new PrayerTimes(LOCATION_COORDINATES, yesterday, params);
    const sunnah = new SunnahTimes(yesterdayPrayerTimes);
    return {
      fajr: todayPrayerTimes.fajr,
      sunrise: todayPrayerTimes.sunrise,
      sunset: todayPrayerTimes.maghrib,
      windowStart: sunnah.lastThirdOfTheNight,
      windowEnd: todayPrayerTimes.fajr,
    };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowPrayerTimes = new PrayerTimes(LOCATION_COORDINATES, tomorrow, params);
  const sunnah = new SunnahTimes(todayPrayerTimes);
  return {
    fajr: tomorrowPrayerTimes.fajr,
    sunrise: todayPrayerTimes.sunrise,
    sunset: todayPrayerTimes.maghrib,
    windowStart: sunnah.lastThirdOfTheNight,
    windowEnd: tomorrowPrayerTimes.fajr,
  };
}

/* ------------------------------------------------------------------ *
 * Real upcoming waqt
 * ------------------------------------------------------------------ *
 * Builds one ordered timeline of waqt entry times spanning yesterday →
 * tomorrow (Tahajjud + the five daily prayers), then picks the entry that
 * is still ahead of "now" plus the one currently running. Entries carry a
 * translation KEY rather than a fixed label, so the timeline itself is
 * language-agnostic and only renders in the active language.
 */
const DAILY_PRAYERS = [
  ['fajr', 'prayer.fajr'],
  ['dhuhr', 'prayer.dhuhr'],
  ['asr', 'prayer.asr'],
  ['maghrib', 'prayer.maghrib'],
  ['isha', 'prayer.isha'],
];

function buildWaqtTimeline(now) {
  const params = getCalculationParams();
  const dayTimes = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return new PrayerTimes(LOCATION_COORDINATES, d, params);
  };

  const yesterday = dayTimes(-1);
  const today = dayTimes(0);
  const tomorrow = dayTimes(1);

  const entries = [];
  const push = (labelKey, time) => {
    if (time && !Number.isNaN(new Date(time).getTime())) entries.push({ labelKey, time });
  };

  push('prayer.isha', yesterday.isha);
  push('prayer.tahajjud', new SunnahTimes(yesterday).lastThirdOfTheNight);
  DAILY_PRAYERS.forEach(([key, labelKey]) => push(labelKey, today[key]));
  push('prayer.tahajjud', new SunnahTimes(today).lastThirdOfTheNight);
  DAILY_PRAYERS.forEach(([key, labelKey]) => push(labelKey, tomorrow[key]));

  entries.sort((a, b) => a.time - b.time);

  let index = entries.findIndex((e) => e.time > now);
  if (index < 1) index = 1; // defensive: never fall off either end
  return { current: entries[index - 1], upcoming: entries[index] };
}

/* ------------------------------------------------------------------ */

export default function PrayerTimesCard() {
  const { t, lang } = useLanguage();
  const [now, setNow] = useState(() => new Date());
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const enter = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    shimmerLoop.start();
    pulseLoop.start();
    return () => {
      shimmerLoop.stop();
      pulseLoop.stop();
    };
  }, [enter, shimmer, pulse]);

  // Recompute astronomy once a minute; the second tick drives the clock only.
  const minuteKey = Math.floor(now.getTime() / 60000);
  const tahajjudWindow = useMemo(() => computeTahajjudWindow(now), [minuteKey]);
  const waqt = useMemo(() => buildWaqtTimeline(now), [minuteKey]);
  const hijri = useMemo(() => gregorianToHijri(now), [minuteKey]);
  const seasonKey = useMemo(() => getSeasonKey(now), [minuteKey]);

  const dayName = now.toLocaleDateString(localeFor(lang), { weekday: 'long' });
  const gregorianDate = now.toLocaleDateString(localeFor(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const hijriDay = hijri.day.toLocaleString(localeFor(lang));
  const hijriYear = hijri.year.toLocaleString(localeFor(lang));

  const currentWaqt = waqt.current;
  const upcomingWaqt = waqt.upcoming;

  // Progress across the running waqt, from its start to the next one.
  const totalWindowMs = Math.max(1, upcomingWaqt.time - currentWaqt.time);
  const progress = Math.min(1, Math.max(0, (now - currentWaqt.time) / totalWindowMs));

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const statusLabel = `${t(currentWaqt.labelKey)} ${t('prayer.ongoing')}`;
  const statusColor = colors.primary;
  const countdownLabel = `${t(upcomingWaqt.labelKey)} ${t('prayer.to')} ${formatGap(
    upcomingWaqt.time - now,
    lang,
    t
  )}`;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, Math.max(trackWidth, 120)],
  });
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const enterTranslate = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View
      style={[styles.card, { opacity: enter, transform: [{ translateY: enterTranslate }] }]}
    >
      <Animated.View pointerEvents="none" style={[styles.artWrap]}>
        {MOSQUE_ART ? (
          <ImageBackground
            source={MOSQUE_ART}
            resizeMode="contain"
            style={styles.art}
            imageStyle={styles.artImage}
          />
        ) : null}
        <View style={styles.moonGlow} />
      </Animated.View>

      <View style={styles.topRow}>
        <View style={styles.hijriBlock}>
          <View style={styles.iconBadge}>
            <Ionicons name="moon" size={16} color="#ffffff" />
          </View>
          <View style={styles.hijriTextWrap}>
            <View style={styles.hijriTitleRow}>
              <Text style={styles.hijriDate} numberOfLines={1}>
                {hijriDay} {t(`hijri.${hijri.month}`)} {hijriYear} {t('prayer.ah')}, {dayName}
              </Text>
              <Ionicons name="moon-outline" size={12} color={colors.primary} />
            </View>
            <Text style={styles.gregorianDate} numberOfLines={1}>
              {gregorianDate} · {t('prayer.location')} · {t(seasonKey)}
            </Text>
          </View>
        </View>
      </View>

     <View style={styles.divider}>
  <View style={styles.dividerLeft} />
  <View style={styles.dividerCenter} />
  <View style={styles.dividerRight} />
</View>

      <View style={styles.clockPillRow}>
        <View style={styles.clockPill}>
          <Ionicons name="moon" size={11} color={colors.primary} />
          <Text style={styles.clockText}>{formatClock(now, lang)}</Text>
        </View>
      </View>

      <View style={styles.timesRow}>
        {/* LEFT: the real upcoming waqt for the current time */}
        <View style={styles.timeItem}>
          <View style={styles.timeLabelRow}>
            <Text style={styles.timeLabel}>{t(upcomingWaqt.labelKey)}</Text>
            <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
          </View>
          <Text style={styles.timeValue}>{formatTime(upcomingWaqt.time, lang)}</Text>
        </View>

        <View style={styles.timeDivider} />

        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>{t('prayer.fajr')}</Text>
          <Text style={styles.timeValue}>{formatTime(tahajjudWindow.fajr, lang)}</Text>
        </View>
      </View>

      <View style={styles.sunRow}>
        <View style={styles.sunItem}>
          <View style={styles.sunIcon}>
            <MaterialCommunityIcons name="weather-sunset-up" size={13} color={colors.accent} />
          </View>
          <Text style={styles.sunLabel}>{t('prayer.sunrise')}</Text>
          <Text style={styles.sunValue}>{formatTime(tahajjudWindow.sunrise, lang)}</Text>
        </View>
        <View style={styles.sunItem}>
          <Text style={styles.sunLabel}>{t('prayer.sunset')}</Text>
          <Text style={styles.sunValue}>{formatTime(tahajjudWindow.sunset, lang)}</Text>
          <View style={styles.sunIcon}>
            <MaterialCommunityIcons name="weather-sunset-down" size={13} color={colors.accent} />
          </View>
        </View>
      </View>

      {/* <View style={styles.progressSection}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressLabel}>
            {t(upcomingWaqt.labelKey)} {t('prayer.starts')}
          </Text>
          <Text style={styles.progressValue}>{formatShort(upcomingWaqt.time, lang)}</Text>
        </View>

        <View
          style={styles.progressTrack}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
          </Animated.View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <View style={styles.statusDotWrap}>
              <Animated.View
                style={[
                  styles.statusHalo,
                  {
                    backgroundColor: statusColor,
                    opacity: dotOpacity,
                    transform: [{ scale: dotScale }],
                  },
                ]}
              />
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.countdownLabel}>{countdownLabel}</Text>
        </View>
      </View> */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#14402a',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  artWrap: { position: 'absolute', top: -10, right: -6, width: 240, height: 130 },
  art: { position: 'absolute', right: 8, bottom: 0, width: 210, height: 110 },
  artImage: { opacity: 0.9 },
  moonGlow: {
    position: 'absolute',
    right: 54,
    top: 6,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    opacity: 0.07,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  hijriBlock: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, paddingRight: 10 },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hijriTextWrap: { flexShrink: 1 },
  hijriTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  hijriDate: { color: colors.text, fontSize: 13.5, fontFamily: 'Manrope-Bold', flexShrink: 1 },
  gregorianDate: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-Regular' },

  divider: { height: 1, backgroundColor: 'transparent', marginTop: 22 },

divider: { height: 1, backgroundColor:'transparent', marginTop: 22 },
//   divider: {
//   height: 1,
//   marginTop: 22,
//   flexDirection: 'row',
// },

// dividerLeft: {
//   flex: 1,
//  backgroundColor: colors.border
// },
// dividerCenter: {
//   flex: 1,
//   backgroundColor: colors.border
// },

// dividerRight: {
//   flex: 1,
//   backgroundColor: 'transparent',
// },

  clockPillRow: { flexDirection: 'row', justifyContent: 'center', marginTop: -13 },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clockText: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-ExtraBold' },
  timesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  timeItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  timeDivider: { width: 1, height: 32, backgroundColor: colors.border },
  timeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  timeLabel: { color: colors.muted, fontSize: 11.5, fontFamily: 'Manrope-Medium', marginBottom: 3 },
  timeValue: { color: colors.text, fontSize: 16, fontFamily: 'Manrope-ExtraBold' },
  sunRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  sunItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sunIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,138,30,0.10)',
  },
  sunLabel: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-Regular' },
  sunValue: { color: colors.text, fontSize: 11.5, fontFamily: 'Manrope-Bold' },
  progressSection: {
    marginTop: 16,
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  progressLabel: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-Bold' },
  progressValue: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-ExtraBold' },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDotWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  statusHalo: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 11.5, fontFamily: 'Manrope-Bold' },
  countdownLabel: { color: colors.muted, fontSize: 11.5, fontFamily: 'Manrope-Medium' },
});