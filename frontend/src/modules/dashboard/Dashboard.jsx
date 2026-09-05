import React, { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import KpiGrid from './components/KpiGrid';
import SalaryCharts from './components/SalaryCharts';
import OperationsCharts from './components/OperationsCharts';
import AlertsFeed from './components/AlertsFeed';
import { Filter, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [deptSalary, setDeptSalary] = useState([]);
  const [salaryTrend, setSalaryTrend] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [warnings, setWarnings] = useState({ payslip_warnings: [], ai_warnings: [] });
  const [departments, setDepartments] = useState([]);

  // Filter state
  const [selectedDept, setSelectedDept] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Fetch departments list
  useEffect(() => {
    client.get('/departments')
      .then(({ data }) => setDepartments(data))
      .catch(console.error);
  }, []);

  // Fetch all dashboard metrics
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    try {
      const params = {};
      if (selectedDept) params.dept = selectedDept;
      if (periodStart) params.period_start = periodStart;
      if (periodEnd) params.period_end = periodEnd;

      const [sumRes, deptRes, trendRes, attRes, toRes, warnRes] = await Promise.all([
        client.get('/dashboard/summary', { params }),
        client.get('/dashboard/salary-by-department', { params }),
        client.get('/dashboard/salary-trend', { params }),
        client.get('/dashboard/attendance-overview', { params }),
        client.get('/dashboard/time-off-overview', { params }),
        client.get('/dashboard/warnings', { params }),
      ]);

      setSummary(sumRes.data);
      setDeptSalary(deptRes.data);
      setSalaryTrend(trendRes.data);
      setAttendance(attRes.data);
      setTimeOff(toRes.data);
      setWarnings(warnRes.data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDept, periodStart, periodEnd]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-xl" />
          <div className="h-80 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header & Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-blue-600" />
            Executive Payroll Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time analytics across core HR, attendances, leave allocations, and salary rules.
            {lastRefreshed && (
              <span className="ml-2 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-100">
                Updated {lastRefreshed}
              </span>
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold px-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            Filters:
          </div>

          {/* Department Select */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            title="Start Date"
          />

          {/* End Date */}
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            title="End Date"
          />

          {/* Refresh button */}
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. Top KPI Summary Grid */}
      <KpiGrid summary={summary} />

      {/* 2. System Alerts & Warning Feed */}
      <AlertsFeed warnings={warnings} />

      {/* 3. Salary & Payroll Charts */}
      <SalaryCharts deptSalary={deptSalary} salaryTrend={salaryTrend} />

      {/* 4. Attendance & Time Off Operations Charts */}
      <OperationsCharts attendance={attendance} timeOff={timeOff} />
    </div>
  );
}
