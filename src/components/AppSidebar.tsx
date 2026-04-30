import { NavLink } from '@/components/NavLink';
import MonetaliLogo from '@/components/MonetaliLogo';
import { navItems } from '@/data/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  financeiro: 'Financeiro',
  juridico: 'Jurídico',
  cs: 'CS',
  viewer: 'Visualizador',
};

const AppSidebar = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground min-h-screen shrink-0 fixed top-0 left-0 h-screen overflow-y-auto z-40">
      <div className="p-5 border-b border-sidebar-border flex flex-col items-center">
        <MonetaliLogo />
        <p className="text-[10px] text-[hsl(var(--sidebar-muted))] mt-2 tracking-wider uppercase">Controle de Inadimplência</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems
          .filter(item => !item.roles || (profile && item.roles.includes(profile.role)))
          .map(item => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === '/'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--sidebar-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {profile && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-sidebar-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[10px] text-[hsl(var(--sidebar-muted))] uppercase tracking-wider">
                {roleLabels[profile.role] || profile.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-[hsl(var(--sidebar-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
