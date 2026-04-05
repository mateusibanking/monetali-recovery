import { LayoutDashboard, AlertCircle, CheckCircle2, UserPlus, ClipboardList, TrendingUp, Settings, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Whether to show this item in the mobile bottom nav (max 5 visible) */
  showInBottomNav?: boolean;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, showInBottomNav: true },
  { title: 'Inadimplentes', url: '/inadimplentes', icon: AlertCircle, showInBottomNav: true },
  { title: 'Recuperações', url: '/recuperacoes', icon: CheckCircle2, showInBottomNav: true },
  { title: 'Evolução', url: '/evolucao', icon: TrendingUp, showInBottomNav: true },
  { title: 'Atividades', url: '/atividades', icon: ClipboardList },
  { title: 'Cadastrar', url: '/cadastrar', icon: UserPlus },
  { title: 'Importação', url: '/importacao', icon: Upload },
  { title: 'Premissas', url: '/premissas', icon: Settings },
];

export const bottomNavItems = navItems.filter(item => item.showInBottomNav);
export const overflowNavItems = navItems.filter(item => !item.showInBottomNav);
