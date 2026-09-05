import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { Users, List, Briefcase, RefreshCw, UserCheck, UserX } from 'lucide-react';

const DEPARTMENT_COLUMNS = [
  { key: 'finance', label: 'Finance', color: 'from-emerald-500 to-teal-600' },
  { key: 'hr', label: 'HR', color: 'from-amber-500 to-orange-600' },
  { key: 'engineering', label: 'Engineering', color: 'from-blue-500 to-indigo-600' },
];

const TYPE_STYLES = {
  full_time: 'bg-blue-50 text-blue-700 border border-blue-200',
  part_time: 'bg-amber-50 text-amber-700 border border-amber-200',
  contract: 'bg-purple-50 text-purple-700 border border-purple-200',
};

function SkeletonCard() {
  return (
    <div className="animate-pulse p-4 rounded-xl border border-gray-200 bg-white space-y-2">
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="h-3 bg-gray-50 rounded w-1/2" />
      <div className="h-5 bg-gray-100 rounded-full w-16 mt-2" />
    </div>
  );
}

export default function EmployeeKanban() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeType, setEmployeeType] = useState('');
  const [assignment, setAssignment] = useState('');

  const fetchEmployees = () => {
    setLoading(true);
    const params = new URLSearchParams({ all: 'true' });
    if (employeeType) params.set('employee_type', employeeType);
    if (assignment) params.set('assignment', assignment);
    client.get(`/employees?${params.toString()}`)
      .then(({ data }) => setEmployees(data.employees || data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, [employeeType, assignment]);

  const getDepartmentKey = (employee) => {
    const department = (employee.department_name || '').toLowerCase();
    if (department.includes('finance')) return 'finance';
    if (department.includes('human') || department === 'hr' || department.includes('hr')) return 'hr';
    if (department.includes('engineering')) return 'engineering';
    return null;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Employees — Kanban
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? '...' : `${employees.length} employees shown across 3 departments`}
          </p>
        </div>
        <Link
          to="/employees"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
        >
          <List className="w-4 h-4" />
          List View
        </Link>
        <button
          type="button"
          onClick={fetchEmployees}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: 400 }}>
        <aside className="lg:w-56 shrink-0 bg-white border border-gray-200 rounded-xl p-4 h-fit shadow-sm">
          <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3">Filters</h2>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee type</label>
          <select value={employeeType} onChange={(event) => setEmployeeType(event.target.value)} className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All types</option>
            <option value="full_time">Full time</option>
            <option value="contract">Contract</option>
            <option value="part_time">Part time</option>
          </select>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department assignment</label>
          <div className="space-y-1">
            {[
              { value: '', label: 'All employees', icon: Users },
              { value: 'assigned', label: 'Assigned', icon: UserCheck },
              { value: 'unassigned', label: 'Unassigned', icon: UserX },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value || 'all'} type="button" onClick={() => setAssignment(value)} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${assignment === value ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex flex-1 gap-5 overflow-x-auto pb-6">
        {loading
          ? [...Array(3)].map((_, gi) => (
            <div key={gi} className="min-w-[280px] flex-shrink-0 space-y-3">
              <div className="h-8 bg-gray-200 rounded-lg animate-pulse" />
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ))
          : DEPARTMENT_COLUMNS.map((department) => {
            const departmentEmployees = employees.filter((employee) => getDepartmentKey(employee) === department.key);
            return (
            <div key={department.key} className="min-w-[280px] flex-1">
              {/* Column Header */}
              <div className={`bg-gradient-to-r ${department.color} rounded-xl px-4 py-3 mb-3 shadow-sm`}>
                <h2 className="text-sm font-bold text-white">{department.label}</h2>
                <p className="text-xs text-white/70 mt-0.5">{departmentEmployees.length} employee{departmentEmployees.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {departmentEmployees.map((emp) => (
                  <Link
                    key={emp.id}
                    to={`/employees/${emp.id}`}
                    className="block p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-blue-200 transition-all duration-150 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center shrink-0 text-blue-700 font-bold text-sm group-hover:from-blue-200 transition">
                        {emp.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-700 transition">{emp.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          {emp.job_position || 'No position'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_STYLES[emp.employee_type] || 'bg-gray-50 text-gray-600'}`}>
                            {emp.employee_type?.replace('_', ' ')}
                          </span>
                          {emp.status === 'active' && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
          })
        }

        {!loading && employees.length === 0 && (
          <div className="flex items-center justify-center w-full py-24">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold">No employees found</p>
              <Link to="/employees/new" className="mt-3 inline-block text-blue-600 text-sm underline">Add first employee</Link>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
