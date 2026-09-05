import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';

export default function CheckInWidget() {
  const { user } = useAuth();
  const [activeRecord, setActiveRecord] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading', 'checked_out', 'checked_in'
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch active attendance on mount
  useEffect(() => {
    fetchActiveStatus();
  }, []);

  // Timer tick for live check-in elapsed duration
  useEffect(() => {
    let timer;
    if (status === 'checked_in' && activeRecord?.check_in) {
      const updateTimer = () => {
        const diffMs = Date.now() - new Date(activeRecord.check_in).getTime();
        setElapsed(Math.max(0, Math.floor(diffMs / 1000)));
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(timer);
  }, [status, activeRecord]);

  const fetchActiveStatus = async () => {
    try {
      setLoading(true);
      const { data } = await client.get('/attendance/active');
      if (data && !data.check_out) {
        setActiveRecord(data);
        setStatus('checked_in');
      } else {
        setActiveRecord(null);
        setStatus('checked_out');
      }
    } catch (err) {
      console.error('Failed to fetch active attendance', err);
      setStatus('checked_out');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/attendance/check-in', {});
      setActiveRecord(data);
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
      const { data } = await client.post('/attendance/check-out', {});
      setActiveRecord(data);
      setStatus('checked_out');
    } catch (err) {
      setError(err.response?.data?.error || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  const formatElapsed = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-gray-100 p-8 text-center relative overflow-hidden transition-all duration-300">
        {/* Top Decorative Glow */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none transition-all ${
          status === 'checked_in' ? 'bg-emerald-400' : 'bg-blue-400'
        }`} />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 mb-6">
            <span className={`w-2 h-2 rounded-full ${status === 'checked_in' ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
            {status === 'checked_in' ? 'Shift In Progress' : 'Not Checked In'}
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Daily Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Log your working hours accurately for payroll calculation</p>

          {error && (
            <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm text-left flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Active Timer Display */}
          {status === 'checked_in' && activeRecord && (
            <div className="my-8 p-6 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-3">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-widest mb-1">Time Elapsed</p>
              <div className="text-5xl font-black text-emerald-900 tracking-tight font-mono my-2">
                {formatElapsed(elapsed)}
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                Checked in at <span className="font-semibold">{new Date(activeRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              {activeRecord.is_late && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-200 text-amber-900 rounded-full text-xs font-semibold">
                  <span>⏰</span>
                  <span>Late Check-in (+{activeRecord.late_minutes}m past shift start)</span>
                </div>
              )}
              {activeRecord.penalty_message && (
                <div className="mt-2 p-3 bg-rose-100 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold text-left flex items-center gap-2">
                  <span className="text-lg">🚨</span>
                  <span>{activeRecord.penalty_message}</span>
                </div>
              )}
            </div>
          )}

          {/* Checked Out Result Display */}
          {status === 'checked_out' && activeRecord?.check_out && (
            <div className="my-8 p-6 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2">
              <div className="w-12 h-12 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-2">
                ✓
              </div>
              <p className="text-blue-900 font-semibold text-lg">Shift Completed</p>
              {activeRecord.worked_hours && (
                <p className="text-blue-700 text-sm">
                  Total Worked: <span className="font-bold">{Number(activeRecord.worked_hours).toFixed(2)} hrs</span>
                </p>
              )}
              {activeRecord.is_late && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-semibold mt-1">
                  ⏰ Late Check-In (+{activeRecord.late_minutes}m)
                </div>
              )}
              {activeRecord.overtime_hours > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-900 rounded-full text-xs font-semibold mt-1">
                  ⚡ Overtime Logged (+{activeRecord.overtime_hours} hrs past shift end)
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-8 flex gap-4 justify-center">
            {status === 'checked_out' || status === 'loading' ? (
              <button
                onClick={handleCheckIn}
                disabled={loading || status === 'loading'}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base"
              >
                {loading ? 'Processing...' : '▶ Check In Now'}
              </button>
            ) : (
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base"
              >
                {loading ? 'Processing...' : '⏹ Check Out Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
