import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  UserCircle,
  FileText,
  Calendar,
  Award,
} from 'lucide-react';

// Single source of truth for role sets, used by NAV_ITEMS below, by App.jsx's route
// guards (RoleRoute), and by OnboardingTour. Previously each of those three places
// retyped the same role arrays independently, and they had already drifted out of sync
// (one entry here had 'hr_manager' in a different position than the other five identical
// sets) — a silent way for a page to be hidden from, or shown to, the wrong role.
export const ROLES = {
  admin: ['admin'],
  hr: ['admin', 'hr_manager'],
  hrAndPayroll: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user'],
  all: ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user', 'employee'],
};

// Single source of truth for top nav structure + role visibility, shared by the nav bar
// (App.jsx) and the first-login OnboardingTour so the tour never drifts from what a role
// can actually see.
export const NAV_ITEMS = [
  {
    path: '/users',
    label: 'Users',
    icon: UserCircle,
    roles: ROLES.admin,
    description: 'Create login accounts, assign roles, and manage access.',
  },
  {
    path: '/employees',
    label: 'Employees',
    icon: Users,
    roles: ROLES.hrAndPayroll,
    description: 'Browse, search, and manage employee records — list or kanban view.',
    children: [
      { path: '/employees', label: 'All Employees' },
      { path: '/employees/kanban', label: 'Kanban View' },
      { path: '/employees/new', label: '+ New Employee' },
      { path: '/department-requests', label: 'Department Requests', roles: ROLES.hr },
    ],
  },
  {
    path: '/contracts',
    label: 'Contracts',
    icon: FileText,
    roles: ROLES.hrAndPayroll,
    description: 'View and manage employment contracts, wages, and terms.',
    children: [
      { path: '/contracts', label: 'All Contracts' },
      { path: '/contracts/new', label: '+ New Contract' },
    ],
  },
  {
    path: '/schedules',
    label: 'Schedules',
    icon: Calendar,
    roles: ROLES.hrAndPayroll,
    description: 'Define working hours, shift patterns, and flexible schedules.',
    children: [
      { path: '/schedules', label: 'Working Schedules' },
      { path: '/schedules/new', label: '+ New Schedule' },
    ],
  },
  {
    path: '/attendance',
    label: 'Attendance',
    icon: Clock,
    roles: ROLES.all,
    description: 'Check in/out and track daily attendance for yourself or the team.',
    children: [
      { path: '/attendance', label: 'Attendance Log' },
      { path: '/attendance/check-in', label: 'Check In / Out' },
    ],
  },
  {
    path: '/time-off',
    label: 'Time Off',
    icon: CalendarDays,
    roles: ROLES.all,
    description: 'Request leave, view the team calendar, and manage approvals.',
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
    roles: ROLES.hrAndPayroll,
    description: 'Run payroll, manage salary structures, and view payslips.',
    children: [
      { path: '/payroll', label: 'Payruns' },
      { path: '/payroll/structures', label: 'Salary Structures' },
      { path: '/payroll/rules', label: 'Salary Rules' },
    ],
  },
  {
    path: '/performance',
    label: 'Performance',
    icon: Award,
    roles: ROLES.all,
    description: 'Score project performance and turn approved points into a payroll bonus.',
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ROLES.hrAndPayroll,
    description: 'Company-wide KPIs, charts, and warnings at a glance.',
  },
];
