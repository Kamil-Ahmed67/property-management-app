import { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AuthProvider, AuthContext } from './providers/AuthProvider';
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
  const [screen, setScreen] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  // Carries an optional propertyId when navigating to add-property-details,
  // so that screen can pre-select and lock the Property field. Any
  // navigation to a DIFFERENT screen — or to add-property-details without a
  // propertyId (e.g. via the sidebar/home grid) — clears it, so a stale
  // lock from a previous visit never leaks into an unrelated navigation.
  const [presetPropertyId, setPresetPropertyId] = useState(null);

  function handleNavigate(screenKey, params) {
    if (screenKey === 'add-property-details') {
      setPresetPropertyId(params?.propertyId ?? null);
    } else {
      setPresetPropertyId(null);
    }
    setScreen(screenKey);
  }

  // Android hardware/gesture back button listener
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }

      // Redirect back to manage-building when pressing back on add-property
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

function RootNavigator() {
  const { loginData, checkingSession } = useContext(AuthContext);

  // Stack of auth-flow screens visited so far. Hardware back always pops
  // to whichever screen the user actually came from — not a hardcoded
  // destination — so Explore -> Login -> back lands on Explore,
  // while Explore -> Register -> back lands on Explore too.
  const [authStack, setAuthStack] = useState(['explore']);
  const authScreen = authStack[authStack.length - 1];

  // Explore's own sub-view (my-property / find-property / find-service) is
  // lifted up here instead of living inside ExploreScreen, so it survives
  // ExploreScreen being unmounted while the user is sent to Login and back.
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
      if (loginData) return false; // MainApp has its own back handler

      // Inside Explore, drilled into a sub-view — step back to Explore's
      // own home screen first, before touching the auth-flow stack.
      if (authScreen === 'explore' && exploreView !== 'home') {
        setExploreView('home');
        return true;
      }

      // Otherwise pop the auth-flow stack back to the previous screen.
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
    return <MainApp />;
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
          <LogoutConfirmProvider>
            <ActivityTracker>
              <RootNavigator />
            </ActivityTracker>
          </LogoutConfirmProvider>
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