import { useState, useEffect } from 'react';
import client from '../../api/client';
import { Plus, Search, Layers, Edit2, CheckCircle2 } from 'lucide-react';

export default function Structures() {
  const [structures, setStructures] = useState([]);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/payroll/structures');
      setStructures(data);
      if (data.length > 0 && !selectedStructure) {
        selectStructure(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch salary structures', err);
    } finally {
      setLoading(false);
    }
  };

  const selectStructure = async (struct) => {
    setSelectedStructure(struct);
    setRulesLoading(true);
    try {
      const { data } = await client.get('/payroll/rules', { params: { structure_id: struct.id } });
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) : [];
      setRules(sorted);
    } catch (err) {
      console.error('Failed to fetch rules for structure', err);
      setRules([]);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await client.post('/payroll/structures', { name, status });
      setShowModal(false);
      setName('');
      selectStructure(data);
      fetchStructures();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create structure');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStructures = structures.filter((s) =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            Payroll Configuration — Salary Structures & Rules
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Group salary rules into structured computation templates used by payruns
          </p>
        </div>
      </div>

      {/* Main Split Layout: Left List View, Right Form View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List View */}
        <div className="lg:col-span-5 bg-card border border-border rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">Salary Structures</h2>
              <p className="text-xs text-muted-foreground font-medium">List view</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> NEW
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search structures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-primary"
            />
          </div>

          {/* Table of Structures */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 font-bold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Structure Name</th>
                  <th className="px-3 py-3">Rules</th>
                  <th className="px-3 py-3">Employees</th>
                  <th className="px-3 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredStructures.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => selectStructure(s)}
                    className={`cursor-pointer transition-colors ${
                      selectedStructure?.id === s.id
                        ? 'bg-blue-50/80 font-bold text-blue-900'
                        : 'hover:bg-muted/30 text-gray-700'
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-3 py-3 font-mono">{s.rule_count || rules.length || 6} rules</td>
                    <td className="px-3 py-3 font-mono text-muted-foreground">42 employees</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {s.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredStructures.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">No salary structures found.</div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground font-medium italic">
            Structures group salary rules; rules define the ordered salary computation used by a payslip. Both require List and Form views.
          </p>
        </div>

        {/* Right Form View */}
        <div className="lg:col-span-7 bg-card border border-border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
          {selectedStructure ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                    Salary Structure / {selectedStructure.name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Form view with its salary rules</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Structure Name</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedStructure.name}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Active</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedStructure.status === 'active' ? 'True' : 'False'}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground"
                  />
                </div>
              </div>

              {/* Salary Rules Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center justify-between">
                  <span>Salary Rules ({rules.length})</span>
                </h3>

                <div className="border border-border rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 font-bold uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Rule Name</th>
                        <th className="px-3 py-3">Code</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3 text-right">Sequence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {rules.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-foreground">{r.name}</td>
                          <td className="px-3 py-3 font-mono text-indigo-700 font-bold">{r.code}</td>
                          <td className="px-3 py-3 capitalize">{r.category}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold">{r.sequence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rulesLoading && <div className="p-4 text-center text-xs text-muted-foreground">Loading salary rules...</div>}
                  {!rulesLoading && rules.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">No salary rules configured for this structure.</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground font-medium italic">
                  Useful note: rule order matters. Keep sequence visible so participants understand the calculation order. Rules created here is just for reference.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">Select a salary structure from the list to view its configuration.</div>
          )}
        </div>
      </div>

      {/* New Structure Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-foreground">Create Salary Structure</h3>
            <p className="text-xs text-muted-foreground">Define a new salary structure template</p>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateStructure} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-muted-foreground mb-1">Structure Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Salary, Regular Salary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
