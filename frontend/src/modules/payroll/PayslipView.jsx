import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { FileText, ArrowLeft, Download, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

export default function PayslipView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState('');

  useEffect(() => {
    client.get(`/payroll/payslips/${id}`)
      .then(({ data }) => setPayslip(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const toggleExplanation = async () => {
    const nextVisible = !showExplanation;
    setShowExplanation(nextVisible);
    if (!nextVisible || explanation) return;

    setExplanationLoading(true);
    setExplanationError('');
    try {
      const { data } = await client.get(`/payroll/payslips/${id}/explanation`);
      setExplanation(data);
    } catch (err) {
      setExplanationError(err.response?.data?.error || 'Unable to load payslip explanation.');
    } finally {
      setExplanationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="space-y-2 mt-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className="text-center py-24">
        <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500 font-semibold">Payslip not found</p>
        <button onClick={() => navigate('/payroll')} className="mt-4 text-blue-600 text-sm underline">
          Back to Payruns
        </button>
    );
  }

  const earnings = (payslip.lines || []).filter((l) => l.category !== 'deduction');
  const deductions = (payslip.lines || []).filter((l) => l.category === 'deduction');

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate('/payroll')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Payruns
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Payslip #{String(payslip.id).padStart(5, '0')}
          </h1>
          <p className="text-xs text-gray-500 mt-1">{payslip.employee_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleExplanation}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            {showExplanation ? 'Hide Explanation' : 'Explain This'}
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Employee Info Bar */}
        <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-blue-200 font-semibold uppercase tracking-wide">Employee</p>
              <p className="text-sm font-bold mt-0.5">{payslip.employee_name || `#${payslip.employee_id}`}</p>
            </div>
            <div>
              <p className="text-[11px] text-blue-200 font-semibold uppercase tracking-wide">Payslip Ref</p>
              <p className="text-sm font-bold mt-0.5 font-mono">PS-{String(payslip.id).padStart(5, '0')}</p>
            </div>
            <div>
              <p className="text-[11px] text-blue-200 font-semibold uppercase tracking-wide">Worked Days</p>
              <p className="text-sm font-bold mt-0.5">{payslip.worked_days} days</p>
            </div>
            <div>
              <p className="text-[11px] text-blue-200 font-semibold uppercase tracking-wide">Bank Account</p>
              <p className={`text-sm font-bold mt-0.5 ${!payslip.bank_account ? 'text-red-300' : ''}`}>
                {payslip.bank_account || '⚠ Not Registered'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {showExplanation && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-3 text-sm text-amber-950">
                  {explanationLoading && <p className="text-xs text-amber-800">Preparing the explanation...</p>}
                  {explanationError && <p className="text-xs text-red-700">{explanationError}</p>}
                  {explanation && (
                    <>
                      <div>
                        <p className="font-extrabold">How this payslip was calculated</p>
                        <p className="text-xs text-amber-800 mt-1">
                          {explanation.employee_name || 'This employee'} was paid for {explanation.worked_days || 0} worked days.
                          The gross amount combines {explanation.earnings_count} earning {explanation.earnings_count === 1 ? 'component' : 'components'},
                          {' '}then deductions of ₹{Number(explanation.deduction_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          {' '}were subtracted to reach the net salary.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/70 rounded-lg p-3 border border-amber-200">
                          <p className="text-amber-700">Gross earnings</p>
                          <p className="font-bold mt-1">₹{Number(explanation.gross_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-3 border border-amber-200">
                          <p className="text-amber-700">Deductions</p>
                          <p className="font-bold mt-1">₹{Number(explanation.deduction_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-3 border border-amber-200">
                          <p className="text-amber-700">Net payable</p>
                          <p className="font-bold mt-1">₹{Number(explanation.net_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <p className="text-xs text-amber-800">{explanation.compliance.message}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compliance Warning */}
          {payslip.has_warning && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Compliance Warning</p>
                <p className="text-xs text-amber-800 mt-0.5">{payslip.warning_reason}</p>
              </div>
            </div>
          )}

          {/* Earnings */}
          {earnings.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Earnings
              </h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-emerald-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-emerald-700 uppercase">Component</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-emerald-700 uppercase">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {earnings.map((line, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{line.label}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-700">
                          ₹{Number(line.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Deductions */}
          {deductions.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Deductions
              </h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-red-700 uppercase">Component</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-red-700 uppercase">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deductions.map((line, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{line.label}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-red-600">
                          -₹{Number(line.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-sm">
              <span className="text-gray-600 font-medium">Total Gross Earnings</span>
              <span className="font-bold text-gray-900 font-mono">
                ₹{Number(payslip.gross_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-sm">
              <span className="text-gray-600 font-medium">Total Deductions</span>
              <span className="font-bold text-red-600 font-mono">
                -₹{(Number(payslip.gross_total) - Number(payslip.net_total)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 mt-1">
              <span className="text-base font-extrabold text-gray-900">Net Salary Payable</span>
              <span className="text-xl font-extrabold text-emerald-600 font-mono">
                ₹{Number(payslip.net_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {!payslip.has_warning && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
              <CheckCircle2 className="w-4 h-4" />
              All compliance checks passed — payslip ready for disbursement.
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
          <p className="text-[11px] text-gray-400 text-center">
            System-generated payslip · PeoplePay360 ERP · Reference PS-{String(payslip.id).padStart(5, '0')}
          </p>
        </div>
      </div>
    </div>
  );
}
