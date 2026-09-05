import { useState, useEffect } from 'react';
import client from '../../api/client';
import { CalendarDays, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
      ))}
    </tr>
  );
}

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/time-off/allocations')
      .then(({ data }) => setAllocations(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-amber-500" />
            Leave Allocations
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Balance tracking per employee and leave type — deducted on approval
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Leave Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Allocated</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Taken</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Valid Period</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : allocations.map((alloc) => {
                const usagePct = alloc.allocated > 0 ? (alloc.taken / alloc.allocated) * 100 : 0;
                const isLow = alloc.remaining <= 2 && alloc.allocated > 0;
                return (
                  <tr key={alloc.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {alloc.employee_name || `Employee #${alloc.employee_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {alloc.type_name || `Type #${alloc.type_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{alloc.allocated}d</td>
                    <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                      <span className="inline-flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {alloc.taken}d
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
                          {alloc.remaining}d
                        </span>
                        {/* Mini progress bar */}
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${usagePct >= 80 ? 'bg-red-500' : usagePct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(usagePct, 100)}%` }}
                          />
                        </div>
                      </div>
                      {isLow && (
                        <p className="text-[10px] text-red-500 font-semibold mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Low balance
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {alloc.valid_from}
                      <span className="text-gray-400 mx-1">→</span>
                      {alloc.valid_to || <span className="text-emerald-600 font-semibold">No expiry</span>}
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>

        {!loading && allocations.length === 0 && (
          <div className="py-16 text-center">
            <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No leave allocations configured</p>
            <p className="text-xs text-gray-400 mt-1">Allocations are created per employee via the seed or admin panel.</p>
          </div>
        )}
      </div>
    </div>
  );
}
