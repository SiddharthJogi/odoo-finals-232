import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { Clock, CheckCircle2, LogOut, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function CheckInWidget() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeRecord, setActiveRecord] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading', 'checked_out', 'checked_in'
  const [elapsed, setElapsed] = useState(0); // seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);
    setError('');
    try {
      const { data } = await client.post('/attendance/check-in', {});
      setActiveRecord(data);
      setStatus('checked_in');
      setElapsed(0);
      addToast(`Checked in at ${new Date(data.check_in).toLocaleTimeString()}`, 'success');
    } catch (err) {
      const msg = err.response?.data?.error || 'Check-in failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await client.post('/attendance/check-out', {});
      setActiveRecord(data);
      setStatus('checked_out');
      addToast(`Checked out — ${Number(data.worked_hours || 0).toFixed(1)} hours worked`, 'success');
    } catch (err) {
      const msg = err.response?.data?.error || 'Check-out failed';
      setError(msg);
      addToast(msg, 'error');
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-border p-10 text-center relative overflow-hidden"
      >
        {/* Top Decorative Glow */}
        <div className={cn(
          "absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700",
          status === 'checked_in' ? 'bg-emerald-500' : 'bg-primary'
        )} />

        <div className="relative z-10">
          <motion.div 
            layoutId="status-badge"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-muted text-muted-foreground mb-8 border border-border"
          >
            <span className={cn(
              "w-2 h-2 rounded-full",
              status === 'checked_in' ? 'bg-emerald-500 animate-ping' : 'bg-muted-foreground/50'
            )} />
            {status === 'checked_in' ? 'Shift In Progress' : 'Not Checked In'}
          </motion.div>

          <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">Daily Attendance</h1>
          <p className="text-muted-foreground text-sm font-medium">
            {user?.name || 'Employee'} <span className="opacity-50 mx-1">·</span> {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 text-sm text-left flex items-start gap-3"
              >
                <span className="font-bold mt-0.5">⚠️</span>
                <span className="font-medium">{error}</span>
              </motion.div>
            )}

            {/* Active Timer Display */}
            {status === 'checked_in' && activeRecord && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-10 p-8 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 rounded-[2rem] space-y-4"
              >
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-[0.2em]">Time Elapsed</p>
                <div className="text-6xl font-black text-emerald-900 dark:text-emerald-400 tracking-tighter font-mono my-2 drop-shadow-sm">
                  {formatElapsed(elapsed)}
                </div>
                <p className="text-sm text-emerald-700/80 font-medium">
                  Checked in at <span className="font-bold text-emerald-800">{new Date(activeRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
                
                {activeRecord.is_late && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100/80 border border-amber-200/50 text-amber-800 rounded-full text-xs font-bold shadow-sm">
                    <span>⏰</span>
                    <span>Late Check-in (+{activeRecord.late_minutes}m)</span>
                  </motion.div>
                )}
                {activeRecord.penalty_message && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold text-left flex items-center gap-3">
                    <span className="text-lg">🚨</span>
                    <span>{activeRecord.penalty_message}</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Checked Out Result Display */}
            {status === 'checked_out' && activeRecord?.check_out && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-10 p-8 bg-primary/5 border border-primary/10 rounded-[2rem] space-y-3"
              >
                <div className="w-16 h-16 mx-auto bg-primary text-primary-foreground rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-lg shadow-primary/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="text-foreground font-extrabold text-2xl tracking-tight">Shift Completed</p>
                {activeRecord.worked_hours && (
                  <p className="text-muted-foreground text-sm font-medium mt-1">
                    Total Worked: <span className="font-bold text-foreground">{Number(activeRecord.worked_hours).toFixed(2)} hrs</span>
                  </p>
                )}
                
                <div className="flex flex-col items-center gap-2 mt-4">
                  {activeRecord.is_late && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-200/50 text-amber-800 rounded-full text-xs font-bold">
                      ⏰ Late Check-In (+{activeRecord.late_minutes}m)
                    </div>
                  )}
                  {activeRecord.overtime_hours > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
                      ⚡ Overtime Logged (+{activeRecord.overtime_hours} hrs)
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="mt-10 flex gap-4 justify-center">
            {status === 'checked_out' || status === 'loading' ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCheckIn}
                disabled={loading || status === 'loading'}
                className="w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-3 text-lg transition-colors"
              >
                {loading ? 'Processing...' : (
                  <>
                    <Timer className="w-5 h-5" />
                    Check In Now
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCheckOut}
                disabled={loading}
                className="w-full sm:w-auto px-10 py-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-2xl font-bold shadow-xl shadow-destructive/20 disabled:opacity-50 flex items-center justify-center gap-3 text-lg transition-colors"
              >
                {loading ? 'Processing...' : (
                  <>
                    <LogOut className="w-5 h-5" />
                    Check Out Now
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
