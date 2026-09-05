import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function Structures() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/payroll/structures')
      .then(({ data }) => setStructures(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Salary Structures</h1>
      <div className="grid gap-4">
        {structures.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">{s.name}</h3>
              <p className="text-sm text-gray-500">ID: {s.id}</p>
            </div>
            <span className={`px-3 py-1 text-xs rounded-full ${s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {s.status}
            </span>
          </div>
        ))}
        {structures.length === 0 && <p className="text-center py-8 text-gray-400">No structures</p>}
      </div>
    </div>
  );
}
