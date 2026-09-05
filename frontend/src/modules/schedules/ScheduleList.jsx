import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';

export default function ScheduleList() {
  const { role } = useAuth();
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const canManage = ['admin', 'hr_manager'].includes(role);

  useEffect(() => {
    client.get('/schedules')
      .then(({ data }) => setSchedules(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const archiveSchedule = async (schedule) => {
    try {
      await client.delete(`/schedules/${schedule.id}`);
      setSchedules((current) => current.map((item) => item.id === schedule.id ? { ...item, status: 'archived' } : item));
      addToast('Schedule archived. Existing assignments were preserved.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to archive schedule', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Working Schedules</h1>
        {canManage && <Link to="/schedules/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + New Schedule
        </Link>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No schedules found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calendar Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schedule.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{schedule.calendar_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      schedule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {schedule.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/schedules/${schedule.id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                        {canManage && schedule.status === 'active' ? 'Edit' : 'View'}
                      </Link>
                      {canManage && schedule.status === 'active' && (
                        <button onClick={() => archiveSchedule(schedule)} className="text-gray-600 hover:text-gray-900 font-medium">Archive</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
