import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { Settings2, TrendingUp, TrendingDown, Calculator, Percent, Hash, Plus, Edit2, X } from 'lucide-react';

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
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', category: 'allowance', sequence: 1, calc_method: 'fixed',
    amount: '', base_code: '', formula_text: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
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

  const openForm = (rule = null) => {
    setEditingRule(rule);
    setFormError('');
    setFormData(rule
      ? { name: rule.name, code: rule.code, category: rule.category, sequence: rule.sequence, calc_method: rule.calc_method, amount: rule.amount ?? '', base_code: rule.base_code || '', formula_text: rule.formula_text || '' }
      : { name: '', code: '', category: 'allowance', sequence: rules.length + 1, calc_method: 'fixed', amount: '', base_code: '', formula_text: '' });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingRule(null); setFormError(''); };

  const saveRule = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      structure_id: Number(structureId),
      name: formData.name.trim(), code: formData.code.trim().toUpperCase(),
      category: formData.category, sequence: Number(formData.sequence), calc_method: formData.calc_method,
      amount: formData.calc_method === 'formula' ? undefined : Number(formData.amount),
      base_code: formData.calc_method === 'percentage' ? formData.base_code.trim().toUpperCase() : undefined,
      formula_text: formData.calc_method === 'formula' ? formData.formula_text.trim() : undefined,
    };
    try {
      if (editingRule) await client.put(`/payroll/rules/${editingRule.id}`, payload);
      else await client.post('/payroll/rules', payload);
      const { data } = await client.get(`/payroll/rules?structure_id=${structureId}`);
      setRules(data);
      closeForm();
      addToast(editingRule ? 'Salary rule updated' : 'Salary rule added', 'success');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save salary rule');
    } finally { setSaving(false); }
  };

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

        <div className="flex items-center gap-2">
          <select value={structureId} onChange={(e) => setStructureId(e.target.value)} className="text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 font-semibold focus:ring-2 focus:ring-violet-500 focus:outline-none shadow-sm">
            {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {structureId && <button onClick={() => openForm()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-violet-600 text-white rounded-lg hover:bg-violet-700 shadow-sm"><Plus className="w-3.5 h-3.5" /> Add Rule</button>}
        </div>
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
              <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
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
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openForm(rule)} title="Edit salary rule" className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 rounded-t-2xl">
              <div><h2 className="text-lg font-extrabold text-gray-900">{editingRule ? 'Edit Salary Rule' : 'Add Salary Rule'}</h2><p className="text-xs text-gray-500 mt-0.5">Define how this component is calculated in the payslip.</p></div>
              <button onClick={closeForm} className="p-2 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveRule} className="space-y-5 p-6">
              {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-gray-700">Rule name<input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="House Rent Allowance" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal" /></label>
                <label className="text-sm font-semibold text-gray-700">Payroll code<input required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="HRA" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono font-normal uppercase" /></label>
                <label className="text-sm font-semibold text-gray-700">Category<select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"><option value="basic">Basic salary</option><option value="allowance">Allowance</option><option value="deduction">Deduction</option><option value="gross">Gross total</option><option value="net">Net salary</option></select></label>
                <label className="text-sm font-semibold text-gray-700">Sequence<input required type="number" min="0" value={formData.sequence} onChange={(e) => setFormData({ ...formData, sequence: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal" /></label>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                <label className="block text-sm font-semibold text-violet-900">Calculation method<select value={formData.calc_method} onChange={(e) => setFormData({ ...formData, calc_method: e.target.value })} className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-normal"><option value="fixed">Fixed amount</option><option value="percentage">Percentage of another rule</option><option value="formula">Formula</option></select></label>
                {formData.calc_method !== 'formula' && <label className="mt-3 block text-sm font-semibold text-violet-900">{formData.calc_method === 'percentage' ? 'Percentage value' : 'Amount (₹)'}<input required type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder={formData.calc_method === 'percentage' ? '20' : '3000'} className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-normal" /></label>}
                {formData.calc_method === 'percentage' && <label className="mt-3 block text-sm font-semibold text-violet-900">Based on payroll code<input required value={formData.base_code} onChange={(e) => setFormData({ ...formData, base_code: e.target.value })} placeholder="BASIC" className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-mono font-normal uppercase" /></label>}
                {formData.calc_method === 'formula' && <label className="mt-3 block text-sm font-semibold text-violet-900">Formula expression<input required value={formData.formula_text} onChange={(e) => setFormData({ ...formData, formula_text: e.target.value })} placeholder="basic + hra + ta - pf" className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-mono font-normal" /></label>}
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button disabled={saving} className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">{saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Add Rule'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
