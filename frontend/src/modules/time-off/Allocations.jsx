import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/time-off/allocations')
      .then(({ data }) => setAllocations(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading allocations...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leave Allocations</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taken</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allocations.map((alloc) => (
              <tr key={alloc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">Employee #{alloc.employee_id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">Type #{alloc.type_id}</td>
                <td className="px-6 py-4 text-sm font-medium">{alloc.allocated}</td>
                <td className="px-6 py-4 text-sm text-orange-600">{alloc.taken}</td>
                <td className="px-6 py-4 text-sm font-medium text-green-600">{alloc.remaining}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{alloc.valid_from} → {alloc.valid_to || '∞'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {allocations.length === 0 && <p className="text-center py-8 text-gray-400">No allocations</p>}
      </div>
    </div>
  );
}
