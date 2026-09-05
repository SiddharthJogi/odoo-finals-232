import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';

export default function Requests() {
  const { role, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [types, setTypes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedType, setSelectedType] = useState('');
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
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModalOptions = async () => {
    try {
      const [typesRes, allocRes] = await Promise.all([
        client.get('/time-off/types'),
        client.get('/time-off/allocations'),
      ]);
      setTypes(typesRes.data);
      setAllocations(allocRes.data);
      if (typesRes.data.length > 0) {
        setSelectedType(typesRes.data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load leave types', err);
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
      });
      setShowModal(false);
      setStartDate('');
      setEndDate('');
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await client.patch(`/time-off/requests/${id}/approve`);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
    } catch (err) {
      alert(err.response?.data?.error || 'Approval failed');
    }
  };

  const handleRefuse = async (id) => {
    try {
      await client.patch(`/time-off/requests/${id}/refuse`);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'refused' } : r)));
    } catch (err) {
      alert(err.response?.data?.error || 'Refusal failed');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const getSelectedTypeObj = () => types.find((t) => t.id.toString() === selectedType);
  const getSelectedTypeAlloc = () => allocations.find((a) => a.type_id.toString() === selectedType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Time Off Requests</h1>
          <p className="text-sm text-gray-500">Submit and manage employee leave applications</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition"
        >
          + Request Time Off
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {['all', 'draft', 'approved', 'refused'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table View */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading leave requests...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50/50 text-xs font-semibold uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {req.employee_name || `Employee #${req.employee_id}`}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <span className="font-medium">{req.type_name || `Type #${req.type_id}`}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                    {req.start_date} → {req.end_date}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {req.duration} {req.type_unit || 'days'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'refused'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'draft' && canApprove && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRefuse(req.id)}
                          className="text-xs px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition font-medium"
                        >
                          Refuse
                        </button>
                      </div>
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Request Time Off</h3>
            <p className="text-xs text-gray-500">Apply for annual leave, sick leave, or time off</p>

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
