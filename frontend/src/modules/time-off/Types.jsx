import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function Types() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/time-off/types')
      .then(({ data }) => setTypes(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Time Off Types</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((type) => (
          <div key={type.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 text-lg">{type.name}</h3>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p>Unit: <span className="font-medium">{type.unit}</span></p>
              <p>Requires Allocation: <span className="font-medium">{type.requires_allocation ? 'Yes' : 'No'}</span></p>
              <p>Affects Payroll: <span className="font-medium">{type.affects_payroll ? 'Yes' : 'No'}</span></p>
            </div>
          </div>
        ))}
        {types.length === 0 && <p className="col-span-3 text-center py-8 text-gray-400">No types configured</p>}
      </div>
    </div>
  );
}
