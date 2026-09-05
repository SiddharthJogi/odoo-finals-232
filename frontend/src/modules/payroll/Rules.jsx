import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [structureId, setStructureId] = useState('1');

  const loadRules = () => {
    setLoading(true);
    client.get(`/payroll/rules?structure_id=${structureId}`)
      .then(({ data }) => setRules(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRules(); }, [structureId]);

  const categoryColors = {
    basic: 'bg-blue-50 text-blue-700',
    allowance: 'bg-green-50 text-green-700',
    deduction: 'bg-red-50 text-red-700',
    gross: 'bg-purple-50 text-purple-700',
    net: 'bg-indigo-50 text-indigo-700',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Salary Rules</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Structure ID:</label>
          <input type="number" value={structureId} onChange={(e) => setStructureId(e.target.value)}
            className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading rules...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seq</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount / Formula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{rule.sequence}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{rule.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{rule.code}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColors[rule.category] || ''}`}>{rule.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{rule.calc_method}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono text-gray-600">
                    {rule.calc_method === 'formula' ? rule.formula_text :
                     rule.calc_method === 'percentage' ? `${rule.amount}% of ${rule.base_code}` :
                     rule.amount ? `₹${Number(rule.amount).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && <p className="text-center py-8 text-gray-400">No rules for this structure</p>}
        </div>
      )}
    </div>
  );
}
