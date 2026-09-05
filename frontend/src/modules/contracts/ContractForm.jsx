import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';
import { fetchAllEmployees } from '../../api/employees';

const RIGID_LOCKED_FIELDS = ['wage', 'start_date', 'end_date', 'structure_id'];

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [form, setForm] = useState({
    employee_id: '', department_id: '', job_position: '', wage: '',
    start_date: '', end_date: '', structure_id: '', schedule_id: '', status: 'active',
    flexibility: 'flexible', joining_bonus: '0',
  });

  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // A rigid *existing* contract locks its core terms — a brand-new contract is never locked yet.
  const isLocked = isEditing && form.flexibility === 'rigid';

  useEffect(() => {
    const requests = [
      fetchAllEmployees(),
      client.get('/payroll/structures').catch(() => ({ data: [] })),
      client.get('/schedules').catch(() => ({ data: [] }))
    ];
    if (isEditing) requests.push(client.get(`/contracts/${id}`));

    Promise.all(requests).then(([empList, structRes, schedRes, contractRes]) => {
      setEmployees(empList);
      setStructures(structRes.data);
      setSchedules(schedRes.data);
      if (contractRes) {
        const contract = contractRes.data;
        setForm({
          employee_id: String(contract.employee_id),
          department_id: contract.department_id ? String(contract.department_id) : '',
          job_position: contract.job_position || '',
          wage: String(contract.wage),
          start_date: String(contract.start_date).slice(0, 10),
          end_date: contract.end_date ? String(contract.end_date).slice(0, 10) : '',
          structure_id: String(contract.structure_id),
          schedule_id: contract.schedule_id ? String(contract.schedule_id) : '',
          status: contract.status,
          flexibility: contract.flexibility || 'flexible',
          joining_bonus: String(contract.joining_bonus ?? '0'),
        });
      }
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load contract'));
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        employee_id: parseInt(form.employee_id, 10),
        department_id: form.department_id ? parseInt(form.department_id, 10) : undefined,
        wage: parseFloat(form.wage),
        structure_id: parseInt(form.structure_id, 10),
        schedule_id: form.schedule_id ? parseInt(form.schedule_id, 10) : undefined,
        end_date: form.end_date || undefined,
        joining_bonus: form.joining_bonus ? parseFloat(form.joining_bonus) : 0,
      };

      if (isEditing) {
        await client.put(`/contracts/${id}`, payload);
      } else {
        await client.post('/contracts', payload);
      }
      navigate('/contracts');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEditing ? 'Edit Contract' : 'New Contract'}</h1>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {isLocked && (
        <div className="bg-amber-50 text-amber-800 rounded-lg px-4 py-3 mb-4 text-sm">
          This contract is <strong>rigid</strong> — wage, dates and salary structure cannot be changed. Only status may be updated.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select value={form.employee_id} onChange={handleChange('employee_id')} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
            <input value={form.job_position} onChange={handleChange('job_position')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wage (Monthly)</label>
            <input type="number" step="0.01" value={form.wage} onChange={handleChange('wage')} required disabled={isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Structure</label>
            <select value={form.structure_id} onChange={handleChange('structure_id')} required disabled={isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500">
              <option value="">Select Structure</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Working Schedule</label>
            <select value={form.schedule_id} onChange={handleChange('schedule_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select Schedule</option>
              {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={handleChange('status')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={form.start_date} onChange={handleChange('start_date')} required disabled={isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
            <input type="date" value={form.end_date} onChange={handleChange('end_date')} disabled={isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flexibility</label>
            <select value={form.flexibility} onChange={handleChange('flexibility')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="flexible">Flexible — terms can be edited later</option>
              <option value="rigid">Rigid — wage/dates/structure locked once saved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Joining Bonus</label>
            <input type="number" step="0.01" min="0" value={form.joining_bonus} onChange={handleChange('joining_bonus')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Paid once, automatically added to the employee's first payslip.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/contracts')} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  );
}
