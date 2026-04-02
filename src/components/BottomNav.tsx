import { LayoutDashboard, AlertCircle, CheckCircle2, UserPlus, ClipboardList, TrendingUp, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Inadimplentes', url: '/inadimplentes', icon: AlertCircle },
  { title: 'Recuperações', url: '/recuperacoes', icon: CheckCircle2 },
  { title: 'Evolução', url: '/evolucao', icon: TrendingUp },
  { title: 'Atividades', url: '/atividades', icon: ClipboardList },
  { title: 'Cadastrar', url: '/cadastrar', icon: UserPlus },
  { title: 'Premissas', url: '/premissas', icon: Settings },
];

const BottomNav = () => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 flex items-center justify-around py-2 px-1">
    {navItems.map(item => (
      <NavLink
        key={item.url}
        to={item.url}
        end={item.url === '/'}
        className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[9px] text-muted-foreground transition-colors"
        activeClassName="text-accent"
      >
        <item.icon className="h-4 w-4" />
        <span>{item.title}</span>
      </NavLink>
    ))}
  </nav>
);

export default BottomNav;
