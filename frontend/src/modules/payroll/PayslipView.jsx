import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../../api/client';

export default function PayslipView() {
  const { id } = useParams();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/payroll/payslips/${id}`)
      .then(({ data }) => setPayslip(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading payslip...</div>;
  if (!payslip) return <div className="text-center py-12 text-red-500">Payslip not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payslip #{payslip.id}</h1>
        <a href={`/api/payroll/payslips/${id}/pdf`} target="_blank" rel="noreferrer"
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Download PDF
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Employee</p>
            <p className="font-medium">{payslip.employee_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Worked Days</p>
            <p className="font-medium">{payslip.worked_days}</p>
          </div>
        </div>

        {payslip.has_warning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-sm text-yellow-800">
            ⚠ {payslip.warning_reason}
          </div>
        )}

        <h2 className="text-lg font-semibold mb-3">Computation Breakdown</h2>
        <table className="min-w-full divide-y divide-gray-200 mb-6">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(payslip.lines || []).map((line, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{line.label}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    line.category === 'deduction' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>{line.category}</span>
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {line.category === 'deduction' ? '-' : ''}₹{Number(line.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Gross</p>
            <p className="text-xl font-bold text-gray-900">₹{Number(payslip.gross_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Net</p>
            <p className="text-xl font-bold text-green-600">₹{Number(payslip.net_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
