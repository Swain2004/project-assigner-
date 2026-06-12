import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.toLowerCase().trim() });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .fade-in { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-in-d1 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .fade-in-d2 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.16s both; }
        .fade-in-d3 { animation: fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.24s both; }
        .slide-in { animation: slideIn 1s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .img-reveal { animation: scaleReveal 1.4s cubic-bezier(0.16,1,0.3,1) both; }
        .check-pop { animation: checkPop 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both; }

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

          <Link to="/login" className="fade-in inline-flex items-center gap-2 text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors mb-8 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" /> Back to login
          </Link>

          {success ? (
            <div className="fade-in-d1">
              <div className="check-pop w-16 h-16 bg-[#E8FAE8] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={28} className="text-[#30D158]" />
              </div>
              <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight text-center mb-2" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>
                Check your inbox
              </h1>
              <p className="text-[14px] text-[#86868b] text-center mb-1">We've sent a password reset link to</p>
              <p className="text-[14px] font-semibold text-[#1d1d1f] text-center bg-[#f5f5f7] rounded-xl py-3 px-5 mb-6">{email}</p>
              <p className="text-[13px] text-[#aeaeb2] text-center mb-8">Didn't receive it? Check your spam folder or try again.</p>
              <Link to="/login" className="inline-flex items-center gap-2 text-[14px] font-medium text-[#0A84FF] hover:text-[#0066CC] transition-colors group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="fade-in-d1 mb-8">
                <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-tight leading-tight" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>
                  Forgot password?
                </h1>
                <p className="text-[#86868b] text-[15px] mt-2">No worries, we'll send you reset instructions.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-5 fade-in-d2">
                  <label className="ios-label">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@aitechtures.com" required className="ios-input" style={{ paddingLeft: 44 }} autoComplete="email" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-4 mb-5 bg-[#fff5f5] border border-[#FFD4D2] rounded-xl" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <AlertCircle size={16} className="text-[#FF453A] flex-shrink-0" />
                    <p className="text-[14px] text-[#FF453A] font-medium">{error}</p>
                  </div>
                )}

                <div className="fade-in-d3">
                  <button type="submit" disabled={loading} className="shine-btn">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2.5 relative z-10">
                        <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <span className="relative z-10">Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ━━━ RIGHT: Photo ━━━ */}
      <div className="hidden md:block md:w-[50%] lg:w-[55%] relative overflow-hidden md:rounded-l-[24px] lg:rounded-l-[28px]">
        <img src="/tech-workspace.png" alt="Modern tech workspace" className="img-reveal absolute inset-0 w-full h-full object-cover" />
        <div className="photo-overlay absolute inset-0" />
        <div className="absolute bottom-0 left-0 right-0 p-14 slide-in">
          <h2 className="text-[30px] font-bold text-white tracking-tight leading-tight mb-3" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>
            Secure Account<br />Recovery
          </h2>
          <p className="text-white/50 text-[15px] max-w-[400px] leading-relaxed">
            Reset your password securely with encrypted token delivery to your registered email.
          </p>
        </div>
      </div>
    </div>
  );
}
