import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

export default function ScheduleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [form, setForm] = useState({
    name: '',
    calendar_type: 'standard',
  });
  
  const [lines, setLines] = useState([
    { day_of_week: 1, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
    { day_of_week: 2, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
    { day_of_week: 3, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
    { day_of_week: 4, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
    { day_of_week: 5, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(0);

  useEffect(() => {
    if (isEdit) {
      client.get(`/schedules/${id}`)
        .then(({ data }) => {
          setForm({ name: data.name, calendar_type: data.calendar_type });
          if (data.lines && data.lines.length > 0) {
            setLines(data.lines.map(line => ({
              ...line,
              start_time: line.start_time.substring(0, 5),
              end_time: line.end_time.substring(0, 5)
            })));
          }
          setWeeklyHours(data.weekly_hours || 0);
        })
        .catch(console.error);
    }
  }, [id, isEdit]);
  
  useEffect(() => {
    if (!isEdit) {
      // Calculate local preview for weekly hours
      const total = lines.reduce((sum, line) => {
        const parse = (time) => {
          const [h, m] = time.split(':').map(Number);
          return h + m / 60;
        };
        const s = parse(line.start_time);
        const e = parse(line.end_time);
        const worked = (e - s) - (line.break_minutes / 60);
        return sum + Math.max(0, worked);
      }, 0);
      setWeeklyHours(Math.round(total * 100) / 100);
    }
  }, [lines, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEdit) {
      navigate('/schedules'); // Only creating is supported per requirements usually, edit is view-only or handled similarly
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        lines: lines.map(line => ({
          ...line,
          break_minutes: parseInt(line.break_minutes, 10),
          start_time: line.start_time + ':00',
          end_time: line.end_time + ':00'
        }))
      };
      
      await client.post('/schedules', payload);
      navigate('/schedules');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { day_of_week: 1, start_time: '09:00', end_time: '17:00', break_minutes: 60 }]);
  };

  const updateLine = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const removeLine = (index) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'View Schedule' : 'New Schedule'}</h1>
        <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg font-semibold border border-blue-200">
          Total: {weeklyHours} hrs/week
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={isEdit} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" placeholder="e.g. Standard 40h" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calendar Type</label>
            <select value={form.calendar_type} onChange={e => setForm({...form, calendar_type: e.target.value})} disabled={isEdit} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100">
              <option value="standard">Standard</option>
              <option value="flexible">Flexible</option>
              <option value="shift">Shift</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Working Hours</h2>
            {!isEdit && (
              <button type="button" onClick={addLine} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition">
                + Add Day
              </button>
            )}
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="w-40">
                  <select value={line.day_of_week} onChange={e => updateLine(idx, 'day_of_week', parseInt(e.target.value, 10))} disabled={isEdit} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm outline-none disabled:bg-gray-200">
                    {DAYS_OF_WEEK.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">From</span>
                  <input type="time" value={line.start_time} onChange={e => updateLine(idx, 'start_time', e.target.value)} disabled={isEdit} required className="px-2 py-1.5 border border-gray-300 rounded-md text-sm outline-none disabled:bg-gray-200" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">To</span>
                  <input type="time" value={line.end_time} onChange={e => updateLine(idx, 'end_time', e.target.value)} disabled={isEdit} required className="px-2 py-1.5 border border-gray-300 rounded-md text-sm outline-none disabled:bg-gray-200" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Break (min)</span>
                  <input type="number" min="0" value={line.break_minutes} onChange={e => updateLine(idx, 'break_minutes', e.target.value)} disabled={isEdit} required className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm outline-none disabled:bg-gray-200" />
                </div>
                {!isEdit && (
                  <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 ml-auto px-2">
                    &times;
                  </button>
                )}
              </div>
            ))}
            {lines.length === 0 && <div className="text-sm text-gray-500 italic">No working days defined.</div>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/schedules')} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            {isEdit ? 'Back to Schedules' : 'Cancel'}
          </button>
          {!isEdit && (
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? 'Saving...' : 'Create Schedule'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
