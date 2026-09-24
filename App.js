import { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AuthProvider, AuthContext } from './providers/AuthProvider';
import { InterfaceModeProvider, useInterfaceMode } from './providers/InterfaceModeProvider';
import { canAccessInterface } from './utils/accessControl';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import HomeScreen from './screens/HomeScreen';
import AddPropertyScreen from './screens/AddPropertyScreen';
import AddPropertyDetailsScreen from './screens/AddPropertyDetailsScreen';
import AddTenantsScreen from './screens/AddTenantsScreen';
import Navbar from './components/Navbar';
import BottomNavBar from './components/BottomNavBar';
import Sidebar, { menuItems } from './components/Sidebar';
import PlaceholderScreen from './components/PlaceholderScreen';
import { colors } from './theme';
import ManageBuildingScreen from './screens/ManageBuildingScreen';
import ProfileScreen from './screens/ProfileScreen';
import TenantListScreen from './screens/TenantListScreen';
import TenantDetailScreen from './screens/TenantDetailsScreen';
import BillGenerateScreen from './screens/BillGenerateScreen';
import ExploreScreen from './screens/ExploreScreen';
import { LanguageProvider, useLanguage } from './providers/LanguageProvider';
import BillCollectionScreen from './screens/BillCollectionScreen';
import { LogoutConfirmProvider } from './providers/LogoutConfirmProvider';

import { clearAllScrollOffsets } from './utils/scrollMemory';

import ExpenseListScreen from './screens/ExpenseListScreen';
import ExpenseCreateScreen from './screens/ExpenseCreateScreen';
import ReportScreen from './screens/ReportScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

import TenantHomeScreen from './screens/TenantHomeScreen';
import SocietyMemberScreen from './screens/SocietyMemberScreen';
import AccessDeniedScreen from './screens/AccessDeniedScreen';
import ComplainListScreen from './screens/ComplainListScreen';
import AddComplainScreen from './screens/AddComplainScreen';
import ConnectionRequestsScreen from './screens/ConnectionRequestsScreen';
import MyHomeHistoryScreen from './screens/TenantScreen/MyHomeHistoryScreen';
import ConnectedTenantsScreen from './screens/ConnectedTenantsScreen';

const titles = Object.fromEntries(menuItems.map((item) => [item.key, item.label]));
const MIN_SPLASH_DURATION = 1400;

function ActivityTracker({ children }) {
  const { recordActivity, loginData } = useContext(AuthContext);

  if (!loginData) {
    return children;
  }

  return (
    <View style={styles.flexFill} onTouchStart={recordActivity} onTouchMove={recordActivity}>
      {children}
    </View>
  );
}

function MainApp() {
  const { loginData, logout } = useContext(AuthContext);

  if (!canAccessInterface(loginData?.UserRoles, 'admin')) {
    return (
      <AccessDeniedScreen
        title="Access Restricted"
        message="This area is only available to Admin and SuperAdmin accounts."
        role={(loginData?.UserRoles || []).join(', ')}
        onLogout={logout}
      />
    );
  }

  const [screen, setScreen] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  const [presetPropertyId, setPresetPropertyId] = useState(null);

  function handleNavigate(screenKey, params) {
    if (screenKey === 'add-property-details') {
      setPresetPropertyId(params?.propertyId ?? null);
    } else {
      setPresetPropertyId(null);
    }
    setScreen(screenKey);
  }

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }
      if (screen === 'add-property') {
        handleNavigate('manage-building');
        return true;
      }
      if (screen === 'add-property-details') {
        handleNavigate('manage-building');
        return true;
      }
      if (screen === 'tenant-detail') {
        handleNavigate('tenant-list');
        return true;
      }
      if (screen === 'add-expense') {
        handleNavigate('expense-list');
        return true;
      }
      if (screen !== 'home') {
        handleNavigate('home');
        return true;
      }
      return false;
    });

    return () => handler.remove();
  }, [sidebarOpen, screen]);

  function renderScreen() {
    if (screen === 'home') {
      return <HomeScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'add-property') {
      return <AddPropertyScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'add-property-details') {
      return (
        <AddPropertyDetailsScreen
          presetPropertyId={presetPropertyId}
          onNavigate={handleNavigate}
        />
      );
    }
    if (screen === 'add-tenants') {
      return <AddTenantsScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'create-bill') {
      return <BillGenerateScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'bill-collection') {
      return <BillCollectionScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'expense-list') {
      return <ExpenseListScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'add-expense') {
      return <ExpenseCreateScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'report') {
      return <ReportScreen />;
    }
    if (screen === 'profile') {
      return <ProfileScreen />;
    }
    if (screen === 'manage-building') {
      return <ManageBuildingScreen onNavigate={handleNavigate} />;
    }
    if (screen === 'tenant-list') {
      return (
        <TenantListScreen
          onNavigate={handleNavigate}
          onSelectTenant={(id) => {
            setSelectedTenantId(id);
            handleNavigate('tenant-detail');
          }}
        />
      );
    }
    if (screen === 'tenant-detail') {
      return <TenantDetailScreen tenantId={selectedTenantId} />;
    }
    if (screen === 'complain') {
      return <ComplainListScreen mode="admin" onNavigate={handleNavigate} />;
    }
    if (screen === 'connection-requests') {
      return <ConnectionRequestsScreen />;
    }
    if (screen === 'connected-tenants') {
  return <ConnectedTenantsScreen onSelectTenant={(id) => { setSelectedTenantId(id); handleNavigate('tenant-detail'); }} />;
}
    if (screen === 'home-history') {
  return (
    <>
      <TenantNavbar onSelectMenu={handleNavbarSelect} />
      <MyHomeHistoryScreen uId={uId} />
      <TenantBottomNav currentScreen={activeTab} onSelect={handleNavbarSelect} />
    </>
  );
}
    return <PlaceholderScreen title={titles[screen] || screen} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <Navbar
        title={titles[screen] || 'PropHUB'}
        onMenuPress={() => setSidebarOpen(true)}
        onSelectMenu={(key) => handleNavigate(key)}
      />

      <View style={styles.body}>{renderScreen()}</View>

      <BottomNavBar currentScreen={screen} onSelect={(key) => handleNavigate(key)} />

      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentScreen={screen}
        onNavigate={(key) => handleNavigate(key)}
      />
    </SafeAreaView>
  );
}

