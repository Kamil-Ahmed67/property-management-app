import { useCallback, useEffect, useState } from 'react';
import config from '../config';
import { pickActiveHome, isHomeExpired } from '../utils/tenancy';

const TENANT_ID = 'PropHub';

// Single source of truth for the tenant's current home — used by the
// dashboard card, the status banner and the complaint form, so all of
// them agree with the Residence History screen.
export function useActiveHome(uId) {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!uId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${config.BMS_API}api/GetMyHomeHistory?uId=${uId}`, {
        headers: { TenantId: TENANT_ID },
      });
      const data = await res.json().catch(() => null);
      setHomes(res.ok && Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.log('Failed to load homes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [uId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Connected active home first; otherwise a self-added home that
  // hasn't ended yet (not connected to a landlord).
  const home =
    pickActiveHome(homes) ||
    homes
      .filter((h) => h.IsActive !== false && !isHomeExpired(h))
      .sort((a, b) => new Date(b.StartDate) - new Date(a.StartDate))[0] ||
    null;

  return { home, homes, loading, reload };
}