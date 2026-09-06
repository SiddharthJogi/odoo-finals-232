import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';

const PAGE_SIZE = 20;

const STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

const STATUS_OPTIONS = {
  active: ['expired', 'cancelled', 'archived'],
  expired: ['active', 'archived'],
  cancelled: ['archived'],
  archived: [],
};

export default function ContractList() {
  const { role } = useAuth();
  const { addToast } = useToast();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const canManage = ['admin', 'hr_manager'].includes(role);

  useEffect(() => {
    client.get('/contracts')
      .then(({ data }) => setContracts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (contract, status) => {
    if (status === contract.status) return;
    setUpdatingStatusId(contract.id);
    try {
      const { data } = await client.patch(`/contracts/${contract.id}/status`, { status });
      setContracts((current) => current.map((item) => item.id === data.id ? { ...item, ...data } : item));
      addToast(`Contract status changed to ${STATUS_LABELS[status]}.`, 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update contract status', 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getStatusOptions = (status) => [status, ...(STATUS_OPTIONS[status] || [])];

  const visibleContracts = filter === 'all'
    ? contracts
    : contracts.filter((contract) => contract.status === filter);

  const totalPages = Math.max(1, Math.ceil(visibleContracts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedContracts = visibleContracts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All contracts</option>
            <option value="active">Active only</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="archived">Archived</option>
          </select>
          {canManage && (
            <Link to="/contracts/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              + New Contract
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No contracts found.</div>
        ) : visibleContracts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No contracts match this filter.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagedContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contract.employee_name || `Employee #${contract.employee_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.job_position || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${contract.wage}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      contract.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : contract.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : contract.status === 'archived'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                    }`}>
                      {STATUS_LABELS[contract.status] || contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contract.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Open-ended'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {canManage && (
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/contracts/${contract.id}`}
                          className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </Link>
                        {updatingStatusId === contract.id ? (
                          <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                            Saving status...
                          </span>
                        ) : STATUS_OPTIONS[contract.status]?.length > 0 ? (
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Status</span>
                            <select
                              value={contract.status}
                              onChange={(event) => updateStatus(contract, event.target.value)}
                              disabled={updatingStatusId === contract.id}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-wait disabled:opacity-60"
                              aria-label={`Change status for ${contract.employee_name || `employee ${contract.employee_id}`}`}
                            >
                              {getStatusOptions(contract.status).map((status) => (
                                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <span className="text-xs text-gray-400">No further changes</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && visibleContracts.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
