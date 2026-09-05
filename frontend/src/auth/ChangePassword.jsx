import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, Save, Loader2 } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../components/Toast';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.next !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await client.patch('/users/me/password', {
        current_password: form.current,
        new_password: form.next,
      });
      addToast('Password changed successfully', 'success');
      setForm({ current: '', next: '', confirm: '' });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Change Password</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Update your password securely.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
          <label className="block text-sm font-semibold text-foreground">
            Current password
            <input type="password" value={form.current} onChange={updateField('current')} autoComplete="current-password" required className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            New password
            <input type="password" value={form.next} onChange={updateField('next')} autoComplete="new-password" minLength={8} required className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Confirm new password
            <input type="password" value={form.confirm} onChange={updateField('confirm')} autoComplete="new-password" minLength={8} required className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 rounded-lg bg-muted text-sm font-semibold text-foreground hover:bg-muted/80">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}