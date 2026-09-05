import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/attendance')
      .then(({ data }) => setAttendances(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" />
            Attendance Log
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? '...' : `${attendances.length} records loaded`}
          </p>
        </div>
        <Link
          to="/attendance/check-in"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-md"
        >
          <CheckCircle2 className="w-4 h-4" />
          Check In / Out
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check In</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check Out</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Worked Hours</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading
              ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              : attendances.map((att) => (
                <tr key={att.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {att.employee_name || `Employee #${att.employee_id}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {att.check_in ? new Date(att.check_in).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {att.check_out
                      ? new Date(att.check_out).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                          In Progress
                        </span>
                    }
                  </td>
                  <td className="px-6 py-4 text-sm font-mono font-medium text-gray-800">
                    {att.worked_hours ? `${Number(att.worked_hours).toFixed(1)}h` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                      att.status === 'done'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {att.status === 'done' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {att.status}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>

        {!loading && attendances.length === 0 && (
          <div className="py-16 text-center">
            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No attendance records yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Employees can check in using the{' '}
              <Link to="/attendance/check-in" className="text-blue-600 underline">Check In / Out</Link> page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
