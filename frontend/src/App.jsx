import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './auth/AuthContext';
import client from './api/client';
import LoginPage from './auth/LoginPage';
import { cn } from './lib/utils';

// Module pages — Dev 1
import EmployeeList from './modules/employees/EmployeeList';
import EmployeeForm from './modules/employees/EmployeeForm';
import EmployeeKanban from './modules/employees/EmployeeKanban';
import ContractHistory from './modules/employees/ContractHistory';
import ContractList from './modules/contracts/ContractList';
import ContractForm from './modules/contracts/ContractForm';
import ScheduleList from './modules/schedules/ScheduleList';
import ScheduleForm from './modules/schedules/ScheduleForm';
import UserManagement from './modules/users/UserManagement';
import logo from '../assets/logo.png';
import ChangePassword from './auth/ChangePassword';

// Module pages — Dev 2
import AttendanceList from './modules/attendance/AttendanceList';
import CheckInWidget from './modules/attendance/CheckInWidget';
import Requests from './modules/time-off/Requests';
import Allocations from './modules/time-off/Allocations';
import Types from './modules/time-off/Types';

// Module pages — Dev 3
import PayrunWizard from './modules/payroll/PayrunWizard';
import PayslipView from './modules/payroll/PayslipView';
import Structures from './modules/payroll/Structures';
import Rules from './modules/payroll/Rules';

// Module pages — Dev 4
import Dashboard from './modules/dashboard/Dashboard';
import AiCopilotWidget from './components/AiCopilotWidget';

import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  ChevronDown,
  Menu,
  X,
  LogOut,
  UserCircle,
  KeyRound,
  Sparkles,
  FileText,
  Calendar,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    path: '/users',
    label: 'Users',
    icon: UserCircle,
    roles: ['admin'],
  },
  {
    path: '/employees',
    label: 'Employees',
    icon: Users,
    roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'],
    children: [
      { path: '/employees', label: 'All Employees' },
      { path: '/employees/kanban', label: 'Kanban View' },
      { path: '/employees/new', label: '+ New Employee' },
    ],
  },
  {
    path: '/contracts',
    label: 'Contracts',
    icon: FileText,
    roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'],
    children: [
      { path: '/contracts', label: 'All Contracts' },
      { path: '/contracts/new', label: '+ New Contract' },
    ],
  },
  {
    path: '/schedules',
    label: 'Schedules',
    icon: Calendar,
    roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'],
    children: [
      { path: '/schedules', label: 'Working Schedules' },
      { path: '/schedules/new', label: '+ New Schedule' },
    ],
  },
  {
    path: '/attendance',
    label: 'Attendance',
    icon: Clock,
    roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user', 'employee'],
    children: [
      { path: '/attendance', label: 'Attendance Log' },
      { path: '/attendance/check-in', label: 'Check In / Out' },
    ],
  },
  {
    path: '/time-off',
    label: 'Time Off',
    icon: CalendarDays,
    roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user', 'employee'],
    children: [
      { path: '/time-off', label: 'Requests' },
      { path: '/time-off/allocations', label: 'Allocations' },
      { path: '/time-off/types', label: 'Leave Types' },
    ],
  },
  {
    path: '/payroll',
    label: 'Payroll',
    icon: DollarSign,
    roles: ['admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'],
    children: [
      { path: '/payroll', label: 'Payruns' },
      { path: '/payroll/structures', label: 'Salary Structures' },
      { path: '/payroll/rules', label: 'Salary Rules' },
    ],
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'],
  },
];

const ROLE_BADGE = {
  admin: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
  hr_manager: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
  hr_payroll_manager: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  hr_payroll_user: 'bg-sky-900/40 text-sky-300 border-sky-700/50',
  employee: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
};

const ROLES = {
  admin: ['admin'],
  hr: ['admin', 'hr_manager'],
  hrAndPayroll: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'],
  payroll: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'],
  all: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user', 'employee'],
};

const SAFE_REDIRECTS = {
  employee: '/attendance/check-in',
  default: '/dashboard',
};

