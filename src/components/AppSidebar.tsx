import { useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, CheckCircle2, UserPlus, ClipboardList, TrendingUp } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Inadimplentes', url: '/inadimplentes', icon: AlertCircle },
  { title: 'Recuperações', url: '/recuperacoes', icon: CheckCircle2 },
  { title: 'Evolução', url: '/evolucao', icon: TrendingUp },
  { title: 'Atividades', url: '/atividades', icon: ClipboardList },
  { title: 'Cadastrar', url: '/cadastrar', icon: UserPlus },
];

const AppSidebar = () => {
  return (
    <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground min-h-screen shrink-0">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-bold text-sidebar-foreground">Monetali <span className="text-sidebar-primary">/ VitBank</span></h1>
        <p className="text-xs text-[hsl(var(--sidebar-muted))] mt-0.5">Controle de Inadimplência</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--sidebar-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-foreground font-semibold"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border text-xs text-[hsl(var(--sidebar-muted))]">
        {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </aside>
  );
};

export default AppSidebar;