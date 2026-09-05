import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { UserCircle, ArrowLeft, FileText, Save, Loader2, Building2, Clock } from 'lucide-react';

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
  const [departments, setDepartments] = useState([]);
  const [currentDepartmentName, setCurrentDepartmentName] = useState('');
  const [pendingDeptRequest, setPendingDeptRequest] = useState(null);
  const [deptRequestOpen, setDeptRequestOpen] = useState(false);
  const [deptRequestTarget, setDeptRequestTarget] = useState('');
  const [deptRequestSubmitting, setDeptRequestSubmitting] = useState(false);

  const loadPendingDeptRequest = (employeeId) => {
    client.get('/department-requests', { params: { employee_id: employeeId, status: 'draft' } })
      .then(({ data }) => setPendingDeptRequest(data[0] || null))
      .catch(() => {}); // non-critical — only admin/hr_manager can see this anyway
  };

  useEffect(() => {
    client.get('/departments').then(({ data }) => setDepartments(data)).catch(() => {});

    if (isEdit) {
      Promise.all([client.get(`/employees/${id}`), client.get('/schedules')])
        .then(([employeeResponse, scheduleResponse]) => {
          const data = employeeResponse.data;
          setSchedules(scheduleResponse.data.filter((schedule) => schedule.status === 'active' || schedule.id === data.schedule_id));
          setCurrentDepartmentName(data.department_name || '');
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
      loadPendingDeptRequest(id);
    } else {
      client.get('/schedules')
        .then(({ data }) => setSchedules(data.filter((schedule) => schedule.status === 'active')))
        .catch(() => addToast('Failed to load schedules', 'error'));
    }
  }, [id, isEdit]);

  const submitDepartmentChangeRequest = async () => {
    if (!deptRequestTarget) return;
    setDeptRequestSubmitting(true);
    try {
      await client.post(`/employees/${id}/department-requests`, { department_id: parseInt(deptRequestTarget, 10) });
      addToast('Department change request submitted for admin approval', 'success');
      setDeptRequestOpen(false);
      setDeptRequestTarget('');
      loadPendingDeptRequest(id);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to submit department change request', 'error');
    } finally {
      setDeptRequestSubmitting(false);
    }
  };

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
        // Department is changed only via the admin-approved request flow, never here.
        delete payload.department_id;
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
            <input value={form.bank_account} onChange={handleChange('bank_account')} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
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

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.department_id || ''} onChange={handleChange('department_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">No department assigned</option>
                {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {isEdit && (
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              Department
            </label>
            <p className="text-sm text-gray-900">{currentDepartmentName || <span className="text-gray-400">Unassigned</span>}</p>
            <p className="text-xs text-gray-500 mt-1">
              Department changes require admin approval and cannot be edited directly here.
            </p>

            {pendingDeptRequest ? (
              <div className="mt-2 flex items-center gap-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Pending: move to <strong>{pendingDeptRequest.requested_department_name}</strong>, awaiting admin approval
              </div>
            ) : deptRequestOpen ? (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={deptRequestTarget}
                  onChange={(e) => setDeptRequestTarget(e.target.value)}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select new department...</option>
                  {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={submitDepartmentChangeRequest}
                  disabled={!deptRequestTarget || deptRequestSubmitting}
                  className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {deptRequestSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button type="button" onClick={() => setDeptRequestOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeptRequestOpen(true)}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                Request Department Change
              </button>
            )}
          </div>
        )}

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
