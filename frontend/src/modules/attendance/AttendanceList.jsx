import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function AttendanceList() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/attendance')
      .then(({ data }) => setAttendances(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading attendance records...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <a href="/attendance/check-in" className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
          Check In / Out
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worked Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {attendances.map((att) => (
              <tr key={att.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Employee #{att.employee_id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(att.check_in).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{att.check_out ? new Date(att.check_out).toLocaleString() : '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{att.worked_hours ? `${Number(att.worked_hours).toFixed(1)}h` : '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${att.status === 'done' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {att.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {attendances.length === 0 && <p className="text-center py-8 text-gray-400">No attendance records</p>}
      </div>
    </div>
  );
}
