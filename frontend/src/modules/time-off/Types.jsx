import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { Search, Plus, Edit2, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Types() {
  const { role } = useAuth();
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    unit: 'days',
    requires_allocation: true,
    affects_payroll: false,
    approval_type: 'manager',
    work_entry_type: 'leave',
    display_color: 'blue',
    notes: '',
    status: 'active',
  });

  // Modal State for New Type
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canEdit = ['admin', 'hr_manager'].includes(role);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async (search = '') => {
    setLoading(true);
    try {
      const { data } = await client.get('/time-off/types', { params: { search } });
      setTypes(data);
      if (data.length > 0 && !selectedType) {
        selectType(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch time off types', err);
    } finally {
      setLoading(false);
    }
  };

  const selectType = (type) => {
    setSelectedType(type);
    setFormData({
      name: type.name || '',
      unit: type.unit || 'days',
      requires_allocation: type.requires_allocation ?? true,
      affects_payroll: type.affects_payroll ?? false,
      approval_type: type.approval_type || 'manager',
      work_entry_type: type.work_entry_type || 'leave',
      display_color: type.display_color || 'blue',
      notes: type.notes || '',
      status: type.status || 'active',
    });
    setIsEditing(false);
  };

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    fetchTypes(q);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedType) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await client.put(`/time-off/types/${selectedType.id}`, formData);
      setSelectedType(data);
      setIsEditing(false);
      fetchTypes(searchQuery);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update time off type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await client.post('/time-off/types', formData);
      setShowModal(false);
      selectType(data);
      fetchTypes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create leave type');
    } finally {
      setSubmitting(false);
    }
  };

  const openNewModal = () => {
    setFormData({
      name: '',
      unit: 'days',
      requires_allocation: true,
      affects_payroll: false,
      approval_type: 'manager',
      work_entry_type: 'leave',
      display_color: 'blue',
      notes: '',
      status: 'active',
    });
    setError('');
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" />
            Time Off Types Configuration
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure leave policies, approval rules, allocation constraints, and payroll integrations
          </p>
        </div>
      </div>

      {/* Main Split Layout: Left List View, Right Form View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List View */}
        <div className="lg:col-span-5 bg-card border border-border rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">Time Off Types</h2>
              <p className="text-xs text-muted-foreground font-medium">List view opened from Time Off → Time Off Types</p>
            </div>
            {canEdit && (
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> NEW
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search time off types..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Table of Types */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 font-bold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Allocation</th>
                  <th className="px-3 py-3">Approval</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {types.map((type) => (
                  <tr
                    key={type.id}
                    onClick={() => selectType(type)}
                    className={`cursor-pointer transition-colors ${
                      selectedType?.id === type.id
                        ? 'bg-blue-50/80 font-bold text-blue-900'
                        : 'hover:bg-muted/30 text-gray-700'
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">{type.name}</td>
                    <td className="px-3 py-3 capitalize">{type.unit}</td>
                    <td className="px-3 py-3">
                      {type.requires_allocation ? (
                        <span className="text-blue-700 font-bold">Required</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3 capitalize">{type.approval_type || 'Manager'}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {type.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && types.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">No time off types found.</div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground font-medium italic">
            Useful note: this list defines policy rules, not employee transactions.
          </p>
        </div>

        {/* Right Form View */}
        <div className="lg:col-span-7 bg-card border border-border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
          {selectedType ? (
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                    Time Off Type / {selectedType.name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Form view of one time off type</p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel Edit' : 'EDIT'}
                  </button>
                )}
              </div>

              {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Type Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary focus:border-primary disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Approval</label>
                  <select
                    disabled={!isEditing}
                    value={formData.approval_type}
                    onChange={(e) => setFormData({ ...formData, approval_type: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary focus:border-primary disabled:opacity-75"
                  >
                    <option value="manager">Manager</option>
                    <option value="officer">Officer / HR</option>
                    <option value="no_approval">No Approval Required</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Unit</label>
                  <select
                    disabled={!isEditing}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary focus:border-primary disabled:opacity-75"
                  >
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Payroll / Work Entry</label>
                  <select
                    disabled={!isEditing}
                    value={formData.work_entry_type}
                    onChange={(e) => setFormData({ ...formData, work_entry_type: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary focus:border-primary disabled:opacity-75"
                  >
                    <option value="leave">Leave Work Entry</option>
                    <option value="unpaid">Unpaid Leave</option>
                    <option value="sick">Sick Leave Work Entry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Requires Allocation</label>
                  <select
                    disabled={!isEditing}
                    value={formData.requires_allocation ? 'yes' : 'no'}
                    onChange={(e) => setFormData({ ...formData, requires_allocation: e.target.value === 'yes' })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary focus:border-primary disabled:opacity-75"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Display Color</label>
                  <select
                    disabled={!isEditing}
                    value={formData.display_color}
                    onChange={(e) => setFormData({ ...formData, display_color: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary focus:border-primary disabled:opacity-75"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="purple">Purple</option>
                    <option value="rose">Rose</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-bold uppercase tracking-wider mb-1">Active</label>
                  <select
                    disabled={!isEditing}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary focus:border-primary disabled:opacity-75"
                  >
                    <option value="active">True (Active)</option>
                    <option value="archived">False (Archived)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Configuration Notes</label>
                <textarea
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Standard annual leave. Balance comes from approved allocations."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:ring-primary focus:border-primary disabled:opacity-75"
                />
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Policy Changes'}
                  </button>
                </div>
              )}

              <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground font-medium italic">
                  Useful note: Time Off Type drives approval behavior and whether a request needs an allocation.
                </p>
              </div>
            </form>
          ) : (
            <div className="text-center py-16 text-muted-foreground">Select a time off type from the list to view its policy configuration.</div>
          )}
        </div>
      </div>

      {/* New Type Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-foreground">Create Time Off Type</h3>
            <p className="text-xs text-muted-foreground">Define a new leave policy rule for your organization</p>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateType} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-muted-foreground mb-1">Type Name</label>
                <input
                  type="text"
                  required
                  placeholder="Paid Time Off, Sick Leave, Comp Off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Approval</label>
                  <select
                    value={formData.approval_type}
                    onChange={(e) => setFormData({ ...formData, approval_type: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="manager">Manager</option>
                    <option value="officer">Officer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Configuration Notes</label>
                <textarea
                  rows={2}
                  placeholder="Policy description..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl p-2 text-xs"
                />
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
                  {submitting ? 'Creating...' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
