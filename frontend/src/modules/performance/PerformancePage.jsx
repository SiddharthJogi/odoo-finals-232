import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import client from '../../api/client';
import { Award, Check, ChevronLeft, ChevronRight, Plus, Send } from 'lucide-react';

const CRITERIA = [
    ['overtime', 'Overtime contribution'],
    ['project_completion', 'Project completion'],
    ['quality', 'Quality / performance'],
    ['attendance', 'Attendance / reliability'],
];
const emptyLines = CRITERIA.map(([criterion]) => ({ criterion, score: 0, remarks: '' }));

export default function PerformancePage() {
    const { role, user } = useAuth();
    const { addToast } = useToast();
    const isEmployee = role === 'employee';
    const canManage = ['admin', 'hr_manager', 'hr_payroll_manager'].includes(role);
    const [reviews, setReviews] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ employee_id: '', period_start: '', period_end: '', project_name: '', description: '', lines: emptyLines });
    const [structures, setStructures] = useState([]);
    const [structureId, setStructureId] = useState('');
    const [performanceComponents, setPerformanceComponents] = useState([]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '6' });
            if (isEmployee) params.set('employee_id', user.employeeId);
            const { data } = await client.get(`/performance/reviews?${params.toString()}`);
            setReviews(data.reviews || []);
            setPagination(data.pagination || { page, totalPages: 0, total: 0 });
        } catch (error) { addToast(error.response?.data?.error || 'Failed to load performance reviews', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReviews(); }, [page, isEmployee, user?.employeeId]);
    useEffect(() => {
        if (!canManage) return;
        client.get('/employees?all=true&status=active').then(({ data }) => setEmployees(data.employees || [])).catch(() => addToast('Failed to load employees', 'error'));
    }, [canManage]);
    useEffect(() => {
        client.get('/payroll/structures').then(({ data }) => {
            setStructures(data);
            if (data[0]) setStructureId(String(data[0].id));
        }).catch(() => addToast('Failed to load salary structures', 'error'));
    }, []);
    useEffect(() => {
        if (!structureId) return;
        client.get(`/payroll/performance-rules?structure_id=${structureId}`)
            .then(({ data }) => setPerformanceComponents(data))
            .catch(() => addToast('Failed to load performance-based salary components', 'error'));
    }, [structureId]);

    const updateLine = (index, key, value) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: key === 'score' ? Number(value) : value } : line) }));
    const submitReview = async (event) => {
        event.preventDefault();
        try {
            await client.post('/performance/reviews', { ...form, employee_id: Number(form.employee_id), status: 'draft' });
            setShowForm(false); setPage(1); await fetchReviews(); addToast('Performance review saved as draft', 'success');
        } catch (error) { addToast(error.response?.data?.error || 'Failed to save performance review', 'error'); }
    };
    const transition = async (id, action) => {
        try { await client.post(`/performance/reviews/${id}/${action}`); await fetchReviews(); addToast(`Review ${action} successfully`, 'success'); }
        catch (error) { addToast(error.response?.data?.error || `Failed to ${action} review`, 'error'); }
    };

    return <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div><h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2"><Award className="w-7 h-7 text-amber-500" /> Performance-Based Pay</h1><p className="text-xs text-gray-500 mt-1">Scores are out of 100. Approved points are converted into an explicit payroll bonus.</p></div>
            {canManage && <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600"><Plus className="w-4 h-4" /> New Review</button>}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-sm font-extrabold text-amber-950">Eligible salary components</h2><p className="text-xs text-amber-800 mt-1">These are the optional structure components marked for performance pay.</p></div>
                <select value={structureId} onChange={(event) => setStructureId(event.target.value)} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"><option value="">Select salary structure</option>{structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}</select>
            </div>
            {structureId && <div className="mt-3 flex flex-wrap gap-2">{performanceComponents.length ? performanceComponents.map((component) => <span key={component.id} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900">{component.name}: ₹{Number(component.amount || 0).toLocaleString('en-IN')}</span>) : <span className="text-xs text-amber-800">No salary components are marked for performance pay.</span>}</div>}
        </div>

        {showForm && <form onSubmit={submitReview} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
                <input required type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <input required type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} placeholder="Project name (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Review description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows="2" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{form.lines.map((line, index) => <div key={line.criterion} className="border border-gray-200 rounded-lg p-3"><div className="flex justify-between text-xs font-bold text-gray-700"><span>{CRITERIA[index][1]}</span><span>{line.score}/25</span></div><input type="range" min="0" max="25" value={line.score} onChange={(e) => updateLine(index, 'score', e.target.value)} className="w-full" /><input value={line.remarks} onChange={(e) => updateLine(index, 'remarks', e.target.value)} placeholder="Remarks" className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-2" /></div>)}</div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600">Cancel</button><button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold">Save Draft</button></div>
        </form>}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Employee</th><th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Period</th><th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Points</th><th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Performance pay</th><th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Status</th><th className="px-5 py-3 text-right text-xs uppercase text-gray-500">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading reviews...</td></tr> : reviews.map((review) => <tr key={review.id}><td className="px-5 py-3 text-sm font-semibold">{review.employee_name}</td><td className="px-5 py-3 text-xs text-gray-500">{review.period_start} to {review.period_end}</td><td className="px-5 py-3 text-sm font-bold text-amber-700">{review.total_points}/100</td><td className="px-5 py-3 text-sm">₹{Number(review.performance_pay).toLocaleString('en-IN')}</td><td className="px-5 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">{review.status}</span></td><td className="px-5 py-3 text-right">{canManage && review.status === 'draft' && <button onClick={() => transition(review.id, 'submit')} className="text-xs text-blue-600 font-semibold"><Send className="inline w-3 h-3 mr-1" />Submit</button>}{canManage && review.status === 'submitted' && <button onClick={() => transition(review.id, 'approve')} className="text-xs text-emerald-600 font-semibold"><Check className="inline w-3 h-3 mr-1" />Approve</button>}</td></tr>)}</tbody></table>{!loading && reviews.length === 0 && <p className="p-8 text-center text-gray-500">No performance reviews found.</p>}</div>
        {!loading && pagination.totalPages > 0 && <div className="flex justify-between items-center text-xs text-gray-500"><span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} reviews</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="px-3 py-1.5 border rounded disabled:opacity-40"><ChevronLeft className="inline w-3 h-3" /> Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="px-3 py-1.5 border rounded disabled:opacity-40">Next <ChevronRight className="inline w-3 h-3" /></button></div></div>}
    </div>;
}
