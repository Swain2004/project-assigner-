import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', department: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'register' && form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ name: form.name, email: form.email, password: form.password, department: form.department });
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const passwordsMatch = mode === 'register' && form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsDontMatch = mode === 'register' && form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div className="min-h-screen flex bg-white">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleReveal {
          from { opacity: 0; transform: scale(1.06); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shineMove {
          0% { left: -75%; }
          100% { left: 125%; }
        }
        .fade-in { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-in-d1 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .fade-in-d2 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.16s both; }
        .fade-in-d3 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.24s both; }
        .fade-in-d4 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.32s both; }
        .fade-in-d5 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.40s both; }
        .slide-in { animation: slideIn 1s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .img-reveal { animation: scaleReveal 1.4s cubic-bezier(0.16,1,0.3,1) both; }

        .ios-input {
          width: 100%;
          padding-top: 15px;
          padding-bottom: 15px;
          padding-left: 16px;
          padding-right: 16px;
          background: #f5f5f7;
          border: 1px solid transparent;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 400;
          color: #1d1d1f;
          transition: all 0.25s cubic-bezier(0.25,0.46,0.45,0.94);
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
        }
        .ios-input:focus {
          background: #fff;
          border-color: rgba(0,122,255,0.4);
          box-shadow: 0 0 0 4px rgba(0,122,255,0.08);
        }
        .ios-input::placeholder { color: #aeaeb2; }
        .ios-input:disabled { opacity: 0.5; }
        .ios-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #1d1d1f;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }

        .shine-btn {
          position: relative;
          width: 100%;
          padding: 16px;
          background: linear-gradient(180deg, #0A84FF 0%, #0066CC 100%);
          color: #fff;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25,0.46,0.45,0.94);
          box-shadow: 0 2px 8px rgba(0,102,204,0.3), 0 8px 24px rgba(0,102,204,0.15), inset 0 1px 0 rgba(255,255,255,0.25);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
        }
        .shine-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -75%;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: skewX(-20deg);
          animation: shineMove 3s ease-in-out infinite;
        }
        .shine-btn::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%);
          border-radius: 14px 14px 0 0;
          pointer-events: none;
        }
        .shine-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,102,204,0.4), 0 12px 32px rgba(0,102,204,0.2), inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .shine-btn:active { transform: translateY(0) scale(0.98); }
        .shine-btn:disabled {
          background: linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%);
          cursor: not-allowed; transform: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .shine-btn:disabled::before { animation: none; }

        .photo-overlay {
          background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%);
        }
      `}</style>

      {/* ━━━ LEFT: Form (centered) ━━━ */}
      <div className="w-full md:w-[50%] lg:w-[45%] flex items-center justify-center min-h-screen px-5 sm:px-8 md:px-12 lg:px-20 py-10">
        <div className="max-w-[380px] w-full">
          {/* Logo */}
          <div className="fade-in flex items-center gap-3 mb-10">
            <img src="/aitechtures-logo.png" alt="Ai-Tech-Tures Labs" className="w-10 h-10 object-contain" />
            <span className="text-[17px] font-bold text-[#1d1d1f] tracking-tight" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>
              Ai-Tech-Tures Labs
            </span>
          </div>

          {/* Heading */}
          <div className="fade-in-d1 mb-8">
            <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-tight leading-tight" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-[#86868b] text-[15px] mt-2">
              {mode === 'login' ? 'Sign in to your workspace' : 'Set up your Ai-Tech-Tures account'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="mb-4 fade-in-d2">
                  <label className="ios-label">Full Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="Your full name" required className="ios-input" autoComplete="name" />
                </div>
                <div className="mb-4 fade-in-d2">
                  <label className="ios-label">Department <span className="text-[#aeaeb2] font-normal">(optional)</span></label>
                  <input type="text" name="department" value={form.department} onChange={handleChange}
                    placeholder="e.g. Engineering" className="ios-input" />
                </div>
              </>
            )}

            <div className="mb-4 fade-in-d2">
              <label className="ios-label">Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@aitechtures.com" required className="ios-input" autoComplete="email" />
            </div>

            <div className="mb-4 fade-in-d3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="ios-label mb-0">Password</label>
                {mode === 'login' && (
                  <Link to="/forgot-password" className="text-[13px] font-medium text-[#0A84FF] hover:text-[#0066CC] transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} placeholder={mode === 'login' ? '••••••••' : 'At least 6 characters'}
                  required minLength={6} className="ios-input" style={{ paddingRight: 48 }}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aeaeb2] hover:text-[#636366] transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="mb-4 fade-in-d4">
                <label className="ios-label">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword}
                    onChange={handleChange} placeholder="Repeat your password"
                    required minLength={6} className="ios-input" style={{ paddingRight: 48 }} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aeaeb2] hover:text-[#636366] transition-colors">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordsMatch && (
                  <div className="flex items-center gap-1.5 mt-2" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <CheckCircle size={14} className="text-[#30D158]" />
                    <p className="text-[13px] text-[#30D158] font-medium">Passwords match</p>
                  </div>
                )}
                {passwordsDontMatch && (
                  <p className="text-[13px] text-[#FF453A] font-medium mt-2" style={{ animation: 'fadeIn 0.3s ease' }}>
                    Passwords don't match
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2.5 p-4 mb-4 bg-[#fff5f5] border border-[#FFD4D2] rounded-xl" style={{ animation: 'fadeIn 0.3s ease' }}>
                <AlertCircle size={16} className="text-[#FF453A] flex-shrink-0" />
                <p className="text-[14px] text-[#FF453A] font-medium">{error}</p>
              </div>
            )}

            <div className={mode === 'register' ? 'fade-in-d5' : 'fade-in-d4'}>
              <button type="submit" disabled={loading} className="shine-btn">
                {loading ? (
                  <span className="flex items-center justify-center gap-2.5 relative z-10">
                    <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  <span className="relative z-10">{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-7 fade-in-d4">
            <p className="text-[14px] text-[#86868b] text-center">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setForm({ ...form, confirmPassword: '' }); }}
                className="font-semibold text-[#0A84FF] hover:text-[#0066CC] transition-colors">
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ━━━ RIGHT: Photo ━━━ */}
      <div className="hidden md:block md:w-[50%] lg:w-[55%] relative overflow-hidden md:rounded-l-[24px] lg:rounded-l-[28px]">
        <img
          src="/office-building.png"
          alt="Modern office building"
          className="img-reveal absolute inset-0 w-full h-full object-cover"
        />
        <div className="photo-overlay absolute inset-0" />

        <div className="absolute bottom-0 left-0 right-0 p-14 slide-in">
          <h2 className="text-[30px] font-bold text-white tracking-tight leading-tight mb-3" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>
            Intelligent Project<br />Management
          </h2>
          <p className="text-white/50 text-[15px] max-w-[400px] leading-relaxed">
            Task assignment, team coordination, and AI-assisted workflows for modern engineering teams.
          </p>
        </div>
      </div>
    </div>
  );
}
