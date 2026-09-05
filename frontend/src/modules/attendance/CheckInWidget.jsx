import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';

export default function CheckInWidget() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null); // null, 'checked_in', 'checked_out'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/attendance/check-in', { employee_id: user.employeeId });
      setResult(data);
      setStatus('checked_in');
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/attendance/check-out', { employee_id: user.employeeId });
      setResult(data);
      setStatus('checked_out');
    } catch (err) {
      setError(err.response?.data?.error || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Attendance</h1>
        <p className="text-gray-500 mb-8">Check in or out for today</p>

        {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

        {status === 'checked_in' && (
          <div className="mb-6 p-4 bg-green-50 rounded-xl">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <p className="text-green-700 font-medium">Checked in at {new Date(result?.check_in).toLocaleTimeString()}</p>
          </div>
        )}

        {status === 'checked_out' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-blue-600 text-2xl">✓</span>
            </div>
            <p className="text-blue-700 font-medium">Checked out</p>
            {result?.worked_hours && <p className="text-blue-600 text-sm">Worked: {Number(result.worked_hours).toFixed(1)}h</p>}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={handleCheckIn} disabled={loading || status === 'checked_in'}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
            {loading ? '...' : 'Check In'}
          </button>
          <button onClick={handleCheckOut} disabled={loading || status === 'checked_out'}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
            {loading ? '...' : 'Check Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
