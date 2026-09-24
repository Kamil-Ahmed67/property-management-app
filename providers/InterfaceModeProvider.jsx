import { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthProvider';
import { getAvailableInterfaces, defaultInterfaceFor } from '../utils/accessControl';

const InterfaceModeContext = createContext();

export function InterfaceModeProvider({ children }) {
  const { loginData } = useContext(AuthContext);
  const [activeInterface, setActiveInterface] = useState(null);

  const availableInterfaces = getAvailableInterfaces(loginData?.UserRoles);

  // Whenever login state changes (fresh login, or logout clearing it),
  // reset to that user's own default interface. In-memory only, matching
  // this app's existing "nothing survives a real logout" pattern.
  useEffect(() => {
    if (loginData) {
      setActiveInterface(defaultInterfaceFor(loginData.UserRoles));
    } else {
      setActiveInterface(null);
    }
  }, [loginData]);

  const value = { activeInterface, setActiveInterface, availableInterfaces };

  return (
    <InterfaceModeContext.Provider value={value}>
      {children}
    </InterfaceModeContext.Provider>
  );
}

export function useInterfaceMode() {
  return useContext(InterfaceModeContext);
}