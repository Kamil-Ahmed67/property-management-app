// "Current home" = Connected, active, and EndDate empty or in the future.
// Landlord-created tenancies carry the lease end date (e.g. 2028), so
// "!EndDate" alone is not enough to decide whether a home is current.
export function isHomeExpired(h) {
  return !!h?.EndDate && new Date(h.EndDate) <= new Date();
}

export function isActiveHome(h) {
  if (!h) return false;
  return h.IsActive !== false && h.ConnectionStatus === 'Connected' && !isHomeExpired(h);
}

// If more than one is active, the one with the latest StartDate wins.
export function pickActiveHome(homes = []) {
  return (
    homes
      .filter(isActiveHome)
      .sort((a, b) => new Date(b.StartDate) - new Date(a.StartDate))[0] || null
  );
}