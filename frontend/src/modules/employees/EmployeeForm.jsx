import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { UserCircle, ArrowLeft, FileText, Save, Loader2 } from 'lucide-react';

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isEdit = !!id;
  const [form, setForm] = useState({
    name: '', email: '', department_id: '', manager_id: '', job_position: '',
    employee_type: 'full_time', bank_account: '', status: 'active', password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    if (isEdit) {
      Promise.all([client.get(`/employees/${id}`), client.get('/schedules')])
        .then(([employeeResponse, scheduleResponse]) => {
          const data = employeeResponse.data;
          setSchedules(scheduleResponse.data.filter((schedule) => schedule.status === 'active' || schedule.id === data.schedule_id));
          setForm({
          name: data.name || '',
          email: data.email || '',
          department_id: data.department_id || '',
          manager_id: data.manager_id || '',
          job_position: data.job_position || '',
          employee_type: data.employee_type || 'full_time',
          bank_account: data.bank_account || '',
          schedule_id: data.schedule_id || '',
          status: data.status || 'active',
          password: '',
        });
      })
      .catch(() => addToast('Failed to load employee data', 'error'));
    } else {
      client.get('/schedules')
        .then(({ data }) => setSchedules(data.filter((schedule) => schedule.status === 'active')))
        .catch(() => addToast('Failed to load schedules', 'error'));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        department_id: form.department_id ? parseInt(form.department_id, 10) : undefined,
        manager_id: form.manager_id ? parseInt(form.manager_id, 10) : undefined,
        schedule_id: form.schedule_id ? parseInt(form.schedule_id, 10) : undefined,
      };
      if (isEdit || !form.password) delete payload.password;
      if (isEdit) {
        await client.put(`/employees/${id}`, payload);
        addToast('Employee updated successfully', 'success');
      } else {
        const { data } = await client.post('/employees/provision', payload);
        setNotice(data.warning || 'Employee created and login credentials emailed.');
        setTemporaryPassword(data.temporary_password || '');
        addToast(data.warning || 'Employee created and login credentials emailed.', data.warning ? 'warning' : 'success');
        setLoading(false);
        return;
      }
      navigate('/employees');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save employee');
      addToast(err.response?.data?.error || 'Failed to save employee', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/employees')}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-4 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Employees
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <UserCircle className="w-7 h-7 text-blue-600" />
          {isEdit ? 'Edit Employee' : 'New Employee'}
        </h1>
        {isEdit && (
          <Link
            to={`/employees/${id}/contracts`}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <FileText className="w-4 h-4" />
            View Contracts
          </Link>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-yellow-50 text-yellow-800 rounded-lg px-4 py-3 mb-4 text-sm">{notice}</div>}
      {temporaryPassword && (
        <div className="bg-blue-50 text-blue-900 rounded-lg px-4 py-3 mb-4 text-sm">
          <div className="font-semibold">Manual credentials</div>
          <div className="mt-1">Email: {form.email}</div>
          <div>Password: <span className="font-mono font-semibold">{temporaryPassword}</span></div>
          <div className="mt-2 text-xs">Share this password securely and ask the employee to change it after signing in.</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input value={form.name} onChange={handleChange('name')} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={handleChange('email')} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="password" value={form.password} onChange={handleChange('password')} minLength={8} placeholder="Leave blank to generate and email one" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">If blank, a temporary password will be generated and emailed.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
            <input value={form.job_position} onChange={handleChange('job_position')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type</label>
            <select value={form.employee_type} onChange={handleChange('employee_type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="full_time">Full Time</option>
              <option value="contract">Contract</option>
              <option value="part_time">Part Time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
            <input value={form.bank_account} onChange={handleChange('bank_account')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={handleChange('status')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Working Schedule</label>
            <select value={form.schedule_id || ''} onChange={handleChange('schedule_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">No schedule assigned</option>
              {schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/employees')} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
