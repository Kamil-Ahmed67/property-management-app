import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { colors } from '../theme';

const LOGO = require('../assets/images/logo.png');

function useDotAnimation(delay) {
  const value = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.3,
          duration: 420,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return value;
}

export default function SplashScreen() {
  const dot1 = useDotAnimation(0);
  const dot2 = useDotAnimation(150);
  const dot3 = useDotAnimation(300);
  const [logoReady, setLogoReady] = useState(false);
  const insets = useSafeAreaInsets();

  const appVersion = Constants.expoConfig?.version;

  useEffect(() => {
    Asset.loadAsync(LOGO)
      .then(() => setLogoReady(true))
      .catch(() => setLogoReady(true));
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.logoBlock}>
        {logoReady ? (
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.logoPlaceholder} />
        )}
      </View>

      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
      {appVersion ? (
  <Text style={[styles.versionText, { bottom: insets.bottom + 1 }]}>
    Version-{appVersion}
  </Text>
) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  logoPlaceholder: {
    width: 160,
    height: 160,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: colors.teal,
  },
  versionText: {
    position: 'absolute',
    fontSize: 11,
    fontFamily: 'Manrope-Regular',
    color: colors.muted,
  },
});