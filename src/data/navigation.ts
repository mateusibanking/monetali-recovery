import { LayoutDashboard, AlertCircle, CheckCircle2, UserPlus, ClipboardList, TrendingUp, Settings, Upload, BarChart2, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/contexts/AuthContext';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Whether to show this item in the mobile bottom nav (max 5 visible) */
  showInBottomNav?: boolean;
  /** If set, only users with one of these roles see this item */
  roles?: UserRole[];
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, showInBottomNav: true },
  { title: 'Sincronização', url: '/sincronizacao', icon: RefreshCw, roles: ['admin'] },
  { title: 'Inadimplentes', url: '/inadimplentes', icon: AlertCircle, showInBottomNav: true },
  { title: 'Recuperações', url: '/recuperacoes', icon: CheckCircle2, showInBottomNav: true },
  { title: 'Evolução', url: '/evolucao', icon: TrendingUp, showInBottomNav: true },
  { title: 'Atividades', url: '/atividades', icon: ClipboardList },
  { title: 'Cadastrar', url: '/cadastrar', icon: UserPlus },
  { title: 'Importação', url: '/importacao', icon: Upload },
  { title: 'Premissas', url: '/premissas', icon: Settings },
  { title: 'Dashboard Financeiro', url: '/dashboard-financeiro', icon: BarChart2 },
];

export const bottomNavItems = navItems.filter(item => item.showInBottomNav);
export const overflowNavItems = navItems.filter(item => !item.showInBottomNav);
