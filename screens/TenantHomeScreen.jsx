// screens/TenantHomeScreen.jsx
import { useContext, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, BackHandler, ActivityIndicator } from 'react-native';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';
import { canAccessInterface } from '../utils/accessControl';
import { useScrollMemory } from '../hooks/useScrollMemory';
import { useActiveHome } from '../hooks/useActiveHome';
import { isActiveHome } from '../utils/tenancy';
import AccessDeniedScreen from './AccessDeniedScreen';
import ComplainListScreen from './ComplainListScreen';
import AddComplainScreen from './AddComplainScreen';
import ProfileScreen from './ProfileScreen';
import MyHomeDetailScreen from './MyHomeDetailScreen';
import TenantNavbar from '../components/Tenant/TenantNavbar';
import TenantBottomNav from '../components/Tenant/TenantBottomNav';
import MyHomeCard from '../components/Tenant/MyHomeCard';
import QuickExpenseRow from '../components/Tenant/QuickExpenseRow';
import MyTenancyQuickCard from '../components/Tenant/MyTenancyQuickCard';
import TenancyStatusBanner from '../components/Tenant/TenancyStatusBanner';
import MonthlyExpenseGrid from '../components/Tenant/MonthlyExpenseGrid';
import TenantQuickActions from '../components/Tenant/TenantQuickActions';
import HomeModeToggle from '../components/Tenant/HomeModeToggle';
import SetupMyHomeScreen from './TenantScreen/SetupMyHomeScreen';
import MyHomeHistoryScreen from './TenantScreen/MyHomeHistoryScreen';
import MyConnectionsScreen from './TenantScreen/MyConnectionsScreen';
import SendLandlordRequestScreen from './TenantScreen/SendLandlordRequestScreen';
import TenantExpenseListScreen from './TenantScreen/TenantExpenseListScreen';
import AddTenantExpenseScreen from './TenantScreen/AddTenantExpenseScreen';
import TenantExpenseReportScreen from './TenantScreen/TenantExpenseReportScreen';

const MOCK_CATEGORIES = [
  { key: 'rent', labelKey: 'category.rent', icon: 'home', color: '#EF4444', amount: 15000, status: 'paid', date: '05 Sep 2025' },
  { key: 'electricity', labelKey: 'category.electricity', icon: 'flash', color: '#3B82F6', amount: 1500, status: 'unpaid' },
  { key: 'internet', labelKey: 'category.internet', icon: 'wifi', color: '#10B981', amount: 1000, status: 'unpaid' },
  { key: 'other', labelKey: 'category.other', icon: 'ellipsis-horizontal', color: '#F59E0B', amount: 600, status: 'unpaid' },
];

