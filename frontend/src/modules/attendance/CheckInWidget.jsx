import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { Activity, CalendarDays, CheckCircle2, Clock, History, LogOut, Timer, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function CheckInWidget() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeRecord, setActiveRecord] = useState(null);
  const [status, setStatus] = useState('loading');
  const [elapsed, setElapsed] = useState(0);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActiveStatus();
    fetchAttendanceHistory();
  }, []);

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
        setActiveRecord(data || null);
        setStatus('checked_out');
      }
    } catch (err) {
      console.error('Failed to fetch active attendance', err);
      setStatus('checked_out');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      setHistoryLoading(true);
      const { data } = await client.get('/attendance');
      setAttendanceHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch attendance history', err);
    } finally {
      setHistoryLoading(false);
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
      fetchAttendanceHistory();
      if (data.auto_deducted) {
        addToast(data.penalty_message || '⚠️ 3 Late Marks Reached: 0.5 Day Leave Auto-Deducted from Allocation Balance', 'warning');
      } else if (data.is_flex_buffered) {
        addToast(`🔄 Flex timing buffer active (+${data.flex_offset_minutes}m offset). Shift end extended.`, 'info');
      } else if (data.is_late) {
        addToast(`⏰ Checked in late (+${data.late_minutes}m past schedule)`, 'warning');
      } else {
        addToast(`Checked in at ${new Date(data.check_in).toLocaleTimeString()}`, 'success');
      }
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
      fetchAttendanceHistory();
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

  const formatTime = (value) => value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const shiftStart = activeRecord?.scheduled_start?.slice(0, 5) || '09:00';
  const shiftEnd = activeRecord?.scheduled_end?.slice(0, 5) || '17:00';
  const shiftStartHours = Number(shiftStart.slice(0, 2)) + Number(shiftStart.slice(3, 5)) / 60;
  let shiftEndHours = Number(shiftEnd.slice(0, 2)) + Number(shiftEnd.slice(3, 5)) / 60;
  if (shiftEndHours <= shiftStartHours) shiftEndHours += 24; // overnight/night shift rolls into the next day
  const shiftHours = Math.max(1, shiftEndHours - shiftStartHours);
  const progress = status === 'checked_in' ? Math.min(100, Math.round((elapsed / (shiftHours * 3600)) * 100)) : 0;
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const completedSessions = attendanceHistory.filter((record) => record.check_out).length;
  const totalHours = attendanceHistory.reduce((total, record) => total + Number(record.worked_hours || 0), 0);
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="bg-card rounded-[2rem] shadow-xl border border-border relative overflow-hidden">
        <div className={cn('absolute -top-40 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none', status === 'checked_in' ? 'bg-emerald-500' : 'bg-primary')} />
        <div className="relative z-10">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 sm:px-8 py-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary')}><Clock className="w-5 h-5" /></div>
              <div><h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">Daily attendance</h1><p className="text-xs text-muted-foreground font-medium mt-1">{user?.name || 'Employee'} <span className="mx-1 opacity-50">·</span> {dateLabel}</p></div>
            </div>
            <div className="inline-flex self-start sm:self-auto items-center gap-2 px-3 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest bg-muted text-muted-foreground border border-border"><span className={cn('w-2 h-2 rounded-full', status === 'checked_in' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50')} />{status === 'checked_in' ? 'Shift in progress' : 'Ready to check in'}</div>
          </header>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="popLayout">
              {error && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-sm text-left flex items-start gap-3"><span className="font-bold mt-0.5">!</span><span className="font-medium">{error}</span></motion.div>}

              {status === 'checked_in' && activeRecord && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 rounded-2xl p-6 text-left">
                  <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-bold text-emerald-700 uppercase tracking-[0.18em]">Working now</p><p className="text-sm text-emerald-900/70 dark:text-emerald-300/80 mt-1">Time elapsed since check-in</p></div><Activity className="w-5 h-5 text-emerald-600" /></div>
                  <div className="text-4xl sm:text-5xl font-black text-emerald-950 dark:text-emerald-300 tracking-tight font-mono mt-6">{formatElapsed(elapsed)}</div>
                  <div className="mt-6"><div className="flex justify-between text-[11px] font-bold text-emerald-800/70 mb-2"><span>Shift progress</span><span>{progress}%</span></div><div className="h-2 bg-emerald-200/70 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} /></div></div>
                </div>
                <div className="bg-muted/40 border border-border rounded-2xl p-6 text-left space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground"><CalendarDays className="w-4 h-4 text-primary" /> Today’s shift</div>
                  <div className="grid grid-cols-2 gap-3"><div className="bg-card rounded-xl p-3 border border-border"><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Started</p><p className="text-lg font-extrabold text-foreground mt-1">{formatTime(activeRecord.check_in)}</p></div><div className="bg-card rounded-xl p-3 border border-border"><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Scheduled</p><p className="text-lg font-extrabold text-foreground mt-1">{shiftStart}–{shiftEnd}</p></div></div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Stay on track to complete your scheduled shift.</p>
                </div>
                {activeRecord.is_late && <div className="lg:col-span-2 inline-flex items-center gap-2 px-4 py-3 bg-amber-100/80 border border-amber-200/50 text-amber-800 rounded-xl text-xs font-bold">Late check-in (+{activeRecord.late_minutes}m)</div>}
                {activeRecord.penalty_message && <div className="lg:col-span-2 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-bold text-left">{activeRecord.penalty_message}</div>}
              </motion.div>}

              {status === 'checked_out' && activeRecord?.check_out && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid sm:grid-cols-[auto_1fr] gap-5 items-center p-6 bg-primary/5 border border-primary/10 rounded-2xl text-left">
                <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20"><CheckCircle2 className="w-8 h-8" /></div>
                <div><p className="text-foreground font-extrabold text-xl tracking-tight">Shift completed</p><p className="text-muted-foreground text-sm font-medium mt-1">Total worked: <span className="font-bold text-foreground">{Number(activeRecord.worked_hours || 0).toFixed(2)} hrs</span></p><p className="text-xs text-muted-foreground mt-1">Checked out at {formatTime(activeRecord.check_out)}</p></div>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-2">{activeRecord.is_late && <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-200/50 text-amber-800 rounded-full text-xs font-bold">Late check-in (+{activeRecord.late_minutes}m)</span>}{activeRecord.overtime_hours > 0 && <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">Overtime (+{activeRecord.overtime_hours} hrs)</span>}</div>
              </motion.div>}
            </AnimatePresence>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-6"><p className="text-xs text-muted-foreground">Your attendance is saved automatically to today’s timesheet.</p>{status === 'checked_out' || status === 'loading' ? <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCheckIn} disabled={loading || status === 'loading'} className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">{loading ? 'Processing...' : <><Timer className="w-5 h-5" /> Check In Now</>}</motion.button> : <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCheckOut} disabled={loading} className="w-full sm:w-auto px-7 py-3.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold shadow-lg shadow-destructive/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">{loading ? 'Processing...' : <><LogOut className="w-5 h-5" /> Check Out Now</>}</motion.button>}</div>
          </div>
        </div>
      </motion.div>

      <section className="mt-6 bg-card rounded-[2rem] border border-border shadow-lg overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><History className="w-5 h-5" /></div>
            <div><h2 className="text-lg font-extrabold text-foreground">Attendance history</h2><p className="text-xs text-muted-foreground mt-1">Every check-in and check-out recorded for your profile</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="px-3 py-2 bg-muted rounded-lg"><strong className="text-foreground">{attendanceHistory.length}</strong> sessions</span>
            <span className="px-3 py-2 bg-muted rounded-lg"><strong className="text-foreground">{completedSessions}</strong> completed</span>
            <span className="px-3 py-2 bg-muted rounded-lg"><strong className="text-foreground">{totalHours.toFixed(1)}h</strong> logged</span>
          </div>
        </div>
        {historyLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading attendance history...</div>
        ) : attendanceHistory.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No attendance sessions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Check in</th><th className="px-6 py-3">Check out</th><th className="px-6 py-3">Duration</th><th className="px-6 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {attendanceHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{formatDate(record.check_in)}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{formatTime(record.check_in)}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{formatTime(record.check_out)}</td>
                    <td className="px-6 py-4 font-bold text-foreground">{record.worked_hours ? `${Number(record.worked_hours).toFixed(2)}h` : 'In progress'}</td>
                    <td className="px-6 py-4"><span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold', record.check_out ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>{record.check_out ? 'Completed' : 'In progress'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
