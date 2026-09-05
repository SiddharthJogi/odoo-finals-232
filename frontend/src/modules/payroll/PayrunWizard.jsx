import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function PayrunWizard() {
  const [payruns, setPayruns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/payroll/payruns')
      .then(({ data }) => setPayruns(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors = {
    draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    computed: 'bg-blue-50 text-blue-700 border-blue-200',
    validated: 'bg-purple-50 text-purple-700 border-purple-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading payruns...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payroll — Payruns</h1>
        <div className="flex gap-2">
          <a href="/payroll/structures" className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">Structures</a>
          <a href="/payroll/rules" className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">Rules</a>
        </div>
      </div>

      <div className="grid gap-4">
        {payruns.map((pr) => (
          <div key={pr.id} className={`bg-white rounded-xl shadow-sm border p-5 ${statusColors[pr.status] ? 'border-gray-200' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{pr.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Period: {pr.period_start} → {pr.period_end}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[pr.status] || 'bg-gray-50 text-gray-700'}`}>
                {pr.status}
              </span>
            </div>
          </div>
        ))}
        {payruns.length === 0 && <p className="text-center py-12 text-gray-400">No payruns yet. Create one to get started.</p>}
      </div>
    </div>
  );
}
