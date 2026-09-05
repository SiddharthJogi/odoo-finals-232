import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  FileText,
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react';

const CONTRACT_STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  pending: 'bg-amber-50 text-amber-800 border-amber-300',
  expired: 'bg-gray-50 text-gray-600 border-gray-300',
  cancelled: 'bg-red-50 text-red-800 border-red-300',
};

export default function ContractHistory() {
  const { id: employeeId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [employee, setEmployee] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    wage: '',
    date_start: '',
    date_end: '',
    structure_id: '',
    status: 'active',
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [empRes, contractsRes, structRes] = await Promise.all([
          client.get(`/employees/${employeeId}`),
          client.get(`/employees/${employeeId}/contracts`),
          client.get('/payroll/structures'),
        ]);
        setEmployee(empRes.data);
        setContracts(contractsRes.data);
        setStructures(structRes.data);
        if (structRes.data.length > 0) {
          setForm((f) => ({ ...f, structure_id: structRes.data[0].id }));
        }
      } catch (err) {
        addToast('Failed to load contract data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [employeeId]);

  const handleCreateContract = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await client.post('/contracts', {
        employee_id: parseInt(employeeId, 10),
        wage: parseFloat(form.wage),
        date_start: form.date_start,
        date_end: form.date_end || null,
        structure_id: parseInt(form.structure_id, 10),
        status: form.status,
      });
      setContracts((prev) => [data, ...prev]);
      setShowForm(false);
      addToast('Contract created successfully', 'success');
      setForm({ wage: '', date_start: '', date_end: '', structure_id: structures[0]?.id || '', status: 'active' });
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to create contract', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate(`/employees/${employeeId}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Employee
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Contract History
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {employee?.name} · {employee?.job_position || 'Staff'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </button>
      </div>

      {/* Contract Cards */}
      <div className="space-y-4">
        {contracts.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No contracts yet</p>
            <p className="text-xs text-gray-400 mt-1">Create the first contract for this employee.</p>
          </div>
        )}

        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 text-sm">
                      ₹{Number(contract.wage).toLocaleString('en-IN')} / month
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                        CONTRACT_STATUS_STYLES[contract.status] || 'bg-gray-50 border-gray-300 text-gray-600'
                      }`}
                    >
                      {(contract.status || 'active').toUpperCase()}
                    </span>
                    {contract.status === 'active' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {contract.date_start}
                    {contract.date_end ? ` → ${contract.date_end}` : ' → Present'}
                  </p>
                  {contract.structure_name && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Structure: <span className="font-semibold text-gray-600">{contract.structure_name}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {contract.status === 'active' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Payroll-eligible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-4 h-4" /> Historical
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Contract Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-blue-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-300" />
                  New Contract
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  for {employee?.name}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-blue-200 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Monthly Wage (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.wage}
                    onChange={(e) => setForm({ ...form, wage: e.target.value })}
                    placeholder="e.g. 80000"
                    className="w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.date_start}
                    onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                    className="w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={form.date_end}
                    onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                    className="w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Salary Structure</label>
                  <select
                    value={form.structure_id}
                    onChange={(e) => setForm({ ...form, structure_id: e.target.value })}
                    className="w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 font-medium">
                  Only one contract should be <strong>active</strong> per period. Payroll will resolve the contract valid on the payrun period start date.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
