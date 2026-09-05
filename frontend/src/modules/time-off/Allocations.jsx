import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { fetchAllEmployees } from '../../api/employees';
import { CalendarDays, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
      const [empList, typesRes] = await Promise.all([
        fetchAllEmployees(),
        client.get('/time-off/types').catch(() => ({ data: [] })),
      ]);
      setEmployees(empList);
      setTypes(typesRes.data);
      if (empList.length > 0) setEmployeeId(empList[0].id.toString());
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
        <div className="text-center py-12 text-muted-foreground font-medium">Loading leave allocations...</div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {allocations.map((alloc, index) => {
            const allocVal = Number(alloc.allocated);
            const takenVal = Number(alloc.taken);
            const remVal = Number(alloc.remaining);
            const pct = allocVal > 0 ? Math.min(100, Math.round((takenVal / allocVal) * 100)) : 0;

            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={alloc.id}
                className="bg-card rounded-[2rem] p-8 shadow-sm border border-border hover:shadow-xl hover:border-primary/20 transition-all space-y-5 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-foreground text-xl tracking-tight group-hover:text-primary transition-colors">
                      {alloc.employee_name || `Employee #${alloc.employee_id}`}
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      {alloc.type_name || `Leave Type #${alloc.type_id}`}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {alloc.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Used: {takenVal} {alloc.type_unit || 'days'}</span>
                    <span className="text-foreground">{remVal} {alloc.type_unit || 'days'} remaining</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        pct > 85 ? 'bg-destructive' : pct > 60 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Total: <strong className="text-foreground">{allocVal}</strong> {alloc.type_unit || 'days'}</span>
                  <span>Valid: {alloc.valid_from} → {alloc.valid_to || '∞'}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {!loading && allocations.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
          No leave allocations configured yet.
        </div>
      )}

      {/* New Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card rounded-[2rem] border border-border max-w-md w-full p-8 shadow-2xl space-y-6"
          >
            <div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">Grant Leave Allocation</h3>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Allocate leave balance to an employee</p>
            </div>

            {error && <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold rounded-2xl">{error}</div>}

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
          </motion.div>
        </div>
      )}
    </div>
  );
}
