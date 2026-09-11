import { createContext, useCallback, useContext, useState } from 'react';
import { AuthContext } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import StatusModal from '../components/StatusModal';

const LogoutConfirmContext = createContext({
  requestLogout: () => {},
});

// Single, app-wide logout confirmation dialog. Any screen or component
// calls requestLogout() instead of AuthContext's logout() directly — this
// shows one shared modal centered on screen, and the real
// AuthProvider.logout() only runs if the user actually confirms. Every
// "logout" trigger in the app (Navbar's icon, its dropdown item,
// ProfileScreen's button, etc.) shares this one dialog, defined once.
export function LogoutConfirmProvider({ children }) {
  const { logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  const requestLogout = useCallback(() => {
    setVisible(true);
  }, []);

  function handleConfirm() {
    setVisible(false);
    logout();
  }

  function handleCancel() {
    setVisible(false);
  }

  return (
    <LogoutConfirmContext.Provider value={{ requestLogout }}>
      {children}

      <StatusModal
        visible={visible}
        type="error"
        icon="log-out-outline"
        title={t('logoutConfirm.title')}
        message={t('logoutConfirm.message')}
        actionLabel={t('logoutConfirm.confirm')}
        onAction={handleConfirm}
        secondaryLabel={t('logoutConfirm.cancel')}
        onSecondary={handleCancel}
        onRequestClose={handleCancel}
      />
    </LogoutConfirmContext.Provider>
  );
}

export function useLogoutConfirm() {
  return useContext(LogoutConfirmContext);
}