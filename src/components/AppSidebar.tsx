import { useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Inadimplentes', url: '/inadimplentes', icon: AlertCircle },
  { title: 'Recuperações', url: '/recuperacoes', icon: CheckCircle2 },
  { title: 'Cadastrar', url: '/cadastrar', icon: UserPlus },
];

const AppSidebar = () => {
  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border/50 bg-card/50 backdrop-blur-xl min-h-screen shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border/50">
        <h1 className="text-lg font-bold">Monetali <span className="text-primary">/ VitBank</span></h1>
        <p className="text-xs text-muted-foreground mt-0.5">Controle de Inadimplência</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 text-xs text-muted-foreground">
        {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </aside>
  );
};

export default AppSidebar;
