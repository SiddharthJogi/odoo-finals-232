import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import {
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Sparkles,
  Calendar,
  Users,
} from 'lucide-react';

export default function PayrunWizard() {
  const { addToast } = useToast();
  const [payruns, setPayruns] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayrun, setExpandedPayrun] = useState(null);
  const [payrunDetails, setPayrunDetails] = useState({});

  // Wizard modal state
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [structureId, setStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-08-01');
  const [periodEnd, setPeriodEnd] = useState('2026-08-31');
  const [employeeType, setEmployeeType] = useState('');
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const fetchPayruns = () => {
    client
      .get('/payroll/payruns')
      .then(({ data }) => setPayruns(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayruns();
    client
      .get('/payroll/structures')
      .then(({ data }) => {
        setStructures(data);
        if (data.length > 0) setStructureId(data[0].id);
      })
      .catch(console.error);
  }, []);

  const openPayrunDetails = async (payrunId) => {
    if (expandedPayrun === payrunId) {
      setExpandedPayrun(null);
      return;
    }
    setExpandedPayrun(payrunId);
    if (!payrunDetails[payrunId]) {
      try {
        const { data } = await client.get(`/payroll/payruns/${payrunId}`);
        setPayrunDetails((prev) => ({ ...prev, [payrunId]: data }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setWizardError('');
    setSubmitting(true);
    try {
      const { data } = await client.post('/payroll/payruns/draft', {
        structure_id: parseInt(structureId, 10),
        period_start: periodStart,
        period_end: periodEnd,
        employee_type_filter: employeeType || undefined,
      });
      setEligibleEmployees(data.eligible_employees || []);
      setSelectedEmpIds((data.eligible_employees || []).map((e) => e.id));
      setStep(2);
    } catch (err) {
      setWizardError(err.response?.data?.error || 'Failed to initialize draft payrun.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayrun = async () => {
    if (selectedEmpIds.length === 0) {
      setWizardError('Please select at least one employee for the payrun.');
      return;
    }
    setWizardError('');
    setSubmitting(true);
    try {
      const { data } = await client.post('/payroll/payruns', {
        name: name || `Payrun ${periodStart} to ${periodEnd}`,
        structure_id: parseInt(structureId, 10),
        period_start: periodStart,
        period_end: periodEnd,
        employee_type_filter: employeeType || undefined,
        employee_ids: selectedEmpIds,
      });

      setShowWizard(false);
      setStep(1);
      setName('');
      setActionSuccessMsg(`Payrun successfully created with ${data.payrun.id} payrun ID.`);
      fetchPayruns();
    } catch (err) {
      setWizardError(err.response?.data?.error || 'Failed to create payrun.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (payrunId, targetStatus) => {
    setActionSuccessMsg('');
    try {
      await client.patch(`/payroll/payruns/${payrunId}/${targetStatus}`);
      const labelMap = { compute: 'Computed', validate: 'Validated', 'mark-paid': 'Paid' };
      setActionSuccessMsg(`Payrun #${payrunId} successfully updated to status '${labelMap[targetStatus] || targetStatus}'.`);
      addToast(`Payrun #${payrunId} moved to ${labelMap[targetStatus] || targetStatus}`, 'success');
      fetchPayruns();
      if (expandedPayrun === payrunId) {
        const { data } = await client.get(`/payroll/payruns/${payrunId}`);
        setPayrunDetails((prev) => ({ ...prev, [payrunId]: data }));
      }
    } catch (err) {
      addToast(err.response?.data?.error || `Failed to transition payrun to ${targetStatus}`, 'error');
    }
  };

  const handleSendPayslips = async (payrunId) => {
    setActionSuccessMsg('');
    try {
      const { data } = await client.post(`/payroll/payruns/${payrunId}/send-payslips`);
      const msg = data.message || 'Payslips dispatched via email.';
      setActionSuccessMsg(msg);
      addToast(msg, 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to dispatch payslips', 'error');
    }
  };

  const handleDownloadPDF = async (payslipId) => {
    try {
      const response = await client.get(`/payroll/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      addToast('Failed to download PDF', 'error');
    }
  };

  const statusColors = {
    draft: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    computed: 'bg-blue-50 text-blue-800 border-blue-300',
    validated: 'bg-purple-50 text-purple-800 border-purple-300',
    paid: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  };

  const statusStepIdx = { draft: 1, computed: 2, validated: 3, paid: 4 };

  if (loading) return <div className="text-center py-16 text-gray-500 font-medium">Loading payroll engine...</div>;

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Payroll Processing — Payruns
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            2-step payrun creation wizard, config-driven salary rule computation, and lifecycle management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/payroll/structures"
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            Structures
          </Link>
          <Link
            to="/payroll/rules"
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            Salary Rules
          </Link>
          <button
            onClick={() => {
              setShowWizard(true);
              setStep(1);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create Payrun Wizard
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {actionSuccessMsg}
        </div>
      )}

      {/* Payruns List */}
      <div className="space-y-4">
        {payruns.map((pr) => {
          const isExpanded = expandedPayrun === pr.id;
          const currentDetails = payrunDetails[pr.id];
          const currStep = statusStepIdx[pr.status] || 1;

          return (
            <div key={pr.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{pr.name}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${statusColors[pr.status] || 'bg-gray-100'}`}>
                        {pr.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Period: <span className="font-semibold text-gray-700">{pr.period_start}</span> → <span className="font-semibold text-gray-700">{pr.period_end}</span>
                    </p>
                  </div>

                  {/* Lifecycle Steps Bar */}
                  <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    {['Draft', 'Computed', 'Validated', 'Paid'].map((stLabel, idx) => {
                      const stepNum = idx + 1;
                      const isActive = stepNum <= currStep;
                      return (
                        <React.Fragment key={stLabel}>
                          {idx > 0 && <div className={`w-4 h-0.5 ${isActive ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                              isActive ? 'bg-emerald-100 text-emerald-800' : 'text-gray-400'
                            }`}
                          >
                            {stepNum}. {stLabel}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {pr.status === 'draft' && (
                      <button
                        onClick={() => handleTransition(pr.id, 'compute')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        <Play className="w-3.5 h-3.5" /> Compute Payslips
                      </button>
                    )}

                    {pr.status === 'computed' && (
                      <button
                        onClick={() => handleTransition(pr.id, 'validate')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Validate & Scan AI
                      </button>
                    )}

                    {pr.status === 'validated' && (
                      <button
                        onClick={() => handleTransition(pr.id, 'mark-paid')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                      </button>
                    )}

                    <button
                      onClick={() => handleSendPayslips(pr.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                      title="Send Payslips via Email"
                    >
                      <Mail className="w-3.5 h-3.5 text-gray-600" /> Send Email
                    </button>

                    <button
                      onClick={() => openPayrunDetails(pr.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Payslips
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Payslips List */}
              {isExpanded && (
                <div className="bg-gray-50 border-t border-gray-200 p-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                    <span>Generated Payslips ({currentDetails?.payslips?.length || 0})</span>
                  </h4>
                  {!currentDetails ? (
                    <div className="text-xs text-gray-500 py-4">Loading payslip breakdowns...</div>
                  ) : currentDetails.payslips?.length === 0 ? (
                    <div className="text-xs text-gray-400 py-4">No payslips generated yet.</div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead className="bg-gray-100 text-gray-600 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Employee</th>
                            <th className="px-4 py-2.5">Worked Days</th>
                            <th className="px-4 py-2.5 text-right">Gross Total</th>
                            <th className="px-4 py-2.5 text-right">Net Total</th>
                            <th className="px-4 py-2.5">Status / Warning</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium text-gray-800">
                          {currentDetails.payslips.map((ps) => (
                            <tr key={ps.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-bold text-gray-900">
                                {ps.employee_name || `Employee #${ps.employee_id}`}
                              </td>
                              <td className="px-4 py-2.5">{ps.worked_days} days</td>
                              <td className="px-4 py-2.5 text-right font-mono">
                                ₹{Number(ps.gross_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                                ₹{Number(ps.net_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5">
                                {ps.has_warning ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    {ps.warning_reason}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-emerald-700 font-semibold">Valid</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right space-x-2">
                                <Link
                                  to={`/payroll/payslips/${ps.id}`}
                                  className="text-blue-600 hover:text-blue-800 font-bold"
                                >
                                  Details
                                </Link>
                                <button
                                  onClick={() => handleDownloadPDF(ps.id)}
                                  className="text-emerald-600 hover:text-emerald-800 font-bold inline-flex items-center gap-0.5"
                                >
                                  <FileText className="w-3 h-3" /> PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {payruns.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No payruns configured yet.</p>
            <p className="text-xs text-gray-400 mt-1">Use the wizard above to run your first draft payroll.</p>
          </div>
        )}
      </div>

      {/* 2-Step Payrun Creation Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl overflow-hidden border border-gray-200">
            {/* Wizard Modal Header */}
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                  Payrun Creation Wizard (Step {step} of 2)
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  {step === 1 ? 'Configure Payrun Scope & Schedule' : 'Review & Select Eligible Employees'}
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-emerald-200 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {wizardError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                {wizardError}
              </div>
            )}

            {/* Step 1: Scope & Dates */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payrun Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. August 2026 Regular Salary"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Salary Structure</label>
                  <select
                    value={structureId}
                    onChange={(e) => setStructureId(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Period Start</label>
                    <input
                      type="date"
                      required
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Period End</label>
                    <input
                      type="date"
                      required
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Employee Type Filter (Optional)</label>
                  <select
                    value={employeeType}
                    onChange={(e) => setEmployeeType(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">All Employee Types</option>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowWizard(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Querying Eligibility...' : 'Next: Find Employees →'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Employee Selection & Generation */}
            {step === 2 && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-600 font-semibold bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <span className="flex items-center gap-1.5 text-emerald-900 font-bold">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Eligible Employees ({eligibleEmployees.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmpIds.length === eligibleEmployees.length) {
                        setSelectedEmpIds([]);
                      } else {
                        setSelectedEmpIds(eligibleEmployees.map((e) => e.id));
                      }
                    }}
                    className="text-emerald-700 hover:text-emerald-900 underline font-bold"
                  >
                    {selectedEmpIds.length === eligibleEmployees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  {eligibleEmployees.map((emp) => {
                    const isSelected = selectedEmpIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmpIds((prev) => [...prev, emp.id]);
                              } else {
                                setSelectedEmpIds((prev) => prev.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-bold text-gray-900">{emp.name}</p>
                            <p className="text-gray-400">{emp.job_position || 'Staff'} · {emp.department_name}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-gray-600 font-bold">
                          Wage: ₹{Number(emp.contract_wage || 0).toLocaleString('en-IN')}
                        </span>
                      </label>
                    );
                  })}

                  {eligibleEmployees.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No active contracts match the selected period and structure filter.
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePayrun}
                    disabled={submitting || selectedEmpIds.length === 0}
                    className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Computing Payslips...' : `Create Payrun (${selectedEmpIds.length} Selected)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
