import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { CalendarDays, CheckCircle2, XCircle, Clock, Plus, X } from 'lucide-react';

const STATUS_STYLES = {
  draft: 'bg-amber-50 text-amber-800 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  refused: 'bg-red-50 text-red-800 border border-red-200',
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-12" /></td>
      <td className="px-5 py-4"><div className="h-5 bg-gray-100 rounded-full w-16" /></td>
      <td className="px-5 py-4"><div className="h-7 bg-gray-100 rounded w-28" /></td>
    </tr>
  );
}

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    client.get('/time-off/requests')
      .then(({ data }) => setRequests(data))
      .catch(() => addToast('Failed to load time off requests', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try {
      await client.patch(`/time-off/requests/${id}/approve`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' } : r));
      addToast('Time off request approved. Allocation balance updated.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to approve request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async (id) => {
    setActionLoading(id + '-refuse');
    try {
      await client.patch(`/time-off/requests/${id}/refuse`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'refused' } : r));
      addToast('Time off request refused.', 'warning');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to refuse request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'draft').length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-amber-500" />
            Time Off Requests
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {pendingCount > 0
              ? <span className="text-amber-700 font-semibold">{pendingCount} pending approval</span>
              : 'All requests reviewed'}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Leave Type</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Days</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : requests.map((req) => (
                <tr key={req.id} className={`hover:bg-gray-50 transition ${req.status === 'draft' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">{req.employee_name || `Employee #${req.employee_id}`}</p>
                    {req.department_name && <p className="text-xs text-gray-400 mt-0.5">{req.department_name}</p>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{req.type_name || '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <span className="font-medium">{req.start_date}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="font-medium">{req.end_date}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-900">{req.duration}d</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      {req.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {req.status === 'draft' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {actionLoading === req.id + '-approve' ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRefuse(req.id)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {actionLoading === req.id + '-refuse' ? '...' : 'Refuse'}
                        </button>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {req.status === 'refused' && (
                      <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Refused
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {!loading && requests.length === 0 && (
          <div className="py-16 text-center">
            <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No time off requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Employees can submit requests from the Allocations page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
