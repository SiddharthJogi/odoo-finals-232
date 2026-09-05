import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { Users, List, UserCircle, Briefcase } from 'lucide-react';

const DEPT_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-600',
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
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([client.get('/employees'), client.get('/departments')])
      .then(([empRes, deptRes]) => {
        setEmployees(empRes.data);
        setDepartments(deptRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build dept name map
  const deptMap = {};
  departments.forEach((d) => { deptMap[d.id] = d.name; });

  // Group by department
  const groups = {};
  employees.forEach((emp) => {
    const key = emp.department_id || 'unassigned';
    const label = emp.department_name || deptMap[emp.department_id] || 'Unassigned';
    if (!groups[key]) groups[key] = { label, employees: [] };
    groups[key].employees.push(emp);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Employees — Kanban
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? '...' : `${employees.length} employees across ${Object.keys(groups).length} departments`}
          </p>
        </div>
        <Link
          to="/employees"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
        >
          <List className="w-4 h-4" />
          List View
        </Link>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-6" style={{ minHeight: 400 }}>
        {loading
          ? [...Array(3)].map((_, gi) => (
            <div key={gi} className="min-w-[280px] flex-shrink-0 space-y-3">
              <div className="h-8 bg-gray-200 rounded-lg animate-pulse" />
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ))
          : Object.entries(groups).map(([deptId, group], groupIdx) => (
            <div key={deptId} className="min-w-[280px] flex-shrink-0">
              {/* Column Header */}
              <div className={`bg-gradient-to-r ${DEPT_COLORS[groupIdx % DEPT_COLORS.length]} rounded-xl px-4 py-3 mb-3 shadow-sm`}>
                <h2 className="text-sm font-bold text-white">{group.label}</h2>
                <p className="text-xs text-white/70 mt-0.5">{group.employees.length} employee{group.employees.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {group.employees.map((emp) => (
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
          ))
        }

        {!loading && Object.keys(groups).length === 0 && (
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
  );
}
