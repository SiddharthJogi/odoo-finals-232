import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';

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
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
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
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Icon className="w-4 h-4" />
        {item.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
          {item.children.map((child) => (
            <Link
              key={child.path}
              to={child.path}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 text-sm transition-colors ${
                location.pathname === child.path
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
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
    <nav className="bg-slate-900 border-b border-slate-700/60 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[60px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-white font-extrabold text-base tracking-tight">
              PeoplePay<span className="text-blue-400">360</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 flex-1 ml-8">
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <UserCircle className="w-5 h-5 text-slate-400" />
                <div className="text-left">
                  <p className="text-xs text-white font-semibold leading-none">{user?.name || user?.email}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{user?.email}</p>
                </div>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_BADGE[role] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                  {role?.replace(/_/g, ' ')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                  <div className="px-4 py-3 border-b border-slate-700">
                    <p className="text-xs font-bold text-white">{user?.name || 'User'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
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
                    className={`block px-6 py-2 text-sm rounded-lg transition ${
                      location.pathname === child.path
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

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {isAuthenticated && <NavBar />}

      <main className={isAuthenticated ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Dev 1: Employees, Contracts, Schedules */}
          <Route path="/" element={<ProtectedRoute><Navigate to="/employees" replace /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
          <Route path="/employees/new" element={<ProtectedRoute><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/kanban" element={<ProtectedRoute><EmployeeKanban /></ProtectedRoute>} />
          <Route path="/employees/:id" element={<ProtectedRoute><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id/contracts" element={<ProtectedRoute><ContractHistory /></ProtectedRoute>} />
          
          <Route path="/contracts" element={<ProtectedRoute><ContractList /></ProtectedRoute>} />
          <Route path="/contracts/new" element={<ProtectedRoute><ContractForm /></ProtectedRoute>} />
          
          <Route path="/schedules" element={<ProtectedRoute><ScheduleList /></ProtectedRoute>} />
          <Route path="/schedules/new" element={<ProtectedRoute><ScheduleForm /></ProtectedRoute>} />
          <Route path="/schedules/:id" element={<ProtectedRoute><ScheduleForm /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />

          {/* Dev 2: Attendance & Time Off */}
          <Route path="/attendance" element={<ProtectedRoute><AttendanceList /></ProtectedRoute>} />
          <Route path="/attendance/check-in" element={<ProtectedRoute><CheckInWidget /></ProtectedRoute>} />
          <Route path="/time-off" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
          <Route path="/time-off/allocations" element={<ProtectedRoute><Allocations /></ProtectedRoute>} />
          <Route path="/time-off/types" element={<ProtectedRoute><Types /></ProtectedRoute>} />

          {/* Dev 3: Payroll */}
          <Route path="/payroll" element={<ProtectedRoute><PayrunWizard /></ProtectedRoute>} />
          <Route path="/payroll/structures" element={<ProtectedRoute><Structures /></ProtectedRoute>} />
          <Route path="/payroll/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
          <Route path="/payroll/payslips/:id" element={<ProtectedRoute><PayslipView /></ProtectedRoute>} />

          {/* Dev 4: Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isAuthenticated && <AiCopilotWidget />}
    </div>
  );
}
