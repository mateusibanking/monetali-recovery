import { useState } from 'react';
import { MoreHorizontal, X, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { bottomNavItems, overflowNavItems } from '@/data/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BottomNav = () => {
  const [showMore, setShowMore] = useState(false);
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Overflow drawer backdrop */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowMore(false)} />
      )}

      {/* Overflow drawer */}
      {showMore && (
        <div className="md:hidden fixed bottom-[68px] left-2 right-2 z-50 bg-card border border-border/50 rounded-xl shadow-lg p-3 space-y-1 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mais opções</span>
            <button onClick={() => setShowMore(false)} className="p-1 rounded-lg hover:bg-secondary">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {overflowNavItems.map(item => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === '/'}
              className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary"
              activeClassName="text-accent bg-accent/10"
              onClick={() => setShowMore(false)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
          <div className="border-t border-border/50 mt-2 pt-2">
            {profile && (
              <p className="px-3 py-1 text-xs text-muted-foreground truncate">
                {profile.full_name || profile.email}
              </p>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-destructive/80 hover:bg-secondary transition-colors w-full"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 flex items-center justify-around py-1.5 px-1 safe-area-bottom">
        {bottomNavItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg text-[11px] text-muted-foreground transition-colors"
            activeClassName="text-accent"
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate max-w-[56px]">{item.title}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg text-[11px] text-muted-foreground transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
};

export default BottomNav;
