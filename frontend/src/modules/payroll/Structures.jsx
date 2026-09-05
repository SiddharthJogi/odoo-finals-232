import { useState, useEffect } from 'react';
import client from '../../api/client';
import { Plus, Edit2, X } from 'lucide-react';

export default function Structures() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', pay_frequency: 'monthly', currency: 'INR', status: 'active' });
  const [components, setComponents] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStructures = () => {
    setLoading(true);
    client.get('/payroll/structures')
      .then(({ data }) => setStructures(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  const openModal = async (structure = null) => {
    setError('');
    if (structure) {
      setEditingStructure(structure);
      setFormData({ name: structure.name, code: structure.code || '', description: structure.description || '', pay_frequency: structure.pay_frequency || 'monthly', currency: structure.currency || 'INR', status: structure.status });
      try {
        const { data } = await client.get(`/payroll/rules?structure_id=${structure.id}`);
        setComponents(data.filter((rule) => ['allowance', 'deduction'].includes(rule.category) && rule.calc_method === 'fixed'));
      } catch (err) {
        setError('Could not load salary components');
      }
    } else {
      setEditingStructure(null);
      setFormData({ name: '', code: '', description: '', pay_frequency: 'monthly', currency: 'INR', status: 'active' });
      setComponents([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStructure(null);
    setFormData({ name: '', code: '', description: '', pay_frequency: 'monthly', currency: 'INR', status: 'active' });
    setComponents([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let structureId = editingStructure?.id;
      if (editingStructure) await client.put(`/payroll/structures/${editingStructure.id}`, formData);
      else structureId = (await client.post('/payroll/structures', formData)).data.id;

      for (const [index, component] of components.entries()) {
        const label = component.name.trim();
        if (!label || component.amount === '' || Number(component.amount) < 0) throw new Error('Every salary component needs a label and a non-negative amount.');
        const payload = {
          structure_id: Number(structureId), name: label, code: component.code || label.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase(),
          category: component.category || 'allowance', sequence: component.sequence || 10 + index,
          calc_method: 'fixed', amount: Number(component.amount),
          performance_based: component.performance_based ? true : null,
        };
        if (component.id) await client.put(`/payroll/rules/${component.id}`, payload);
        else await client.post('/payroll/rules', payload);
      }
      fetchStructures();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save structure');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && structures.length === 0) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Salary Structures</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Structure
        </button>
      </div>

      <div className="grid gap-4">
        {structures.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex justify-between items-center group hover:border-blue-300 transition">
            <div>
              <h3 className="font-semibold text-gray-900">{s.name}</h3>
              <p className="text-xs text-gray-500 mt-1 font-mono">{s.code} · {s.pay_frequency} · {s.currency}</p>
              {s.description && <p className="text-sm text-gray-500 mt-1">{s.description}</p>}
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 text-xs rounded-full font-medium ${s.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                {s.status}
              </span>
              <button
                onClick={() => openModal(s)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Edit Structure"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {structures.length === 0 && <p className="text-center py-8 text-gray-400">No structures found.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingStructure ? 'Edit Salary Structure' : 'Create Salary Structure'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Structure Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="e.g. Standard Indian Salary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Structure Code</label>
                    <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono uppercase" placeholder="STD-INR-2026" />
                    <p className="text-[11px] text-gray-400 mt-1">Unique code used for contracts and payroll setup.</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="Describe who this structure applies to and what it includes." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Pay Frequency</label>
                    <select value={formData.pay_frequency} onChange={(e) => setFormData({ ...formData, pay_frequency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"><option value="monthly">Monthly</option><option value="biweekly">Biweekly</option><option value="weekly">Weekly</option></select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                    <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div><h3 className="text-sm font-bold text-gray-900">Salary Components</h3><p className="text-xs text-gray-500 mt-0.5">Add fixed earnings or deductions, for example HA → ₹37,000.</p></div>
                  <button type="button" onClick={() => setComponents((current) => [...current, { name: '', code: '', category: 'allowance', amount: '', sequence: current.length + 10 }])} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Add component</button>
                </div>
                {components.length === 0 ? <p className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-center text-xs text-gray-500">No custom components yet. Add allowances such as HA, transport, or deductions such as PF.</p> : <div className="space-y-2">{components.map((component, index) => <div key={component.id || `new-${index}`} className="grid grid-cols-[1fr_120px_110px_auto] gap-2 items-center"><input value={component.name} onChange={(e) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value, code: item.id ? item.code : e.target.value.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase() } : item))} placeholder="Label e.g. HA" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" /><input type="number" min="0" step="0.01" value={component.amount} onChange={(e) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: e.target.value } : item))} placeholder="Amount" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" /><select value={component.category || 'allowance'} onChange={(e) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, category: e.target.value } : item))} className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs"><option value="allowance">Earning</option><option value="deduction">Deduction</option></select><label className="flex items-center gap-1 text-[11px] text-gray-600"><input type="checkbox" checked={Boolean(component.performance_based)} onChange={(e) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, performance_based: e.target.checked } : item))} /> Performance pay</label><button type="button" onClick={() => setComponents((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-2 text-gray-400 hover:text-red-600" title="Remove unsaved component"><X className="w-4 h-4" /></button></div>)}</div>}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
