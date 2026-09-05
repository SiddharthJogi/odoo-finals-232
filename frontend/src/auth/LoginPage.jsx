import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';

const DEMO_CREDS = [
  { label: 'Admin', email: 'admin@peoplepay360.com', password: 'admin123', color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { label: 'HR Manager', email: 'arjun.mehta@company.com', password: 'hrmanager123', color: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100' },
];

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  const fillDemo = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md mx-4">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/90 to-indigo-700/90 px-8 pt-8 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/20 mb-4 shadow-lg">
              <Sparkles className="w-7 h-7 text-amber-300" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">PeoplePay<span className="text-blue-200">360</span></h1>
            <p className="text-blue-200 text-sm mt-1 font-medium">Enterprise HR &amp; Payroll Platform</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 mb-5 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-medium"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm font-medium pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Platform'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-3 text-center">
                Quick Demo Access
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_CREDS.map((cred) => (
                  <button
                    key={cred.label}
                    type="button"
                    onClick={() => fillDemo(cred)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition ${cred.color}`}
                  >
                    {cred.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-2">
                Click to auto-fill credentials, then Sign In
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-xs mt-5">
          PeoplePay360 · Odoo Hackathon Demo · 2026
        </p>
      </div>
    </div>
  );
}