const QUICK_EXPENSE_ITEMS = [
  { key: 'rent', labelKey: 'category.rent', icon: 'home', color: '#EF4444' },
  { key: 'electricity', labelKey: 'category.electricity', icon: 'flash', color: '#3B82F6' },
  { key: 'internet', labelKey: 'category.internet', icon: 'wifi', color: '#10B981' },
  { key: 'more', labelKey: 'category.more', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

const QUICK_ACTIONS = [
  { key: 'tenant-expense', labelKey: 'quickAction.addExpense', icon: 'add', color: '#10B981' },
  { key: 'expense-reports', labelKey: 'quickAction.expenseReports', icon: 'bar-chart', color: '#0EA5E9' },
  { key: 'pay-rent', labelKey: 'quickAction.payRent', icon: 'card', color: '#3B82F6' },
  { key: 'upload-docs', labelKey: 'quickAction.uploadDocs', icon: 'document-text', color: '#7C3AED' },
  { key: 'set-reminder', labelKey: 'quickAction.setReminder', icon: 'notifications', color: '#F59E0B' },
  { key: 'file-complaint', labelKey: 'quickAction.fileComplaint', icon: 'alert-circle', color: '#EF4444' },
];

export default function TenantHomeScreen() {
  const { loginData, logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const scrollProps = useScrollMemory('tenant-home');
  const [screen, setScreen] = useState('dashboard');
  const [showMoreCard, setShowMoreCard] = useState(false);
  const [dashboardMode, setDashboardMode] = useState('tenant');
  const [requestHome, setRequestHome] = useState(null);
  // Where to go back to after Send Request (dashboard banner, home detail
  // or residence history).
  const [requestReturn, setRequestReturn] = useState('home-history');

  const uId = loginData?.Id;
  // Active home comes from the same source as Residence History, so the
  // card, banner and history screen always agree.
  const { home, homes, loading: loadingHome, reload: loadHome } = useActiveHome(uId);

  // Pending landlord invites — drives the badge on the toggle's right
  // segment even before the card is opened. The embedded card keeps it
  // in sync after Accept/Decline via onCountChange.
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    if (!uId) return;
    (async () => {
      try {
        const res = await fetch(
          `${config.BMS_API}api/GetPendingInvitesForTenant?tenantUserId=${uId}`,
          { headers: { TenantId: 'PropHub' } }
        );
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) setInviteCount((data.data || []).length);
      } catch (err) {
        console.log('Failed to load invite count:', err.message);
      }
    })();
  }, [uId]);

  // Android hardware/gesture back button — staged, matching MainApp's own
  // sub-screen pattern (one step back per press, not a jump to dashboard).
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'add-complain') {
        setScreen('complain-list');
        return true;
      }
      if (screen === 'tenant-expense-add') {
        setScreen('tenant-expense-list');
        return true;
      }
      if (screen === 'add-home') {
        setScreen('dashboard');
        return true;
      }
      if (screen === 'send-request') {
        setScreen(requestReturn);
        return true;
      }
if (
  screen === 'complain-list' ||
  screen === 'home-detail' ||
  screen === 'home-history' ||
  screen === 'my-connections' ||
  screen === 'tenant-expense-list' ||
  screen === 'expense-report' ||
  screen === 'profile'
) {
  setScreen('dashboard');
  return true;
}
      return false;
    });

    return () => handler.remove();
  }, [screen, requestReturn]);

  if (!canAccessInterface(loginData?.UserRoles, 'tenant')) {
    return (
      <AccessDeniedScreen
        title="Access Restricted"
        message="This area is only available to Tenant accounts."
        role={(loginData?.UserRoles || []).join(', ')}
        onLogout={logout}
      />
    );
  }

  const localize = (items) => items.map((item) => ({ ...item, label: t(item.labelKey) }));

  const property = home
    ? {
        buildingName: home.DisplayPropertyName,
        unitLabel: home.DisplayUnitNo,
        isCurrent: isActiveHome(home),
        imageUrl: null,
      }
    : null;

  const isConnected = home?.ConnectionStatus === 'Connected';

  const modeOptions = [
    { key: 'tenant', label: t('tenantHome.modeTenant') },
    { key: 'connections', label: t('tenantHome.modeRequests'), badge: inviteCount },
  ];

  function handleQuickAction(key) {
    if (key === 'rent') {
      setScreen('home-history');
      return;
    }
    if (key === 'file-complaint') {
      setScreen('complain-list');
      return;
    }
    if (key === 'tenant-expense') {
      setScreen('tenant-expense-list');
      return;
    }
    if (key === 'expense-reports') {
  setScreen('expense-report');
  return;
}
    if (key === 'more') {
      setShowMoreCard((prev) => !prev);
    }
  }

  // Opens the Send Request screen for a given home, remembering where
  // the user came from so Back / success returns there.
  function openSendRequest(targetHome, from) {
    setRequestHome(targetHome);
    setRequestReturn(from);
    setScreen('send-request');
  }

  function handleBannerPress() {
    if (!home) {
      setScreen('add-home');
    } else {
      openSendRequest(home, 'dashboard');
    }
  }

  function handleNavbarSelect(key) {
    if (key === 'dashboard') setScreen('dashboard');
    if (key === 'profile') setScreen('profile');
  }

  const activeTab = screen === 'profile' ? 'profile' : 'dashboard';

  if (screen === 'profile') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <ProfileScreen />
        <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
      </>
    );
  }

  if (screen === 'home-detail') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <MyHomeDetailScreen
          home={home}
          uId={uId}
          onConnectPress={() => openSendRequest(home, 'home-detail')}
          onMovedOut={() => { loadHome(); setScreen('dashboard'); }}
        />
        <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
      </>
    );
  }

  if (screen === 'home-history') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <MyHomeHistoryScreen
          uId={uId}
          onAddNew={() => setScreen('add-home')}
          onSendRequest={(h) => openSendRequest(h, 'home-history')}
        />
        <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
      </>
    );
  }

  if (screen === 'send-request') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <SendLandlordRequestScreen
          home={requestHome}
          onSent={() => {
            loadHome();
            setScreen(requestReturn);
          }}
        />
        <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
      </>
    );
  }

  if (screen === 'tenant-expense-list') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <TenantExpenseListScreen onAdd={() => setScreen('tenant-expense-add')} />
        <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
      </>
    );
  }

  if (screen === 'tenant-expense-add') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <AddTenantExpenseScreen onSaved={() => setScreen('tenant-expense-list')} />
      </>
    );
  }

  if (screen === 'my-connections') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <MyConnectionsScreen
          uId={uId}
          onConnected={loadHome}
          onCountChange={setInviteCount}
        />
        <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
      </>
    );
  }

  if (screen === 'add-home') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <SetupMyHomeScreen onSaved={() => { loadHome(); setScreen('dashboard'); }} />
      </>
    );
  }

  if (screen === 'complain-list') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <ComplainListScreen mode="tenant" onNavigate={setScreen} />
        <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
      </>
    );
  }

  if (screen === 'add-complain') {
    return (
      <>
        <TenantNavbar onSelectMenu={handleNavbarSelect} />
        <AddComplainScreen onNavigate={setScreen} />
      </>
    );
  }
