import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { fetchAllEmployees } from '../../api/employees';
import { CalendarDays, Download, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

const formatAllocationDate = (dateStr) => {
  if (!dateStr) return 'Indefinite';
  const cleanStr = dateStr.slice(0, 10);
  const [year, month, day] = cleanStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Allocations() {
  const { role } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTypeId, setFilterTypeId] = useState('');
  const [validityFilter, setValidityFilter] = useState('all');

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

  const filteredAllocations = allocations.filter((alloc) => {
    const matchesSearch = !searchQuery || (alloc.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterTypeId || alloc.type_id.toString() === filterTypeId.toString();

    const todayStr = new Date().toISOString().slice(0, 10);
    const validToDate = alloc.valid_to ? alloc.valid_to.slice(0, 10) : null;
    const isExpired = validToDate && validToDate < todayStr;
    const daysLeft = validToDate ? (new Date(validToDate) - new Date(todayStr)) / (1000 * 3600 * 24) : 999;
    const isExpiring = validToDate && !isExpired && daysLeft <= 30;

    if (validityFilter === 'active' && isExpired) return false;
    if (validityFilter === 'expiring' && !isExpiring) return false;
    if (validityFilter === 'expired' && !isExpired) return false;

    return matchesSearch && matchesType;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Employee Name', 'Leave Type', 'Allocated Days', 'Taken Days', 'Remaining Balance', 'Valid From', 'Valid To', 'Status'];
    const rows = filteredAllocations.map((alloc) => [
      alloc.id,
      `"${alloc.employee_name || `Employee #${alloc.employee_id}`}"`,
      `"${alloc.type_name || `Type #${alloc.type_id}`}"`,
      alloc.allocated,
      alloc.taken || 0,
      alloc.remaining !== undefined ? alloc.remaining : (Number(alloc.allocated) - Number(alloc.taken || 0)),
      formatAllocationDate(alloc.valid_from),
      formatAllocationDate(alloc.valid_to),
      alloc.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leave_allocations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <p className="text-sm text-gray-500">Employee leave balances, granted allowances, and validity windows</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={filteredAllocations.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold shadow-xs transition text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-amber-600" />
            Export CSV
          </button>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition text-sm"
            >
              + Grant Leave Allocation
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterTypeId}
              onChange={(e) => setFilterTypeId(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">All Leave Types</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'expiring', label: 'Expiring Soon' },
              { id: 'expired', label: 'Expired' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setValidityFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  validityFilter === tab.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
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
          {filteredAllocations.map((alloc, index) => {
            const allocVal = Number(alloc.allocated);
            const takenVal = Number(alloc.taken || 0);
            const remVal = alloc.remaining !== undefined ? Number(alloc.remaining) : allocVal - takenVal;
            const pct = allocVal > 0 ? Math.min(100, Math.round((takenVal / allocVal) * 100)) : 0;

            const todayStr = new Date().toISOString().slice(0, 10);
            const validToDate = alloc.valid_to ? alloc.valid_to.slice(0, 10) : null;
            const isExpired = validToDate && validToDate < todayStr;
            const daysLeft = validToDate ? Math.ceil((new Date(validToDate) - new Date(todayStr)) / (1000 * 3600 * 24)) : 999;
            const isExpiring = validToDate && !isExpired && daysLeft <= 30;

            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={alloc.id}
                className="bg-card rounded-[2rem] p-8 shadow-sm border border-border hover:shadow-xl hover:border-primary/20 transition-all space-y-5 group relative"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-extrabold text-foreground text-xl tracking-tight group-hover:text-amber-600 transition-colors">
                      {alloc.employee_name || `Employee #${alloc.employee_id}`}
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-2">
                      <span>{alloc.type_name || `Leave Type #${alloc.type_id}`}</span>
                      {alloc.department_name && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-normal lowercase tracking-normal">
                          {alloc.department_name}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {alloc.status}
                    </span>
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Expired
                      </span>
                    ) : isExpiring ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                        Expiring in {daysLeft}d
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Active
                      </span>
                    )}
                  </div>
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
                        pct > 85 ? 'bg-destructive' : pct > 60 ? 'bg-amber-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Total: <strong className="text-foreground">{allocVal}</strong> {alloc.type_unit || 'days'}</span>
                  <span>Valid: {formatAllocationDate(alloc.valid_from)} → {formatAllocationDate(alloc.valid_to)}</span>
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
