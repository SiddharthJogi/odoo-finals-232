import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      ))}
    </tr>
  );
}

export default function AttendanceList() {
  const { role } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', status: '' });
  
  // Correction Modal State
  const [editItem, setEditItem] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState('done');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = ['admin', 'hr_manager'].includes(role);

  useEffect(() => {
    fetchAttendances();
  }, [filters]);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.status) params.status = filters.status;
      const { data } = await client.get('/attendance', { params });
      setAttendances(data);
    } catch (err) {
      console.error('Failed to fetch attendances', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (att) => {
    setEditItem(att);
    setEditCheckIn(att.check_in ? new Date(att.check_in).toISOString().slice(0, 16) : '');
    setEditCheckOut(att.check_out ? new Date(att.check_out).toISOString().slice(0, 16) : '');
    setEditStatus(att.status || 'corrected');
    setError('');
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        check_in: editCheckIn ? new Date(editCheckIn).toISOString() : undefined,
        check_out: editCheckOut ? new Date(editCheckOut).toISOString() : undefined,
        status: editStatus,
      };
      await client.patch(`/attendance/${editItem.id}`, payload);
      setEditItem(null);
      fetchAttendances();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save correction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" />
            Attendance Logs
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? '...' : `${attendances.length} records loaded`} · Track and manage employee check-ins and working hours
          </p>
        </div>
        <Link
          to="/attendance/check-in"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition"
        >
          <CheckCircle2 className="w-4 h-4" />
          Open Check In/Out Widget
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Date From</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            className="w-full text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 px-3 py-2 border"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Date To</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            className="w-full text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 px-3 py-2 border"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Status Filter</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="w-full text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 px-3 py-2 border bg-white"
          >
            <option value="">All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="corrected">Corrected</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading attendance records...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50/50 text-xs font-semibold uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4">Worked Hours</th>
                <th className="px-6 py-4">Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {attendances.map((att) => (
                <tr key={att.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div>{att.employee_name || `Employee #${att.employee_id}`}</div>
                    {att.job_position && <div className="text-xs text-gray-400 font-normal">{att.job_position}</div>}
                    {att.scheduled_start && (
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Shift: {att.scheduled_start.slice(0, 5)} - {att.scheduled_end ? att.scheduled_end.slice(0, 5) : '17:00'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                    <div>{new Date(att.check_in).toLocaleString()}</div>
                    {att.is_late && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        ⏰ Late (+{att.late_minutes}m)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                    {att.check_out ? (
                      <div>
                        <div>{new Date(att.check_out).toLocaleString()}</div>
                        {att.overtime_hours > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                            ⚡ Overtime (+{att.overtime_hours}h)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-amber-500 font-sans font-semibold">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-semibold">
                    {att.worked_hours ? `${Number(att.worked_hours).toFixed(2)}h` : '—'}
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          att.status === 'done'
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : att.status === 'corrected'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {att.status}
                      </span>
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(att)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                      >
                        Edit / Correct
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && attendances.length === 0 && (
          <div className="text-center py-12 text-gray-400">No attendance logs found matching filters.</div>
        )}
      </div>

      {/* Correction Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Correct Attendance Record</h3>
            <p className="text-xs text-gray-500">Manual adjustment for {editItem.employee_name || `Employee #${editItem.employee_id}`}</p>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleSaveCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Check In Time</label>
                <input
                  type="datetime-local"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Check Out Time</label>
                <input
                  type="datetime-local"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-xl px-3 py-2 border bg-white focus:ring-blue-500"
                >
                  <option value="done">Done</option>
                  <option value="corrected">Corrected</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
