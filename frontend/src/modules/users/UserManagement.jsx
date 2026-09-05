import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';

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
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roleChanging, setRoleChanging] = useState(null); // userId being changed
  const [revoking, setRevoking] = useState(null);
  const [reactivating, setReactivating] = useState(null);
  const [toast, setToast] = useState(null);
  const [manualCredentials, setManualCredentials] = useState(null);

  const [form, setForm] = useState({
    email: '', password: '', role_id: '', employee_id: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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
    client.get('/users')
      .then(({ data }) => setUsers(data))
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
    Promise.all([
      client.get('/roles'),
      client.get('/employees'),
    ]).then(([rolesRes, empRes]) => {
      setRoles(rolesRes.data);
      setEmployees(empRes.data);
      // Default to first role
      if (rolesRes.data.length > 0) {
        setForm(f => ({ ...f, role_id: String(rolesRes.data[0].id) }));
      }
    }).catch(console.error);
  }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const payload = {
        email: form.email,
        role_id: parseInt(form.role_id, 10),
        employee_id: form.employee_id ? parseInt(form.employee_id, 10) : undefined,
      };
      if (form.password) payload.password = form.password;
      const { data } = await client.post('/users', payload);
      showToast(data.warning || 'User created and credentials emailed!', data.warning ? 'warning' : 'success');
      setManualCredentials(data.temporary_password ? { email: data.email, password: data.temporary_password } : null);
      setShowCreate(false);
      setForm({ email: '', password: '', role_id: String(roles[0]?.id || ''), employee_id: '' });
      fetchUsers();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

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
          <p className="text-sm text-gray-500 mt-1">Create accounts and assign roles to employees</p>
        </div>
        <button
          id="create-user-btn"
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + New User
        </button>
      </div>

      {/* Roles legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(ROLE_COLORS).map(([role, cls]) => (
          <span key={role} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{role}</span>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">Create New User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {createError && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="new-user-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="employee@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="new-user-password"
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Leave blank to email a temporary password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">A temporary password is generated and emailed when this is blank.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  id="new-user-role"
                  value={form.role_id}
                  onChange={e => setForm({ ...form, role_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Employee <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  id="new-user-employee"
                  value={form.employee_id}
                  onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">— Not linked —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Linking allows this user to view their own payslips and attendance.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="create-user-submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
