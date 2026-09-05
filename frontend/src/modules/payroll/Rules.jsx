import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { Settings2, TrendingUp, TrendingDown, Calculator, Percent, Hash } from 'lucide-react';

const CATEGORY_STYLES = {
  basic: 'bg-blue-50 text-blue-700 border border-blue-200',
  allowance: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  deduction: 'bg-red-50 text-red-700 border border-red-200',
  gross: 'bg-violet-50 text-violet-700 border border-violet-200',
  net: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

const METHOD_ICONS = {
  fixed: Hash,
  percentage: Percent,
  formula: Calculator,
};

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [structures, setStructures] = useState([]);
  const [structureId, setStructureId] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Load structures first
  useEffect(() => {
    client.get('/payroll/structures')
      .then(({ data }) => {
        setStructures(data);
        if (data.length > 0) setStructureId(String(data[0].id));
      })
      .catch(() => addToast('Failed to load structures', 'error'));
  }, []);

  // Load rules when structure changes
  useEffect(() => {
    if (!structureId) return;
    setLoading(true);
    client.get(`/payroll/rules?structure_id=${structureId}`)
      .then(({ data }) => setRules(data))
      .catch(() => addToast('Failed to load salary rules', 'error'))
      .finally(() => setLoading(false));
  }, [structureId]);

  const selectedStructure = structures.find((s) => String(s.id) === structureId);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Settings2 className="w-7 h-7 text-violet-600" />
            Salary Rules
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Config-driven rule engine — Fixed / Percentage / Formula · executed in sequence order
          </p>
        </div>

        {/* Structure Selector */}
        <select
          value={structureId}
          onChange={(e) => setStructureId(e.target.value)}
          className="text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 font-semibold focus:ring-2 focus:ring-violet-500 focus:outline-none shadow-sm"
        >
          {structures.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStructure && (
        <div className="mb-5 bg-violet-50 border border-violet-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Settings2 className="w-4 h-4 text-violet-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-violet-900">{selectedStructure.name}</p>
            {selectedStructure.description && (
              <p className="text-xs text-violet-700 mt-0.5">{selectedStructure.description}</p>
            )}
          </div>
          <span className="ml-auto text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
            {rules.length} rules
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-14">Seq</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Value / Formula</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  ))}
                </tr>
              ))
              : rules.map((rule) => {
                const MethodIcon = METHOD_ICONS[rule.calc_method] || Hash;
                const isDeduction = rule.category === 'deduction';
                return (
                  <tr key={rule.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 text-xs font-mono text-gray-400 font-bold">{rule.sequence}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-semibold ${isDeduction ? 'text-red-700' : 'text-gray-900'} flex items-center gap-1.5`}>
                        {isDeduction ? <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {rule.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-500 bg-gray-50">{rule.code}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[rule.category] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {rule.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                        <MethodIcon className="w-3.5 h-3.5 text-gray-400" />
                        {rule.calc_method}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-sm text-gray-700">
                      {rule.calc_method === 'formula'
                        ? <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{rule.formula_text}</span>
                        : rule.calc_method === 'percentage'
                        ? <span className="text-violet-700 font-bold">{rule.amount}% <span className="text-xs text-gray-400">of {rule.base_code}</span></span>
                        : rule.amount ? <span className="text-gray-900 font-bold">₹{Number(rule.amount).toLocaleString('en-IN')}</span> : '—'
                      }
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>

        {!loading && rules.length === 0 && structureId && (
          <div className="py-16 text-center">
            <Settings2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No salary rules configured</p>
            <p className="text-xs text-gray-400 mt-1">Rules are seeded via the database seed script.</p>
          </div>
        )}
      </div>
    </div>
  );
}
