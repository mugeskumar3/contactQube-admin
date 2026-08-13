export const MODULE_ROUTES = [
  { path: '/dashboard', module: 'Dashboard' },
  { path: '/admins', module: 'Admin User', anyOf: ['Admin User', 'User Roles'] },
  { path: '/members', module: 'Members' },
  { path: '/plans', module: 'Plans' },
  { path: '/activities', module: 'Activities', anyOf: ['Activities', 'Banners'] },
  { path: '/banners', module: 'Banners' },
  { path: '/interactions', module: 'Interactions' },
  { path: '/reports', module: 'Reports' },
  { path: '/roles', module: 'User Roles' }
];

/**
 * Checks if the current logged-in user has permission for a specific module and action.
 * @param {string} moduleName - The name of the module (e.g., 'Admin User', 'Dashboard', 'Members', etc.)
 * @param {string} action - The action type ('view', 'add', 'edit', 'delete')
 * @returns {boolean} - True if permitted, false otherwise.
 */
export const hasPermission = (moduleName, action = 'view') => {
  try {
    const sessionRaw = localStorage.getItem('networth_admin_session');
    if (!sessionRaw) return false;

    const sessionData = JSON.parse(sessionRaw);
    if (!sessionData) return false;

    const sessionUser = sessionData.data || sessionData;

    // 1. ADMIN has all permissions
    const roleName = typeof sessionUser.role === 'object' ? sessionUser.role?.name : sessionUser.role;
    if (sessionUser.userType === 'ADMIN' || roleName === 'Admin' || roleName === 'ADMIN') {
      return true;
    }

    // 2. Check permissions array
    const permissions = sessionUser.permissions || [];
    const perm = permissions.find((p) => {
      const name = p.moduleName || p.module?.name;
      return name?.toLowerCase() === moduleName?.toLowerCase();
    });

    return !!perm?.actions?.[action];
  } catch (error) {
    console.error('Error checking permission:', error);
  }

  return false;
};

/**
 * Returns the first route path for which the user has 'view' permission.
 * Fallback is '/dashboard' if no modules are accessible.
 */
export const getFirstAccessibleRoute = () => {
  try {
    const sessionRaw = localStorage.getItem('networth_admin_session');
    if (!sessionRaw) return '/dashboard';

    const sessionData = JSON.parse(sessionRaw);
    if (!sessionData) return '/dashboard';

    const sessionUser = sessionData.data || sessionData;

    // ADMIN users default to dashboard
    const roleName = typeof sessionUser.role === 'object' ? sessionUser.role?.name : sessionUser.role;
    if (sessionUser.userType === 'ADMIN' || roleName === 'Admin' || roleName === 'ADMIN') {
      return '/dashboard';
    }

    // Find first module route where view action is true
    for (const item of MODULE_ROUTES) {
      if (item.anyOf) {
        if (item.anyOf.some(m => hasPermission(m, 'view'))) {
          return item.path;
        }
      } else if (hasPermission(item.module, 'view')) {
        return item.path;
      }
    }

    return '/dashboard';
  } catch (e) {
    return '/dashboard';
  }
};

