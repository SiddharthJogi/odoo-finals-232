import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';

export default function Types() {
  const { role } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('days');
  const [requiresAllocation, setRequiresAllocation] = useState(true);
  const [affectsPayroll, setAffectsPayroll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canCreate = ['admin', 'hr_manager'].includes(role);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/time-off/types');
      setTypes(data);
    } catch (err) {
      console.error('Failed to fetch leave types', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await client.post('/time-off/types', {
        name,
        unit,
        requires_allocation: requiresAllocation,
        affects_payroll: affectsPayroll,
      });
      setShowModal(false);
      setName('');
      fetchTypes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create leave type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Time Off Types</h1>
          <p className="text-sm text-gray-500">Configure company leave policies and payroll rules</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition"
          >
            + Create Leave Type
          </button>
        )}
      </div>

      {/* Grid View */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading time off types...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {types.map((type) => (
            <div
              key={type.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 text-lg">{type.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 uppercase tracking-wider">
                  {type.unit}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Requires Allocation:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${type.requires_allocation ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {type.requires_allocation ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Affects Payroll:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${type.affects_payroll ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {type.affects_payroll ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && types.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
          No time off types configured.
        </div>
      )}

      {/* New Type Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Create Leave Type</h3>
            <p className="text-xs text-gray-500">Define a new leave type for your organization</p>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Leave Type Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Leave, Sick Leave, Unpaid Leave"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Allocation Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border bg-white focus:ring-blue-500"
                >
                  <option value="days">Days</option>
                  <option value="hours">Hours</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresAllocation}
                    onChange={(e) => setRequiresAllocation(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Requires Allocation Balance</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={affectsPayroll}
                    onChange={(e) => setAffectsPayroll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Affects Payroll (Unpaid leave / deduction trigger)</span>
                </label>
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
                  {submitting ? 'Creating...' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
