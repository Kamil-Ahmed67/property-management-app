import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import config from '../config';

export const AuthContext = createContext();

const TENANT_ID = 'PropHub';
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000;   // refresh 60s before expiry
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 min idle → logout
const RETRY_DELAY_MS = 10 * 1000;             // retry refresh after 10s on failure
const MAX_REFRESH_RETRIES = 3;                // give up after 3 consecutive failures

// Fetches the caller's role list from the new CentralAPI endpoint and
// returns it as a plain array of role-name strings, e.g. ['Tenant',
// 'SocietyMember']. Never throws — a failed fetch just yields an empty
// array, so a role-service hiccup doesn't block login/refresh entirely.
async function fetchUserRoles(uId, token) {
  try {
    const response = await fetch(`${config.API_BASE_URL}api/GetUserRoles?uId=${uId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        TenantId: TENANT_ID,
      },
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.success) {
      return (data.data || []).map((r) => r.UserRole).filter(Boolean);
    }
    console.log('[Auth] Could not fetch user roles — status:', response.status);
    return [];
  } catch (err) {
    console.log('[Auth] Failed to fetch user roles:', err.message);
    return [];
  }
}

export const AuthProvider = ({ children, onLogout }) => {
  const [loginData, setLoginData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // No AsyncStorage restore step anymore — the session lives only in memory,
  // so there's nothing to check on startup. Kept as `false` immediately so
  // App.js's splash/loading logic doesn't need to change.
  const [checkingSession] = useState(false);

  const refreshTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const refreshRetriesRef = useRef(0);
  const hasInteractedRef = useRef(false);

  // Mirrors the web version's `fn` ref bag: timers created earlier must call
  // the CURRENT version of these functions, not a stale closure from the
  // render where the timer was set.
  const fn = useRef({
    logout: async () => {},
    scheduleRefresh: () => {},
    attemptRefresh: async () => {},
  });

  // In-memory session — deliberately NOT written to AsyncStorage. Closing or
  // killing the app clears this along with the rest of the JS process's
  // memory, which is what forces a fresh login every time the app is
  // actually closed (not just backgrounded briefly).
  const sessionRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const recordActivity = useCallback(() => {
    hasInteractedRef.current = true;

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      console.log('[Auth] Logging out — 15 minutes of inactivity.');
      fn.current.logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, []);
  const logout = useCallback(async () => {
    clearAllTimers();
    const current = sessionRef.current;

    if (current?.refreshToken) {
      try {
        await fetch(
          `${config.API_BASE_URL}api/LogoutUser?rToken=${encodeURIComponent(current.refreshToken)}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${current.token}`,
              TenantId: TENANT_ID,
            },
          }
        );
      } catch (e) {
        // Best-effort — proceed with local logout regardless of network state.
      }
    }

    sessionRef.current = null;
    refreshRetriesRef.current = 0;
    hasInteractedRef.current = false;
    setLoginData(null);
    onLogout?.();
  }, [clearAllTimers, onLogout]);
  const scheduleRefresh = useCallback((expiration) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const msUntilRefresh =
      new Date(expiration).getTime() - Date.now() - REFRESH_BEFORE_EXPIRY_MS;

    if (msUntilRefresh <= 0) {
      fn.current.attemptRefresh();
      return;
    }

    console.log(`[Refresh] Scheduled in ${Math.round(msUntilRefresh / 1000)}s`);

    refreshTimerRef.current = setTimeout(() => {
      fn.current.attemptRefresh();
    }, msUntilRefresh);
  }, []);

  const attemptRefresh = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.refreshToken) return;

    if (!hasInteractedRef.current) {
      console.log('[Refresh] Skipped — no user activity since last token issue.');
      // The inactivity timer handles logout at 15 min; nothing to reschedule.
      return;
    }

    hasInteractedRef.current = false;

    try {
      const response = await fetch(
        `${config.API_BASE_URL}api/RefreshUserToken?rToken=${encodeURIComponent(current.refreshToken)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${current.token}`,
            TenantId: TENANT_ID,
          },
        }
      );

      if (!response.ok) {
        console.log('[Refresh] Failed with status:', response.status);
        refreshRetriesRef.current += 1;

        if (refreshRetriesRef.current >= MAX_REFRESH_RETRIES) {
          console.log('[Refresh] Max retries reached — logging out.');
          await fn.current.logout();
          return;
        }

        console.log(
          `[Refresh] Retry ${refreshRetriesRef.current}/${MAX_REFRESH_RETRIES} in ${RETRY_DELAY_MS / 1000}s`
        );
        refreshTimerRef.current = setTimeout(() => {
          hasInteractedRef.current = true; // let the retry actually fire
          fn.current.attemptRefresh();
        }, RETRY_DELAY_MS);
        return;
      }

      refreshRetriesRef.current = 0;

      const data = await response.json();

      // Re-fetch roles on every rotation too — not just at initial login —
      // so a role change made while the user stays logged in (e.g. an
      // admin grants them a new role) is picked up on the next refresh
      // rather than requiring a full logout/login cycle.
      const userRoles = await fetchUserRoles(data.userData.Id, data.accessToken);

      const updatedLoginData = {
        ...data.userData,
        UserRoles: userRoles,
        tenantId: TENANT_ID,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        expiration: data.expiration,
      };

      sessionRef.current = updatedLoginData;
      setLoginData(updatedLoginData);
      fn.current.scheduleRefresh(data.expiration);

      console.log('[Refresh] ✅ Token rotated. Next expiry:', data.expiration);
    } catch (err) {
      console.log('[Refresh] Network error — will retry:', err.message);
      refreshRetriesRef.current += 1;

      if (refreshRetriesRef.current < MAX_REFRESH_RETRIES) {
        refreshTimerRef.current = setTimeout(() => {
          hasInteractedRef.current = true;
          fn.current.attemptRefresh();
        }, RETRY_DELAY_MS);
      } else {
        console.log('[Refresh] Max retries after network errors — logging out.');
        await fn.current.logout();
      }
    }
  }, []);

  // Keep the fn bag pointed at the latest function instances every render.
  useEffect(() => {
    fn.current.logout = logout;
    fn.current.scheduleRefresh = scheduleRefresh;
    fn.current.attemptRefresh = attemptRefresh;
  });

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const login = async (phone, password) => {
    setLoading(true);
    setError('');

    if (!phone || !password) {
      setError('Phone number and password are required');
      setLoading(false);
      return false;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}api/LoginUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({ Phone: phone, Password: password }),
      });

      console.log('Login response status:', response.status);

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(`Server returned an unexpected response (status ${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data?.message || `Login failed (status ${response.status}).`);
      }

      const { accessToken: token, refreshToken, expiration, userData } = data;

      // Separate call, right after login succeeds — using the just-issued
      // token and the account Id login already returned.
      const userRoles = await fetchUserRoles(userData.Id, token);

      const updatedLoginData = {
        ...userData,
        UserRoles: userRoles,
        tenantId: TENANT_ID,
        token,
        refreshToken,
        expiration,
      };

      sessionRef.current = updatedLoginData;
      refreshRetriesRef.current = 0;
      setLoginData(updatedLoginData);

      recordActivity();
      fn.current.scheduleRefresh(expiration);

      console.log('[Auth] ✅ Logged in. Token expires:', expiration, '— Roles:', userRoles);
      return true;
    } catch (err) {
      console.log('Login error:', err.message);
      if (err.message === 'Network request failed') {
        setError('Could not reach the server — check your internet connection');
      } else {
        setError(err.message || 'Invalid credentials, please try again later.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    loginData,
    login,
    logout,
    loading,
    error,
    checkingSession,
    recordActivity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};