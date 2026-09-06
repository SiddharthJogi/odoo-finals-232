import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu, X, LogOut, UserCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/utils';
import { NAV_ITEMS } from '../navConfig';
import logo from '../../assets/logo.png';

function SidebarNavItem({ item, role, onNavigate }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(item.path);
  const visibleChildren = (item.children || []).filter((c) => !c.roles || c.roles.includes(role));
  const [open, setOpen] = useState(isActive);
  const Icon = item.icon;

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (!item.children) {
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform shrink-0', open ? 'rotate-180' : '')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-1 mb-1 pl-3 border-l border-border space-y-0.5">
              {visibleChildren.map((child) => {
                const childActive = location.pathname === child.path;
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={onNavigate}
                    className={cn(
                      'block px-3 py-2 rounded-lg text-sm transition-colors',
                      childActive
                        ? 'bg-muted text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({ role, user, onNavigate, onLogout, navigate }) {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border shrink-0">
        <img
          src={logo}
          alt="PeoplePay360 logo"
          className="w-9 h-9 rounded-xl object-cover shadow-md shadow-primary/20"
        />
        <span className="text-foreground font-extrabold text-lg tracking-tight">
          PeoplePay<span className="text-primary/70">360</span>
        </span>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <SidebarNavItem key={item.path} item={item} role={role} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-border p-3 shrink-0 space-y-1">
        <div className="flex items-center gap-2 px-2 py-2">
          <UserCircle className="w-8 h-8 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name || user?.email}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { onNavigate?.(); navigate('/change-password'); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition text-left font-medium"
        >
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          Change Password
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition text-left font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:sticky md:top-0 md:h-screen border-r border-border bg-background/80 backdrop-blur-lg">
        <SidebarContent role={role} user={user} onLogout={handleLogout} navigate={navigate} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-background/80 backdrop-blur-lg">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="PeoplePay360 logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-foreground font-extrabold text-base tracking-tight">
            PeoplePay<span className="text-primary/70">360</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-card border-r border-border z-50 md:hidden flex flex-col"
            >
              <div className="flex justify-end p-2 border-b border-border shrink-0">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent
                role={role}
                user={user}
                onNavigate={() => setMobileOpen(false)}
                onLogout={() => { setMobileOpen(false); handleLogout(); }}
                navigate={navigate}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
