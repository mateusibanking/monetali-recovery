import { useMemo } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';

type Resource = 'clientes' | 'pagamentos' | 'comentarios' | 'dashboard' | 'premissas' | 'importacao';
type Action = 'read' | 'create' | 'update' | 'delete';

// Permission matrix — matches the roles defined in the DB
// This is a frontend mirror; the real enforcement is via RLS in Supabase
const PERMISSIONS: Record<UserRole, Record<string, Action[]>> = {
  admin: {
    clientes:     ['read', 'create', 'update', 'delete'],
    pagamentos:   ['read', 'create', 'update', 'delete'],
    comentarios:  ['read', 'create'],
    dashboard:    ['read'],
    premissas:    ['read', 'update'],
    importacao:   ['read', 'create'],
  },
  financeiro: {
    clientes:     ['read', 'create', 'update'],
    pagamentos:   ['read', 'create', 'update'],
    comentarios:  ['read', 'create'],
    dashboard:    ['read'],
    premissas:    ['read'],
    importacao:   ['read', 'create'],
  },
  juridico: {
    clientes:     ['read'],
    pagamentos:   ['read'],
    comentarios:  ['read', 'create'],
    dashboard:    ['read'],
    premissas:    ['read'],
    importacao:   ['read'],
  },
  cs: {
    clientes:     ['read'],
    pagamentos:   ['read'],
    comentarios:  ['read', 'create'],
    dashboard:    ['read'],
    premissas:    ['read'],
    importacao:   ['read'],
  },
  viewer: {
    clientes:     ['read'],
    pagamentos:   ['read'],
    comentarios:  ['read'],
    dashboard:    ['read'],
    premissas:    ['read'],
    importacao:   ['read'],
  },
};

/**
 * Hook to check if the current user has permission for a resource + action.
 * Returns `true` if allowed, `false` otherwise.
 * If profile is not loaded yet, returns `false` (safe default).
 */
export function usePermission(resource: Resource, action: Action): boolean {
  const { profile } = useAuth();

  return useMemo(() => {
    if (!profile || !profile.is_active) return false;
    const role = profile.role;
    const resourcePerms = PERMISSIONS[role]?.[resource];
    if (!resourcePerms) return false;
    return resourcePerms.includes(action);
  }, [profile, resource, action]);
}

/**
 * Hook that returns the current user's role.
 */
export function useRole(): UserRole | null {
  const { profile } = useAuth();
  return profile?.role ?? null;
}
