// Central registry: which role name(s) unlock which top-level interface.
const INTERFACE_ROLES = {
  admin: ['admin', 'superadmin', 'owner'],
  tenant: ['tenant'],
  societyMember: ['societymember'],
};

// Priority order for picking the DEFAULT interface when a user has more
// than one — admin-family takes priority, since managing properties is
// treated as this app's "primary" identity.
const INTERFACE_PRIORITY = ['admin', 'tenant', 'societyMember'];

const SUPERADMIN = 'superadmin';

export function normalizeRole(role) {
  return (role || '').trim().toLowerCase();
}

// Every interface key the user's roles unlock. SuperAdmin unlocks ALL of
// them — "only SuperAdmin can visit every screen."
export function getAvailableInterfaces(userRoles) {
  const normalizedRoles = (userRoles || []).map(normalizeRole);
  if (normalizedRoles.includes(SUPERADMIN)) {
    return Object.keys(INTERFACE_ROLES);
  }
  return Object.entries(INTERFACE_ROLES)
    .filter(([, roles]) => roles.some((r) => normalizedRoles.includes(r)))
    .map(([key]) => key);
}

// The interface to land on right after login.
export function defaultInterfaceFor(userRoles) {
  const available = getAvailableInterfaces(userRoles);
  return INTERFACE_PRIORITY.find((key) => available.includes(key)) || null;
}

// Used by each protected screen's own internal defense-in-depth guard.
export function canAccessInterface(userRoles, interfaceKey) {
  return getAvailableInterfaces(userRoles).includes(interfaceKey);
}

export const INTERFACE_LABELS = {
  admin: 'Admin',
  tenant: 'Tenant',
  societyMember: 'Society Member',
};

export const INTERFACE_ICONS = {
  admin: 'business-outline',
  tenant: 'home-outline',
  societyMember: 'people-outline',
};