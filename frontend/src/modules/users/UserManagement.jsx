import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800',
  hr_manager: 'bg-blue-100 text-blue-800',
  hr_payroll_manager: 'bg-purple-100 text-purple-800',
  hr_payroll_user: 'bg-indigo-100 text-indigo-800',
  employee: 'bg-green-100 text-green-800',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 0 });
  const [roleChanging, setRoleChanging] = useState(null); // userId being changed
  const [revoking, setRevoking] = useState(null);
  const [reactivating, setReactivating] = useState(null);
  const [toast, setToast] = useState(null);
  const [manualCredentials, setManualCredentials] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toastClass = toast?.type === 'error'
    ? 'bg-red-600 text-white'
    : toast?.type === 'warning'
      ? 'bg-yellow-500 text-white'
      : 'bg-green-600 text-white';

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '6' });
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);

    client.get(`/users?${params.toString()}`)
      .then(({ data }) => {
        setUsers(data.users || []);
        setPagination(data.pagination || { page, limit: 6, total: 0, totalPages: 0 });
      })
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
    client.get('/roles').then(({ data }) => {
      setRoles(data);
    }).catch(console.error);
  }, [fetchUsers]);

  const handleRoleChange = async (userId, newRoleId) => {
    setRoleChanging(userId);
    try {
      await client.patch(`/users/${userId}/role`, { role_id: parseInt(newRoleId, 10) });
      showToast('Role updated!');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update role', 'error');
    } finally {
      setRoleChanging(null);
    }
  };

  const handleRevoke = async (user) => {
    if (!window.confirm(`Revoke ${user.email}'s account? They will no longer be able to log in.`)) return;
    setRevoking(user.id);
    try {
      await client.delete(`/users/${user.id}`);
      showToast('Account revoked. Login has been disabled.');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to revoke account', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const handleReactivate = async (user) => {
    if (!window.confirm(`Reactivate ${user.email} and send new login credentials?`)) return;
    setReactivating(user.id);
    try {
      const { data } = await client.post(`/users/${user.id}/reactivate`);
      showToast(data.warning || 'Account reactivated and credentials sent.', data.warning ? 'warning' : 'success');
      setManualCredentials(data.temporary_password ? { email: data.email, password: data.temporary_password } : null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reactivate account', 'error');
    } finally {
      setReactivating(null);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toastClass}`}>
          {toast.msg}
        </div>
      )}

      {manualCredentials && (
        <div className="mb-5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-sm">
          <div className="font-semibold">Manual credentials</div>
          <div className="mt-1">Email: {manualCredentials.email}</div>
          <div>Password: <span className="font-mono font-semibold">{manualCredentials.password}</span></div>
          <div className="mt-2 text-xs">Share this password securely and ask the user to change it after signing in.</div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">View accounts and assign roles to employees</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-sm p-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or employee..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Roles legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(ROLE_COLORS).map(([role, cls]) => (
          <span key={role} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{role}</span>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-xs text-gray-400">ID #{user.id} · Joined {new Date(user.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.employee_name || <span className="text-gray-300 italic">Not linked</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      id={`role-select-${user.id}`}
                      defaultValue={user.role_id}
                      disabled={roleChanging === user.id}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="text-sm px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    {roleChanging === user.id && (
                      <span className="ml-2 text-xs text-blue-500">Saving...</span>
                    )}
                    {user.is_active && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(user)}
                        disabled={revoking === user.id}
                        className="ml-3 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {revoking === user.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                    {!user.is_active && (
                      <button
                        type="button"
                        onClick={() => handleReactivate(user)}
                        disabled={reactivating === user.id}
                        className="ml-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {reactivating === user.id ? 'Restoring...' : 'Restore & Resend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && pagination.totalPages > 0 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} users</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
              disabled={page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
