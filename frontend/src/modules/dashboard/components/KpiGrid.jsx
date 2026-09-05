import React from 'react';
import { Users, IndianRupee, Briefcase, Calendar, UserCheck } from 'lucide-react';

export default function KpiGrid({ summary }) {
  const cards = [
    {
      title: 'Active Employees',
      value: (summary?.total_employees || 0).toLocaleString('en-IN'),
      subtitle: 'Total headcount',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Total Net Paid',
      value: `₹${(summary?.total_net_paid || 0).toLocaleString('en-IN')}`,
      subtitle: `${summary?.total_payslips || 0} payslips processed`,
      icon: IndianRupee,
      gradient: 'from-emerald-500 to-teal-600',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Total Gross Payroll',
      value: `₹${(summary?.total_gross_paid || 0).toLocaleString('en-IN')}`,
      subtitle: 'Before deductions',
      icon: Briefcase,
      gradient: 'from-violet-500 to-purple-600',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    {
      title: 'Pending Time Off',
      value: (summary?.pending_time_off_requests || 0).toLocaleString('en-IN'),
      subtitle: 'Awaiting approval',
      icon: Calendar,
      gradient: 'from-amber-500 to-orange-600',
      badgeColor: summary?.pending_time_off_requests > 0 ? 'text-amber-700 bg-amber-50 border-amber-200 font-semibold' : 'text-gray-600 bg-gray-50 border-gray-200',
    },
    {
      title: 'Checked In Today',
      value: (summary?.checked_in_today || 0).toLocaleString('en-IN'),
      subtitle: 'Active attendance',
      icon: UserCheck,
      gradient: 'from-sky-500 to-blue-600',
      badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white shadow-sm`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {card.value}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>{card.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
