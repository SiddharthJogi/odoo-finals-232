import { Search, Filter } from 'lucide-react';

export default function EmployeeFilterBar({
  search, setSearch,
  deptFilter, setDeptFilter,
  typeFilter, setTypeFilter,
  statusFilter, setStatusFilter,
  departments, hasActiveFilters, clearFilters,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-sm p-3 mb-5">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold px-1">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        Filter:
      </div>

      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <select
        value={deptFilter}
        onChange={(e) => setDeptFilter(e.target.value)}
        className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">All Types</option>
        <option value="full_time">Full Time</option>
        <option value="part_time">Part Time</option>
        <option value="contract">Contract</option>
      </select>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition px-2 py-1 hover:bg-blue-50 rounded-lg"
        >
          Clear
        </button>
      )}
    </div>
  );
}
