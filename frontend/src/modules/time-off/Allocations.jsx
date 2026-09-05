import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { CalendarDays, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
      ))}
    </tr>
  );
}

export default function Allocations() {
  const { role } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [allocated, setAllocated] = useState(20);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canCreate = ['admin', 'hr_manager'].includes(role);

  useEffect(() => {
    fetchAllocations();
    fetchOptions();
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/time-off/allocations');
      setAllocations(data);
    } catch (err) {
      console.error('Failed to fetch allocations', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [empRes, typesRes] = await Promise.all([
        client.get('/employees').catch(() => ({ data: [] })),
        client.get('/time-off/types').catch(() => ({ data: [] })),
      ]);
      setEmployees(empRes.data);
      setTypes(typesRes.data);
      if (empRes.data.length > 0) setEmployeeId(empRes.data[0].id.toString());
      if (typesRes.data.length > 0) setTypeId(typesRes.data[0].id.toString());
    } catch (err) {
      console.error('Failed to fetch options', err);
    }
  };

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await client.post('/time-off/allocations', {
        employee_id: parseInt(employeeId, 10),
        type_id: parseInt(typeId, 10),
        allocated: Number(allocated),
        valid_from: validFrom,
        valid_to: validTo || undefined,
        status: 'approved',
      });
      setShowModal(false);
      fetchAllocations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create allocation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-amber-500" />
            Leave Allocations
          </h1>
          <p className="text-sm text-gray-500">Employee leave balances and granted allowances</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition"
          >
            + Grant Leave Allocation
          </button>
        )}
      </div>

      {/* Grid of Allocation Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading leave allocations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allocations.map((alloc) => {
            const allocVal = Number(alloc.allocated);
            const takenVal = Number(alloc.taken);
            const remVal = Number(alloc.remaining);
            const pct = allocVal > 0 ? Math.min(100, Math.round((takenVal / allocVal) * 100)) : 0;

            return (
              <div
                key={alloc.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {alloc.employee_name || `Employee #${alloc.employee_id}`}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                      {alloc.type_name || `Leave Type #${alloc.type_id}`}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {alloc.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-500">Used: {takenVal} {alloc.type_unit || 'days'}</span>
                    <span className="text-gray-900 font-bold">{remVal} {alloc.type_unit || 'days'} remaining</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                  <span>Total: {allocVal} {alloc.type_unit || 'days'}</span>
                  <span>Valid: {alloc.valid_from} → {alloc.valid_to || '∞'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && allocations.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
          No leave allocations configured yet.
        </div>
      )}

      {/* New Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Grant Leave Allocation</h3>
            <p className="text-xs text-gray-500">Allocate leave balance to an employee</p>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateAllocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border bg-white focus:ring-blue-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.job_position || 'Employee'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Leave Type</label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border bg-white focus:ring-blue-500"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Allocated Amount</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={allocated}
                  onChange={(e) => setAllocated(parseFloat(e.target.value))}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valid From</label>
                  <input
                    type="date"
                    required
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valid To (Optional)</label>
                  <input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                  />
                </div>
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
                  {submitting ? 'Granting...' : 'Grant Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
