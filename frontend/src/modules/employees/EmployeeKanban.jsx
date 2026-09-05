import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const STATUS_COLORS = {
  active: 'bg-green-100 border-green-300',
  archived: 'bg-gray-100 border-gray-300',
};

export default function EmployeeKanban() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/employees')
      .then(({ data }) => setEmployees(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  // Group by department (or 'Unassigned')
  const groups = {};
  employees.forEach((emp) => {
    const key = emp.department_id || 'Unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(emp);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employees — Kanban</h1>
        <Link to="/employees" className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
          List View
        </Link>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {Object.entries(groups).map(([deptId, emps]) => (
          <div key={deptId} className="min-w-[280px] flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Department {deptId} ({emps.length})
            </h2>
            <div className="space-y-3">
              {emps.map((emp) => (
                <Link key={emp.id} to={`/employees/${emp.id}`}
                  className={`block p-4 rounded-xl border-2 ${STATUS_COLORS[emp.status] || 'bg-white border-gray-200'} hover:shadow-md transition`}
                >
                  <p className="font-medium text-gray-900">{emp.name}</p>
                  <p className="text-sm text-gray-500">{emp.job_position || 'No position'}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">{emp.employee_type}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
