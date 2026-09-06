import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import Sidebar from './components/Sidebar';

// Module pages — Dev 1
import EmployeeList from './modules/employees/EmployeeList';
import EmployeeForm from './modules/employees/EmployeeForm';
import EmployeeKanban from './modules/employees/EmployeeKanban';
import ContractHistory from './modules/employees/ContractHistory';
import DepartmentRequests from './modules/employees/DepartmentRequests';
import ContractList from './modules/contracts/ContractList';
import ContractForm from './modules/contracts/ContractForm';
import ScheduleList from './modules/schedules/ScheduleList';
import ScheduleForm from './modules/schedules/ScheduleForm';
import UserManagement from './modules/users/UserManagement';
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
import PerformancePage from './modules/performance/PerformancePage';

// Module pages — Dev 4
import Dashboard from './modules/dashboard/Dashboard';
import AiCopilotWidget from './components/AiCopilotWidget';

import { ROLES } from './navConfig';
import OnboardingTour from './components/OnboardingTour';

const SAFE_REDIRECTS = {
  employee: '/attendance/check-in',
  default: '/dashboard',
};

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
      <div className={isAuthenticated ? 'md:flex' : ''}>
        {isAuthenticated && <Sidebar />}

        <main className={isAuthenticated ? 'flex-1 min-w-0 max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 py-8' : ''}>
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
            <Route path="/department-requests" element={<RoleRoute roles={ROLES.hr}><AnimatedRoute><DepartmentRequests /></AnimatedRoute></RoleRoute>} />

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
            <Route path="/payroll" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><PayrunWizard /></AnimatedRoute></RoleRoute>} />
            <Route path="/payroll/structures" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><Structures /></AnimatedRoute></RoleRoute>} />
            <Route path="/payroll/rules" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><Rules /></AnimatedRoute></RoleRoute>} />
            <Route path="/payroll/payslips/:id" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><PayslipView /></AnimatedRoute></RoleRoute>} />
            <Route path="/performance" element={<RoleRoute roles={ROLES.all}><AnimatedRoute><PerformancePage /></AnimatedRoute></RoleRoute>} />

            {/* Dev 4: Dashboard */}
            <Route path="/dashboard" element={<RoleRoute roles={ROLES.hrAndPayroll}><AnimatedRoute><Dashboard /></AnimatedRoute></RoleRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {isAuthenticated && <AiCopilotWidget />}
      {isAuthenticated && <OnboardingTour />}
    </div>
  );
}