if (screen === 'expense-report') {
  return (
    <>
      <TenantNavbar onSelectMenu={handleNavbarSelect} />
      <TenantExpenseReportScreen />
      <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
    </>
  );
}
  return (
    <>
      <TenantNavbar onSelectMenu={handleNavbarSelect} />

      <ScrollView {...scrollProps} style={styles.page} contentContainerStyle={styles.content}>
        {loadingHome ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            {property ? (
              <MyHomeCard property={property} onPress={() => setScreen('home-detail')} />
            ) : null}
            <HomeModeToggle mode={dashboardMode} onChange={setDashboardMode} options={modeOptions} />

            {dashboardMode === 'connections' ? (
              <MyConnectionsScreen
                uId={uId}
                embedded
                onConnected={loadHome}
                onCountChange={setInviteCount}
                onViewAll={() => setScreen('my-connections')}
              />
            ) : null}

            <QuickExpenseRow items={localize(QUICK_EXPENSE_ITEMS)} onSelect={handleQuickAction} />
            {/* Revealed only when "More" is tapped — the residence-
                history entry point now lives on MonthlyExpenseGrid's own
                Rent card and the top row's Rent icon, so "More" only
                surfaces the one remaining destination: invites sent BY
                a landlord, entirely separate from the "Connect to
                Landlord" flow above. */}
            {/* {showMoreCard ? (
              <MyTenancyQuickCard
                icon="link-outline"
                label="Landlord Connections"
                onPress={() => {
                  setShowMoreCard(false);
                  setScreen('my-connections');
                }}
              />
            ) : null} */}

            <TenancyStatusBanner
              visible={!home || !isConnected}
              variant={homes.length === 0 ? 'noHome' : 'disconnected'}
              onPress={handleBannerPress}
            />
          </>
        )}
 <MonthlyExpenseGrid
  periodLabel="Sep 2025"
  onChangePeriod={() => {}}
  categories={localize(MOCK_CATEGORIES)}
  onSelect={(key) => {
    if (key === 'rent') setScreen('home-history');
  }}
/>
        <TenantQuickActions items={localize(QUICK_ACTIONS)} onSelect={handleQuickAction} />
      </ScrollView>

      <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 18, paddingBottom: 15, gap: 14 },
  centerBox: { paddingVertical: 30, alignItems: 'center' },
});