import { useState, useEffect } from 'react';
import { Building2, Check, X, Clock } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';

export default function DepartmentRequests() {
  const { role } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('draft');
  const [busyId, setBusyId] = useState(null);
  const isAdmin = role === 'admin';

  const load = () => {
    setLoading(true);
    client.get('/department-requests', { params: { status: statusFilter || undefined } })
      .then(({ data }) => setRequests(data))
      .catch(() => addToast('Failed to load department change requests', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const review = async (id, approve) => {
    setBusyId(id);
    try {
      await client.patch(`/department-requests/${id}/${approve ? 'approve' : 'reject'}`, {});
      addToast(approve ? 'Department change approved' : 'Department change rejected', 'success');
      load();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to review request', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const STATUS_STYLES = {
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Department Change Requests
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin ? 'Review and approve or reject pending department reassignments.' : 'Department reassignments submitted for admin approval.'}
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="draft">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">From</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">To</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Requested By</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!loading && requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.employee_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.current_department_name || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{r.requested_department_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.requested_by_email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[r.status]}`}>
                    {r.status === 'draft' && <Clock className="w-3 h-3" />}
                    {r.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    {r.status === 'draft' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => review(r.id, true)}
                          disabled={busyId === r.id}
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-100 disabled:opacity-50 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => review(r.id, false)}
                          disabled={busyId === r.id}
                          className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && requests.length === 0 && (
          <div className="py-16 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No department change requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
