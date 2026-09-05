import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';

/**
 * Shared server-side search/filter/pagination for the Employees List and Kanban views.
 * Debounces the free-text search so it doesn't fire a request per keystroke.
 */
export function useEmployeeSearch({ limit = 20, debounceMs = 300 } = {}) {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const debounceRef = useRef(null);

  // Any filter change (other than page itself) resets back to page 1.
  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, typeFilter, statusFilter]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      client.get('/employees', {
        params: {
          page,
          limit,
          search: search || undefined,
          department_id: deptFilter || undefined,
          employee_type: typeFilter || undefined,
          status: statusFilter || undefined,
        },
      })
        .then(({ data }) => {
          setEmployees(data.data);
          setTotal(data.total);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, debounceMs);
    return () => clearTimeout(debounceRef.current);
  }, [page, limit, search, deptFilter, typeFilter, statusFilter]);

  const clearFilters = () => {
    setSearch('');
    setDeptFilter('');
    setTypeFilter('');
    setStatusFilter('active');
  };

  return {
    employees, total, page, setPage, loading,
    search, setSearch, deptFilter, setDeptFilter,
    typeFilter, setTypeFilter, statusFilter, setStatusFilter,
    clearFilters,
    hasActiveFilters: Boolean(search || deptFilter || typeFilter || statusFilter !== 'active'),
  };
}
