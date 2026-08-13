import React from 'react';
import AccessDenied from './AccessDenied';
import { hasPermission } from '../utils/permission';

export default function ProtectedRoute({ moduleName, anyOf, children }) {
  const sessionRaw = localStorage.getItem('networth_admin_session');
  if (!sessionRaw) {
    return <AccessDenied />;
  }

  // Support checking multiple module names — access granted if ANY match
  const moduleNames = anyOf || (moduleName ? [moduleName] : []);
  const allowed = moduleNames.some(m => hasPermission(m, 'view'));

  if (allowed) {
    return children;
  }

  return <AccessDenied />;
}