function LoggedInRouter() {
  const { loginData, logout } = useContext(AuthContext);
  const { activeInterface, availableInterfaces } = useInterfaceMode();

  if (availableInterfaces.length === 0) {
    return (
      <AccessDeniedScreen
        title="Unrecognized Role"
        message="Your account doesn't have a recognized role assigned, so access can't be granted. Please contact an administrator."
        role={(loginData?.UserRoles || []).join(', ') || null}
        onLogout={logout}
      />
    );
  }

  if (activeInterface === 'admin') return <MainApp />;
  if (activeInterface === 'tenant') return <TenantHomeScreen />;
  if (activeInterface === 'societyMember') return <SocietyMemberScreen />;

  return <SplashScreen />;
}

function RootNavigator() {
  const { loginData, checkingSession } = useContext(AuthContext);

  const [authStack, setAuthStack] = useState(['explore']);
  const authScreen = authStack[authStack.length - 1];

  const [exploreView, setExploreView] = useState('home');

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fontsLoaded] = useFonts({
    'Manrope-Regular': require('./assets/fonts/Manrope-Regular.ttf'),
    'Manrope-Medium': require('./assets/fonts/Manrope-Medium.ttf'),
    'Manrope-SemiBold': require('./assets/fonts/Manrope-SemiBold.ttf'),
    'Manrope-Bold': require('./assets/fonts/Manrope-Bold.ttf'),
    'Manrope-ExtraBold': require('./assets/fonts/Manrope-ExtraBold.ttf'),
  });

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  function goToAuthScreen(screenKey) {
    setAuthStack((prev) => [...prev, screenKey]);
  }

  function goBackAuthScreen() {
    setAuthStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loginData) return false;

      if (authScreen === 'explore' && exploreView !== 'home') {
        setExploreView('home');
        return true;
      }

      if (authStack.length > 1) {
        goBackAuthScreen();
        return true;
      }

      return false;
    });

    return () => handler.remove();
  }, [loginData, authStack, authScreen, exploreView]);

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  if (checkingSession || !minTimeElapsed) {
    return <SplashScreen />;
  }

  if (loginData) {
    return <LoggedInRouter />;
  }

  if (authScreen === 'explore') {
    return (
      <ExploreScreen
        view={exploreView}
        onChangeView={setExploreView}
        onRequireLogin={() => goToAuthScreen('login')}
      />
    );
  }

  if (authScreen === 'register') {
    return <RegistrationScreen onNavigateToLogin={() => goToAuthScreen('login')} />;
  }

  if (authScreen === 'forgot-password') {
    return <ForgotPasswordScreen onBackToLogin={goBackAuthScreen} />;
  }

  return (
    <LoginScreen
      onNavigateToRegister={() => goToAuthScreen('register')}
      onForgotPassword={() => goToAuthScreen('forgot-password')}
    />
  );
}

function AuthWithLanguageReset({ children }) {
  const { resetLanguage } = useLanguage();
  function handleLogout() {
    resetLanguage();
    clearAllScrollOffsets();
  }
  return <AuthProvider onLogout={handleLogout}>{children}</AuthProvider>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthWithLanguageReset>
          <InterfaceModeProvider>
            <LogoutConfirmProvider>
              <ActivityTracker>
                <RootNavigator />
              </ActivityTracker>
            </LogoutConfirmProvider>
          </InterfaceModeProvider>
        </AuthWithLanguageReset>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  body: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});