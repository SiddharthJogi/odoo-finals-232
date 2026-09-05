import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Clock, CalendarDays } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function OperationsCharts({ attendance, timeOff }) {
  const formattedAttendance = attendance
    .slice(0, 10)
    .reverse()
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Completed: item.completed,
      'In Progress': item.in_progress,
      'Avg Hours': item.avg_hours,
    }));

  const formattedTimeOff = timeOff.map((item) => ({
    name: item.type_name,
    value: item.approved + item.pending,
    takenDays: item.total_days_taken,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* 1. 30-Day Attendance Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Attendance Activity
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Completed shifts vs in-progress work</p>
          </div>
        </div>

        <div className="h-64 w-full">
          {formattedAttendance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedAttendance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px', border: '1px solid #E5E7EB' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="Completed" fill="#3B82F6" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={32} />
                <Bar dataKey="In Progress" fill="#93C5FD" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              No recent attendance data recorded
            </div>
          )}
        </div>
      </div>

      {/* 2. Time Off Request Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-600" />
              Time Off Distribution
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Leave categories & allocations taken</p>
          </div>
        </div>

        <div className="h-64 w-full flex items-center">
          {formattedTimeOff.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedTimeOff}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {formattedTimeOff.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px', border: '1px solid #E5E7EB' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
              No time off data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