function DropdownMenu({ item, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!item.children) {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className="w-4 h-4" />
        {item.label}
      </Link>
    );
  }

  const Icon = item.icon;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className="w-4 h-4" />
        {item.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 py-1"
          >
            {item.children.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-2.5 text-sm transition-colors",
                  location.pathname === child.path
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavBar() {
  const { user, logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="w-full bg-background/80 backdrop-blur-lg border-b border-border shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[64px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 shrink-0 group">
            <img
              src={logo}
              alt="PeoplePay360 logo"
              className="w-9 h-9 rounded-xl object-cover shadow-md shadow-primary/20 group-hover:scale-105 transition-transform"
            />
            <span className="text-foreground font-extrabold text-lg tracking-tight">
              PeoplePay<span className="text-primary/70">360</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4 flex-1 ml-8">
            {visibleItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return <DropdownMenu key={item.path} item={item} isActive={isActive} />;
            })}
          </div>

          {/* Right: User Info + Hamburger */}
          <div className="flex items-center gap-3">
            {/* User Menu Desktop */}
            <div ref={userMenuRef} className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted border border-border transition-colors"
              >
                <UserCircle className="w-6 h-6 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm text-foreground font-semibold leading-none">{user?.name || user?.email}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-none">{user?.email}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 py-1"
                  >
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-sm font-bold text-foreground">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                      <div className="mt-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        {role?.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/change-password'); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted transition text-left font-medium border-b border-border"
                    >
                      <KeyRound className="w-4 h-4 text-muted-foreground" />
                      Change Password
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition text-left font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-700 px-4 pt-3 pb-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.path}>
                <p className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </p>
                {(item.children || [{ path: item.path, label: item.label }]).map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-6 py-2 text-sm rounded-lg transition ${location.pathname === child.path
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            );
          })}
          <div className="border-t border-slate-700 pt-3 mt-3">
            <button
              onClick={() => { setMobileOpen(false); navigate('/change-password'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition text-left"
            >
              <KeyRound className="w-4 h-4" />
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ roles, children }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) {
    return <Navigate to={SAFE_REDIRECTS[role] || SAFE_REDIRECTS.default} replace />;
  }

  return children;
}

function AnimatedRoute({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      {isAuthenticated && <NavBar />}

      <main className={isAuthenticated ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<AnimatedRoute><LoginPage /></AnimatedRoute>} />
            <Route path="/change-password" element={<ProtectedRoute><AnimatedRoute><ChangePassword /></AnimatedRoute></ProtectedRoute>} />

            {/* Dev 1: Employees, Contracts, Schedules */}
            <Route path="/" element={<ProtectedRoute><AnimatedRoute><Navigate to="/employees" replace /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/employees" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><EmployeeList /></AnimatedRoute></RoleRoute>} />
            <Route path="/employees/new" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><EmployeeForm /></AnimatedRoute></RoleRoute>} />
            <Route path="/employees/kanban" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><EmployeeKanban /></AnimatedRoute></RoleRoute>} />
            <Route path="/employees/:id" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><EmployeeForm /></AnimatedRoute></RoleRoute>} />
            <Route path="/employees/:id/contracts" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><ContractHistory /></AnimatedRoute></RoleRoute>} />

            <Route path="/contracts" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><ContractList /></AnimatedRoute></RoleRoute>} />
            <Route path="/contracts/new" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><ContractForm /></AnimatedRoute></RoleRoute>} />
            <Route path="/contracts/:id" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><ContractForm /></AnimatedRoute></RoleRoute>} />

            <Route path="/schedules" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><ScheduleList /></AnimatedRoute></RoleRoute>} />
            <Route path="/schedules/new" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><ScheduleForm /></AnimatedRoute></RoleRoute>} />
            <Route path="/schedules/:id" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><ScheduleForm /></AnimatedRoute></RoleRoute>} />
            <Route path="/users" element={<RoleRoute roles={ROLES.admin}><AnimatedRoute><UserManagement /></AnimatedRoute></RoleRoute>} />

            {/* Dev 2: Attendance & Time Off */}
            <Route path="/attendance" element={<RoleRoute roles={ROLES.all}><AnimatedRoute><AttendanceList /></AnimatedRoute></RoleRoute>} />
            <Route path="/attendance/check-in" element={<RoleRoute roles={ROLES.all}><AnimatedRoute><CheckInWidget /></AnimatedRoute></RoleRoute>} />
            <Route path="/time-off" element={<RoleRoute roles={ROLES.all}><AnimatedRoute><Requests /></AnimatedRoute></RoleRoute>} />
            <Route path="/time-off/allocations" element={<RoleRoute roles={ROLES.all}><AnimatedRoute><Allocations /></AnimatedRoute></RoleRoute>} />
            <Route path="/time-off/types" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><Types /></AnimatedRoute></RoleRoute>} />

            {/* Dev 3: Payroll */}
            <Route path="/payroll" element={<RoleRoute roles={ROLES.payroll}><AnimatedRoute><PayrunWizard /></AnimatedRoute></RoleRoute>} />
            <Route path="/payroll/structures" element={<RoleRoute roles={ROLES.payroll}><AnimatedRoute><Structures /></AnimatedRoute></RoleRoute>} />
            <Route path="/payroll/rules" element={<RoleRoute roles={ROLES.payroll}><AnimatedRoute><Rules /></AnimatedRoute></RoleRoute>} />
            <Route path="/payroll/payslips/:id" element={<RoleRoute roles={ROLES.payroll}><AnimatedRoute><PayslipView /></AnimatedRoute></RoleRoute>} />

            {/* Dev 4: Dashboard */}
            <Route path="/dashboard" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><Dashboard /></AnimatedRoute></RoleRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {isAuthenticated && <AiCopilotWidget />}
    </div>
  );
}
