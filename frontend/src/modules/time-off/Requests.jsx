import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { CalendarDays, CheckCircle2, XCircle, Clock, Plus, X } from 'lucide-react';

const STATUS_STYLES = {
  draft: 'bg-amber-50 text-amber-800 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  refused: 'bg-red-50 text-red-800 border border-red-200',
};

export default function Requests() {
  const { role, user } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [types, setTypes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [responsibleUsers, setResponsibleUsers] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canApprove = ['admin', 'hr_manager'].includes(role);

  useEffect(() => {
    fetchRequests();
    fetchModalOptions();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/time-off/requests');
      setRequests(data);
    } catch (err) {
      addToast('Failed to load time off requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchModalOptions = async () => {
    try {
      const [typesRes, allocRes, respRes] = await Promise.all([
        client.get('/time-off/types').catch(() => ({ data: [] })),
        client.get('/time-off/allocations').catch(() => ({ data: [] })),
        client.get('/time-off/responsible-users').catch(() => ({ data: [] })),
      ]);
      setTypes(typesRes.data);
      setAllocations(allocRes.data);
      setResponsibleUsers(respRes.data);
      if (typesRes.data.length > 0) {
        setSelectedType(typesRes.data[0].id.toString());
      }
      if (respRes.data.length > 0) {
        setResponsibleId(respRes.data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load leave options', err);
    }
  };

  // Auto calculate duration in days
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      if (diffTime >= 0) {
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setDuration(days);
      }
    }
  }, [startDate, endDate]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await client.post('/time-off/requests', {
        type_id: parseInt(selectedType, 10),
        start_date: startDate,
        end_date: endDate,
        duration: Number(duration),
        responsible_id: responsibleId ? parseInt(responsibleId, 10) : undefined,
      });
      setShowModal(false);
      setStartDate('');
      setEndDate('');
      addToast('Time off request submitted successfully', 'success');
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit leave request';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try {
      await client.patch(`/time-off/requests/${id}/approve`);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
      addToast('Time off request approved. Allocation balance updated.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Approval failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async (id) => {
    setActionLoading(id + '-refuse');
    try {
      await client.patch(`/time-off/requests/${id}/refuse`);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'refused' } : r)));
      addToast('Time off request refused.', 'warning');
    } catch (err) {
      addToast(err.response?.data?.error || 'Refusal failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'deferred') return r.is_deferred;
    return r.status === activeTab;
  });

  const getSelectedTypeObj = () => types.find((t) => t.id.toString() === selectedType);
  const getSelectedTypeAlloc = () => allocations.find((a) => a.type_id.toString() === selectedType);
  const pendingCount = requests.filter((r) => r.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-amber-500" />
            Time Off Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pendingCount > 0 ? (
              <span className="text-amber-700 font-semibold">{pendingCount} pending approval</span>
            ) : (
              'Submit and manage employee leave applications'
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Request Time Off
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {['all', 'draft', 'approved', 'refused', 'deferred'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'deferred' ? '⏸ Deferred' : tab}
          </button>
        ))}
      </div>

      {/* Table View */}
      <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground font-medium">Loading leave requests...</div>
        ) : (
          <table className="min-w-full text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase text-muted-foreground tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredRequests.map((req) => (
                <tr key={req.id} className={`hover:bg-muted/30 transition-colors ${req.status === 'draft' ? 'bg-amber-500/5' : ''}`}>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    <div>{req.employee_name || `Employee #${req.employee_id}`}</div>
                    {req.department_name && <div className="text-xs text-muted-foreground mt-0.5 font-medium">{req.department_name}</div>}
                    {req.responsible_name && (
                      <div className="text-[11px] text-purple-600 font-normal">
                        Responsible: {req.responsible_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <span className="font-medium">{req.type_name || `Type #${req.type_id}`}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                    <div>{req.start_date} → {req.end_date}</div>
                    {req.is_deferred && (
                      <div className="text-[11px] text-purple-700 font-sans mt-0.5 font-semibold">
                        Applied on: {req.deferred_to_date}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {req.duration} {req.type_unit || 'days'}
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    {req.is_deferred && (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          ⏸ Deferred to {req.deferred_to_date}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'draft' && canApprove && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id + '-approve'}
                          className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {actionLoading === req.id + '-approve' ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRefuse(req.id)}
                          disabled={actionLoading === req.id + '-refuse'}
                          className="text-xs px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {actionLoading === req.id + '-refuse' ? '...' : 'Refuse'}
                        </button>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {req.status === 'refused' && (
                      <span className="text-xs text-rose-600 font-semibold inline-flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Refused
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-12 text-gray-400">No time off requests found.</div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">Request Time Off</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Apply for annual leave, sick leave, or time off</p>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Time Off Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border bg-white focus:ring-blue-500"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              {getSelectedTypeObj()?.requires_allocation && (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
                  <span>Balance Remaining: </span>
                  <span className="font-bold">
                    {getSelectedTypeAlloc()?.remaining ?? '—'} {getSelectedTypeObj()?.unit}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Duration ({getSelectedTypeObj()?.unit || 'days'})</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Responsible Person (for Deferred Time Off)</label>
                <select
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border bg-white focus:ring-blue-500"
                >
                  <option value="">Select Responsible Manager</option>
                  {responsibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role_name})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Responsible HR manager overseeing deferred time off when requests fall into closed pay periods.
                </p>
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
