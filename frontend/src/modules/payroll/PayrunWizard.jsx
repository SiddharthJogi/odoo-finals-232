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
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export default function PayrunWizard() {
  const { addToast } = useToast();
  const [payruns, setPayruns] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayrun, setExpandedPayrun] = useState(null);
  const [payrunDetails, setPayrunDetails] = useState({});

  // Search & Filter State for Payruns List
  const [payrunSearch, setPayrunSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Wizard Modal State
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('February 2026');
  const [structureId, setStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-02-01');
  const [periodEnd, setPeriodEnd] = useState('2026-02-28');
  const [employeeType, setEmployeeType] = useState('');
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
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
        if (data.length > 0) setStructureId(data[0].id.toString());
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
      setActionSuccessMsg(`Payrun successfully created with ID #${data.payrun.id}.`);
      fetchPayruns();
      openPayrunDetails(data.payrun.id);
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
      setActionSuccessMsg(`Payrun #${payrunId} successfully updated to '${labelMap[targetStatus] || targetStatus}'.`);
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

  const filteredPayruns = payruns.filter((pr) => {
    const matchesSearch = !payrunSearch || pr.name.toLowerCase().includes(payrunSearch.toLowerCase());
    const matchesYear = !selectedYear || pr.period_start.startsWith(selectedYear);
    return matchesSearch && matchesYear;
  });

  const filteredEligibleEmployees = eligibleEmployees.filter((emp) =>
    !empSearch || emp.name.toLowerCase().includes(empSearch.toLowerCase())
  );

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800 border-gray-300',
    computed: 'bg-blue-100 text-blue-800 border-blue-300',
    validated: 'bg-purple-100 text-purple-800 border-purple-300',
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  if (loading) return <div className="text-center py-16 text-muted-foreground font-medium">Loading payroll workspace...</div>;

  return (
    <div className="pb-12 space-y-6">
      {/* Top Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Payruns
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Payrun view for payroll periods and employee payslip execution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/payroll/structures"
            className="px-3.5 py-2 text-xs font-bold bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition shadow-xs"
          >
            Salary Structures
          </Link>
          <Link
            to="/payroll/rules"
            className="px-3.5 py-2 text-xs font-bold bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition shadow-xs"
          >
            Salary Rules
          </Link>
          <button
            onClick={() => {
              setShowWizard(true);
              setStep(1);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            NEW
          </button>
        </div>
      </div>

      {/* Payrun Search & Year Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search payruns..."
            value={payrunSearch}
            onChange={(e) => setPayrunSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {actionSuccessMsg}
        </div>
      )}

      {/* Payruns List Cards */}
      <div className="space-y-4">
        {filteredPayruns.map((pr) => {
          const isExpanded = expandedPayrun === pr.id;
          const currentDetails = payrunDetails[pr.id];
          const warningsCount = currentDetails?.payslips?.filter((p) => p.has_warning).length || 0;

          return (
            <div key={pr.id} className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">{pr.name}</h3>
                      <span className={`px-3 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider border ${statusColors[pr.status] || 'bg-gray-100'}`}>
                        {pr.status}
                      </span>
                      {warningsCount > 0 ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          ⚠️ {warningsCount} warning{warningsCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          No warnings
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{pr.period_start} — {pr.period_end}</span>
                    </p>
                  </div>

                  {/* Lifecycle Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {pr.status === 'draft' && (
                      <button
                        onClick={() => handleTransition(pr.id, 'compute')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                      >
                        COMPUTE
                      </button>
                    )}

                    {pr.status === 'computed' && (
                      <button
                        onClick={() => handleTransition(pr.id, 'validate')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                      >
                        VALIDATE
                      </button>
                    )}

                    {pr.status === 'validated' && (
                      <button
                        onClick={() => handleTransition(pr.id, 'mark-paid')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                      >
                        MARK PAID
                      </button>
                    )}

                    <button
                      onClick={() => handleSendPayslips(pr.id)}
                      className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl transition"
                    >
                      SEND PAYSLIPS
                    </button>

                    <button
                      onClick={() => openPayrunDetails(pr.id)}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Open Payrun
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Payrun Workspace */}
              {isExpanded && (
                <div className="bg-muted/20 border-t border-border p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-bold text-foreground">Payrun / {pr.name}</h4>
                      <p className="text-xs text-muted-foreground font-medium">Open one Payrun to compute and manage its payslips</p>
                    </div>
                  </div>

                  {/* Payrun Payslips Table */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                    <div className="px-5 py-4 border-b border-border font-bold text-xs uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                      <span>Payslips in this Payrun</span>
                      <span className="text-foreground">{currentDetails?.payslips?.length || 0} Total</span>
                    </div>

                    {!currentDetails ? (
                      <div className="text-xs text-muted-foreground p-6 text-center">Loading payslip breakdowns...</div>
                    ) : currentDetails.payslips?.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-6 text-center">No payslips generated for this payrun.</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 font-bold uppercase text-muted-foreground border-b border-border">
                          <tr>
                            <th className="px-5 py-3">Employee</th>
                            <th className="px-4 py-3">Warning</th>
                            <th className="px-4 py-3">Worked</th>
                            <th className="px-4 py-3 text-right">Basic</th>
                            <th className="px-4 py-3 text-right">Gross</th>
                            <th className="px-4 py-3 text-right">Net</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">PDF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium">
                          {currentDetails.payslips.map((ps) => (
                            <tr key={ps.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-3 font-bold text-foreground">
                                {ps.employee_name || `Employee #${ps.employee_id}`}
                              </td>
                              <td className="px-4 py-3">
                                {ps.has_warning ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    {ps.warning_reason || 'Warning'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-bold">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">{ps.worked_days || 22} days</td>
                              <td className="px-4 py-3 text-right font-mono">
                                ₹{Number(ps.gross_total * 0.6 || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                ₹{Number(ps.gross_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                                ₹{Number(ps.net_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Done
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDownloadPDF(ps.id)}
                                  className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" /> PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground font-medium italic">
                    Useful note: warnings such as missing account data or duplicate payslips should be visible before payroll is finalized.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground font-medium italic text-center pt-2">
        Useful note: each Payrun represents one payroll period and groups the payslips generated for that period.
      </p>

      {/* 2-Step Payrun Creation Wizard Modal (Screenshot 2) */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden space-y-4">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="font-extrabold text-xl text-foreground tracking-tight">
                  {step === 1 ? 'New Pay Run' : 'Select Employee Records'}
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {step === 1
                    ? 'Participant note: this popup collects the payrun scope only. Continue should not create the Payrun yet.'
                    : 'The Payrun is created only after employee selection.'}
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-muted-foreground hover:text-foreground font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {wizardError && (
              <div className="mx-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                {wizardError}
              </div>
            )}

            {/* Step 1: Scope Selection */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="p-6 space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Payrun Name</label>
                  <input
                    type="text"
                    required
                    placeholder="February 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Pay Structure</label>
                  <select
                    value={structureId}
                    onChange={(e) => setStructureId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary"
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
                    <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Period Start</label>
                    <input
                      type="date"
                      required
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Period End</label>
                    <input
                      type="date"
                      required
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowWizard(false)}
                    className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {submitting ? 'Querying...' : 'Continue'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Employee Selection Table */}
            {step === 2 && (
              <div className="p-6 space-y-4 text-xs font-medium">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs"
                  />
                </div>

                <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 font-bold uppercase text-muted-foreground border-b border-border sticky top-0 bg-card">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedEmpIds.length === eligibleEmployees.length && eligibleEmployees.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmpIds(eligibleEmployees.map((emp) => emp.id));
                              } else {
                                setSelectedEmpIds([]);
                              }
                            }}
                            className="rounded border-border text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Working Hours</th>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3 text-right">Wage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {filteredEligibleEmployees.map((emp) => {
                        const isChecked = selectedEmpIds.includes(emp.id);
                        return (
                          <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEmpIds((prev) => [...prev, emp.id]);
                                  } else {
                                    setSelectedEmpIds((prev) => prev.filter((id) => id !== emp.id));
                                  }
                                }}
                                className="rounded border-border text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">{emp.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{emp.working_schedule_name || '40 hours/week'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{emp.contract_start_date || 'Jan 1'}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                              ₹{Number(emp.wage || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {eligibleEmployees.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No active employee contracts match this payrun structure and period.
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePayrun}
                    disabled={submitting || selectedEmpIds.length === 0}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {submitting ? 'Creating Payrun...' : `Create payrun (${selectedEmpIds.length} Selected)`}
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground font-medium italic">
                  Participant note: user selects one or more eligible employees, then clicks Create Payrun. The created Payrun should contain only the selected employees.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
