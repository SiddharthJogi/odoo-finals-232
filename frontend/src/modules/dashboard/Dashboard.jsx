import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;

  const cards = [
    { label: 'Total Employees', value: summary?.total_employees || 0, color: 'bg-blue-500' },
    { label: 'Net Paid', value: `₹${(summary?.total_net_paid || 0).toLocaleString('en-IN')}`, color: 'bg-green-500' },
    { label: 'Total Payslips', value: summary?.total_payslips || 0, color: 'bg-purple-500' },
    { label: 'Pending Time Off', value: summary?.pending_time_off_requests || 0, color: 'bg-yellow-500' },
    { label: 'Checked In Today', value: summary?.checked_in_today || 0, color: 'bg-indigo-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payroll Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-white text-lg font-bold">{String(card.label)[0]}</span>
            </div>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Charts & Filters</h2>
        <p className="text-gray-500">Dev 4: Wire up Recharts components here — Salary by Department, Monthly Trend, Attendance Overview, Time Off Overview.</p>
      </div>
    </div>
  );
}
