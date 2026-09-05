import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';

// Module pages — Dev 1
import EmployeeList from './modules/employees/EmployeeList';
import EmployeeForm from './modules/employees/EmployeeForm';
import EmployeeKanban from './modules/employees/EmployeeKanban';
import ContractList from './modules/contracts/ContractList';
import ContractForm from './modules/contracts/ContractForm';
import ScheduleList from './modules/schedules/ScheduleList';
import ScheduleForm from './modules/schedules/ScheduleForm';

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

const NAV_ITEMS = [
  { path: '/employees', label: 'Employees', roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'] },
  { path: '/contracts', label: 'Contracts', roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'] },
  { path: '/schedules', label: 'Schedules', roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'] },
  { path: '/attendance', label: 'Attendance', roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user', 'employee'] },
  { path: '/time-off', label: 'Time Off', roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user', 'employee'] },
  { path: '/payroll', label: 'Payroll', roles: ['admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'] },
  { path: '/dashboard', label: 'Dashboard', roles: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'] },
];

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function NavBar() {
  const { user, logout, role } = useAuth();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              PeoplePay360
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {user?.email} <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs ml-1">{role}</span>
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <NavBar />}

      <main className={isAuthenticated ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6' : ''}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Dev 1: Employees, Contracts, Schedules */}
          <Route path="/" element={<ProtectedRoute><Navigate to="/employees" replace /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
          <Route path="/employees/new" element={<ProtectedRoute><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id" element={<ProtectedRoute><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/kanban" element={<ProtectedRoute><EmployeeKanban /></ProtectedRoute>} />
          
          <Route path="/contracts" element={<ProtectedRoute><ContractList /></ProtectedRoute>} />
          <Route path="/contracts/new" element={<ProtectedRoute><ContractForm /></ProtectedRoute>} />
          
          <Route path="/schedules" element={<ProtectedRoute><ScheduleList /></ProtectedRoute>} />
          <Route path="/schedules/new" element={<ProtectedRoute><ScheduleForm /></ProtectedRoute>} />
          <Route path="/schedules/:id" element={<ProtectedRoute><ScheduleForm /></ProtectedRoute>} />

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
    </div>
  );
}
