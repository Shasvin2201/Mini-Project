import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle2, ArrowRight, AlertCircle, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Button, Input, Card } from '../../components/common';

export function SignupPage() {
  const [step, setStep] = useState(1); // 1 = Registration form, 2 = OTP verification, 3 = Completed
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // OTP State: 6-digit OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('749215');
  const [resendTimer, setResendTimer] = useState(60);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const otpInputsRef = useRef([]);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (formData.name.trim().length < 3) {
      setError('Full name must be at least 3 characters.');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please provide a valid institutional email address.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    // Generate simulated 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setResendTimer(60);
    setOtp(['', '', '', '', '', '']);
    setStep(2);

    showToast(`Verification code sent to ${formData.email}. Demo Code: ${code}`, 'info', 7000);
  };

  const handleOtpChange = (index, value) => {
    // Only accept numeric single character
    const val = value.slice(-1);
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const digits = pasted.split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');

    const fullEnteredOtp = otp.join('');
    if (fullEnteredOtp.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (fullEnteredOtp === generatedOtp || fullEnteredOtp === '123456') {
        setStep(3);
        showToast('Institutional identity verified successfully!', 'success');
      } else {
        setError(`Incorrect verification code. (Hint: Current test code is ${generatedOtp})`);
      }
    }, 600);
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newCode);
    setResendTimer(60);
    setOtp(['', '', '', '', '', '']);
    showToast(`New verification code generated: ${newCode}`, 'info', 7000);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-1/4 -right-48 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-48 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-xl shadow-indigo-600/30 text-white font-extrabold text-2xl mb-2">
            C
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            CAMPUS SYSTEM
          </h1>
          <p className="text-sm text-gray-400">
            Institutional Faculty Onboarding
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#182234] border border-gray-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
          {/* STEP 1: Registration form */}
          {step === 1 && (
            <>
              <div className="border-b border-gray-700/60 pb-4">
                <h2 className="text-lg font-bold text-gray-100">Faculty Registration</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Create your institutional account to request and monitor campus spaces
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <form onSubmit={handleStep1Submit} className="space-y-4">
                <Input
                  label="Full Name"
                  name="name"
                  icon={User}
                  placeholder="e.g. Dr. Vivin C"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />

                <Input
                  label="Institutional Email"
                  name="email"
                  type="email"
                  icon={Mail}
                  placeholder="e.g. vivinc@campus.com"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />

                <Input
                  label="Password"
                  name="password"
                  type="password"
                  icon={Lock}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={handleFormChange}
                  required
                />

                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  icon={Lock}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleFormChange}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3"
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Proceed to OTP Verification
                </Button>
              </form>
            </>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 border-b border-gray-700/60 pb-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-gray-100">Verify Email</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Enter the 6-digit verification code sent to <strong className="text-gray-200">{formData.email}</strong>
                  </p>
                </div>
              </div>

              {/* Demo Hint Banner */}
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between">
                <span>Demo Code: <strong className="text-indigo-200 tracking-wider text-sm">{generatedOtp}</strong></span>
                <span className="text-[10px] text-indigo-400 uppercase font-semibold">Test Sandbox</span>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6-Digit Inputs Grid */}
                <div className="flex justify-between items-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e.target.value ? e : e)}
                      className="w-12 h-14 text-center text-xl font-bold bg-[#111827] text-white border border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all shadow-inner"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3"
                  loading={loading}
                  icon={KeyRound}
                >
                  Verify & Activate Account
                </Button>

                {/* Resend button */}
                <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                  <span>Didn't receive the code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STEP 3: Verification Completed */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-glow-emerald">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-100">Verification Complete!</h2>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Your identity has been verified. In accordance with institutional policies, admin credentials provision campus accounts. You can now sign in using your pre-configured faculty account.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  variant="emerald"
                  className="w-full py-3"
                  onClick={() => navigate('/login')}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Go to Sign In
                </Button>
              </div>
            </div>
          )}

          {/* Back to login */}
          <div className="pt-2 text-center text-xs text-gray-400 border-t border-gray-700/60">
            Already have an active account?{' '}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 ml-1"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
