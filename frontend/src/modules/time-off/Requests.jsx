import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/time-off/requests')
      .then(({ data }) => setRequests(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    try {
      await client.patch(`/time-off/requests/${id}/approve`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' } : r));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleRefuse = async (id) => {
    try {
      await client.patch(`/time-off/requests/${id}/refuse`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'refused' } : r));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const statusColors = { draft: 'bg-yellow-50 text-yellow-700', approved: 'bg-green-50 text-green-700', refused: 'bg-red-50 text-red-700' };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Time Off Requests</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">Employee #{req.employee_id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{req.start_date} → {req.end_date}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{req.duration} days</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[req.status] || ''}`}>{req.status}</span>
                </td>
                <td className="px-6 py-4">
                  {req.status === 'draft' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(req.id)} className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Approve</button>
                      <button onClick={() => handleRefuse(req.id)} className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Refuse</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="text-center py-8 text-gray-400">No requests</p>}
      </div>
    </div>
  );
}
