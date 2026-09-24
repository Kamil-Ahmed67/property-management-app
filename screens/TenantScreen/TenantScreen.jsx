import { useContext, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TenantNavbar from '../../components/Tenant/TenantNavbar';
import TenantBottomNav from '../../components/Tenant/TenantBottomNav';
import { AuthContext } from '../../providers/AuthProvider';
import { colors } from '../../theme';
import { canAccess } from '../../utils/accessControl';
import { useScrollMemory } from '../../hooks/useScrollMemory';
import PrayerTimesCard from '../PrayerTimesCard';
import AccessDeniedScreen from '../AccessDeniedScreen';
import ProfileScreen from '../ProfileScreen';

export default function TenantScreen() {
  const { loginData, logout } = useContext(AuthContext);
  const [screen, setScreen] = useState('dashboard');
  const scrollProps = useScrollMemory('tenant-dashboard');

  // Defense-in-depth: same self-check every protected screen has — this
  // never relies solely on the root gate having routed correctly.
  if (!canAccess(loginData?.UserRole, 'tenant')) {
    return (
      <AccessDeniedScreen
        title="Access Restricted"
        message="This area is only available to Tenant accounts."
        role={loginData?.UserRole}
        onLogout={logout}
      />
    );
  }

  // Profile is a full separate screen — swap the entire body for it rather
  // than nesting it inside the dashboard's own ScrollView.
  if (screen === 'profile') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TenantNavbar onSelectMenu={(key) => setScreen(key)} />
        <ProfileScreen />
        <TenantBottomNav currentScreen={screen} onSelect={(key) => setScreen(key)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TenantNavbar onSelectMenu={(key) => setScreen(key)} />

      {/* 'dashboard' — blank for now, components will be added here later. */}
      <ScrollView
        {...scrollProps}
        style={styles.page}
        contentContainerStyle={styles.content}
      >
        <PrayerTimesCard />
      </ScrollView>

      <TenantBottomNav currentScreen={screen} onSelect={(key) => setScreen(key)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: 18,
    paddingBottom: 15,
  },
});