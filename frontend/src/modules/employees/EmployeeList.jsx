import { Link } from 'react-router-dom';
import { Users, Plus, LayoutGrid, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import client from '../../api/client';
import { useEffect, useState } from 'react';
import { useEmployeeSearch } from './useEmployeeSearch';
import EmployeeFilterBar from './EmployeeFilterBar';
import PresenceBadge from './PresenceBadge';

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-44" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded-full w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded-full w-14" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded-full w-14" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-28" /></td>
    </tr>
  );
}

export default function EmployeeList() {
  const [departments, setDepartments] = useState([]);
  const {
    employees, total, page, setPage, loading,
    search, setSearch, deptFilter, setDeptFilter,
    typeFilter, setTypeFilter, statusFilter, setStatusFilter,
    clearFilters, hasActiveFilters,
  } = useEmployeeSearch({ limit: 10 });

  useEffect(() => {
    client.get('/departments').then(({ data }) => setDepartments(data)).catch(console.error);
  }, []);

  const TYPE_LABELS = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract' };
  const TYPE_STYLES = {
    full_time: 'bg-blue-50 text-blue-700 border border-blue-200',
    part_time: 'bg-amber-50 text-amber-700 border border-amber-200',
    contract: 'bg-purple-50 text-purple-700 border border-purple-200',
  };

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Employees
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? '...' : `${total} employee${total !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/employees/kanban"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </Link>
          <Link
            to="/employees/new"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Employee
          </Link>
        </div>
      </div>

      <EmployeeFilterBar
        search={search} setSearch={setSearch}
        deptFilter={deptFilter} setDeptFilter={setDeptFilter}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        departments={departments}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
      />

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Today</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading
              ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              : employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <Link
                      to={`/employees/${emp.id}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition"
                    >
                      {emp.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{emp.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {emp.department_name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {emp.job_position || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${TYPE_STYLES[emp.employee_type] || 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[emp.employee_type] || emp.employee_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                      emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {emp.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <PresenceBadge isPresent={emp.is_present} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/employees/${emp.id}/contracts`}
                        className="flex items-center gap-0.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
                      >
                        <FileText className="w-3 h-3" />
                        Contracts
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {!loading && employees.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No employees match your filters</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting the search or filter criteria above</p>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
