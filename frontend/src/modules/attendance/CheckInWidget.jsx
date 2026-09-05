import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { Clock, CheckCircle2, LogOut, Timer } from 'lucide-react';

export default function CheckInWidget() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [status, setStatus] = useState(null); // null, 'checked_in', 'checked_out'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds

  // Elapsed timer while checked in
  useEffect(() => {
    if (status !== 'checked_in' || !result?.check_in) return;
    const start = new Date(result.check_in).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, result]);

  const formatElapsed = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { data } = await client.post('/attendance/check-in', { employee_id: user.employeeId });
      setResult(data);
      setStatus('checked_in');
      setElapsed(0);
      addToast(`Checked in at ${new Date(data.check_in).toLocaleTimeString()}`, 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Check-in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const { data } = await client.post('/attendance/check-out', { employee_id: user.employeeId });
      setResult(data);
      setStatus('checked_out');
      addToast(`Checked out — ${Number(data.worked_hours || 0).toFixed(1)} hours worked`, 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Check-out failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-sm w-full text-center">
        {/* Icon & Title */}
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 transition-all duration-500 ${
          status === 'checked_in'
            ? 'bg-emerald-100 ring-4 ring-emerald-200'
            : status === 'checked_out'
            ? 'bg-blue-100 ring-4 ring-blue-200'
            : 'bg-gray-100'
        }`}>
          {status === 'checked_in' ? (
            <Clock className="w-10 h-10 text-emerald-600 animate-pulse" />
          ) : status === 'checked_out' ? (
            <CheckCircle2 className="w-10 h-10 text-blue-600" />
          ) : (
            <Timer className="w-10 h-10 text-gray-400" />
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Attendance</h1>
        <p className="text-sm text-gray-500 mb-6">
          {user?.name || 'Employee'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {/* Status Card */}
        {status === 'checked_in' && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-bold text-emerald-800 mb-1">
              ✓ Checked in at {new Date(result?.check_in).toLocaleTimeString()}
            </p>
            <p className="text-2xl font-mono font-extrabold text-emerald-700">{formatElapsed(elapsed)}</p>
            <p className="text-xs text-emerald-600 mt-1">Time elapsed</p>
          </div>
        )}

        {status === 'checked_out' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-bold text-blue-800 mb-1">✓ Checked out successfully</p>
            {result?.worked_hours && (
              <p className="text-2xl font-bold text-blue-700">
                {Number(result.worked_hours).toFixed(1)}<span className="text-lg"> hours</span>
              </p>
            )}
            <p className="text-xs text-blue-600 mt-1">Total shift duration</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleCheckIn}
            disabled={loading || status === 'checked_in'}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading && status !== 'checked_in' ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            Check In
          </button>
          <button
            onClick={handleCheckOut}
            disabled={loading || status !== 'checked_in'}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading && status === 'checked_in' ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Check Out
          </button>
        </div>

        {!status && (
          <p className="text-xs text-gray-400 mt-4">Press Check In to start recording your shift</p>
        )}
      </div>
    </div>
  );
}
