import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, Phone, ArrowLeft, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import nwLogo from '../assets/NW_Logo.svg';
import { requestOtpApi, verifyOtpApi, resetPinApi } from '../Api/loginApi';
import PhoneNumberInput from '../components/PhoneNumberInput';
import { isValidPhoneNumber } from 'libphonenumber-js';

/* ─── Step identifiers ─────────────────────────────────── */
const STEP = { PHONE: 'phone', OTP: 'otp', NEW_PIN: 'new_pin', SUCCESS: 'success' };

export default function ForgotPin({ onBackToLogin }) {
  const [step, setStep] = useState(STEP.PHONE);

  // Phone step
  const [phone, setPhone] = useState('');

  // OTP step
  const [otp, setOtp] = useState(['', '', '', '']);

  // New PIN step
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('error');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message, type = 'error') => {
    setToastMsg(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(t);
  }, [showToast, toastMsg]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  /* ─── OTP input helpers ─────────────────────────────── */
  const handleOtpChange = (idx, val) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 3) document.getElementById(`otp-box-${idx + 1}`)?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      document.getElementById(`otp-box-${idx - 1}`)?.focus();
    }
  };

  /* ─── PIN input helpers ─────────────────────────────── */
  const makePinHandler = (setter, id) => (idx, val) => {
    if (val && !/^\d$/.test(val)) return;
    setter((prev) => {
      const n = [...prev];
      n[idx] = val;
      return n;
    });
    if (val && idx < 3) document.getElementById(`${id}-${idx + 1}`)?.focus();
  };

  const makePinKeyDown = (getter, setter, id) => (idx, e) => {
    if (e.key === 'Backspace' && !getter[idx] && idx > 0) {
      setter((prev) => { const n = [...prev]; n[idx - 1] = ''; return n; });
      document.getElementById(`${id}-${idx - 1}`)?.focus();
    }
  };

  /* ─── Step 1: Send OTP ──────────────────────────────── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) { triggerToast('Phone number is required.'); return; }
    if (!isValidPhoneNumber(phone)) { triggerToast('Enter a valid phone number'); return; }
    try {
      setIsSubmitting(true);
      const res = await requestOtpApi(phone);
      triggerToast(res?.message || 'Success', 'success');
      setResendTimer(60);
      setStep(STEP.OTP);
    } catch (err) {
      triggerToast(err?.response?.data?.message || err?.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Step 2: Verify OTP ────────────────────────────── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpVal = otp.join('');
    if (otpVal.length !== 4) { triggerToast('Enter the complete 4-digit OTP.'); return; }
    try {
      setIsSubmitting(true);
      const res = await verifyOtpApi(phone, otpVal);
      triggerToast(res?.message || 'Success', 'success');
      setStep(STEP.NEW_PIN);
    } catch (err) {
      triggerToast(err?.response?.data?.message || err?.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Step 2: Resend OTP ────────────────────────────── */
  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      const res = await requestOtpApi(phone);
      triggerToast(res?.message || 'Success', 'success');
      setResendTimer(60);
      setOtp(['', '', '', '']);
    } catch (err) {
      triggerToast(err?.response?.data?.message || err?.message || 'Error');
    }
  };

  /* ─── Step 3: Reset PIN ─────────────────────────────── */
  const handleResetPin = async (e) => {
    e.preventDefault();
    const p1 = newPin.join('');
    const p2 = confirmPin.join('');
    if (p1.length !== 4) { triggerToast('Enter a 4-digit new PIN.'); return; }
    if (p1 !== p2) { triggerToast('PINs do not match. Please try again.'); return; }
    try {
      setIsSubmitting(true);
      await resetPinApi(phone, otp.join(''), p1);
      setStep(STEP.SUCCESS);
    } catch (err) {
      triggerToast(err?.response?.data?.message || err?.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Step progress indicator ───────────────────────── */
  const steps = [
    { key: STEP.PHONE, label: 'Phone' },
    { key: STEP.OTP, label: 'Verify' },
    { key: STEP.NEW_PIN, label: 'New PIN' },
  ];
  const stepIndex = { [STEP.PHONE]: 0, [STEP.OTP]: 1, [STEP.NEW_PIN]: 2, [STEP.SUCCESS]: 3 };
  const currentStepIdx = stepIndex[step] ?? 0;

  /* ─── Render ────────────────────────────────────────── */
  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        <div className="login-form-panel">

          {/* Logo */}
          <div className="login-brand-header" style={{ marginBottom: 20 }}>
            <div className="login-brand-logo-frame">
              <img src={nwLogo} alt="ContactQube" className="login-brand-logo" />
            </div>
          </div>

          {/* Step indicator (hide on success) */}
          {step !== STEP.SUCCESS && (
            <div className="fp-step-bar">
              {steps.map((s, i) => (
                <React.Fragment key={s.key}>
                  <div className={`fp-step-dot ${i < currentStepIdx ? 'done' : i === currentStepIdx ? 'active' : ''}`}>
                    {i < currentStepIdx ? <CheckCircle size={13} /> : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`fp-step-line ${i < currentStepIdx ? 'done' : ''}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── STEP 1: Phone ── */}
          {step === STEP.PHONE && (
            <>
              <div className="fp-header">
                {/* <div className="fp-icon-circle">
                  <Phone size={22} color="#b70805" />
                </div> */}
                <h2 className="fp-title">Forgot PIN?</h2>
                <p className="fp-subtitle">Enter your registered phone number. We'll send an OTP to verify your identity.</p>
              </div>
              <form className="login-form" onSubmit={handleSendOtp}>
                <div className="login-field-group">
                  <label className="login-field-label">Phone Number</label>
                  <div className="phone-input-wrapper block w-full">
                    <PhoneNumberInput
                      value={phone}
                      onChange={(val) => setPhone(val)}
                      placeholder="Enter Phone Number"
                      className="h-12"
                    />
                  </div>
                </div>
                <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === STEP.OTP && (
            <>
              <div className="fp-header">
                <div className="fp-icon-circle">
                  <ShieldCheck size={22} color="#b70805" />
                </div>
                <h2 className="fp-title">Verify OTP</h2>
                <p className="fp-subtitle">Enter the 4-digit OTP sent to <strong>{phone}</strong></p>
              </div>
              <form className="login-form" onSubmit={handleVerifyOtp}>
                <div className="login-field-group">
                  <label className="login-field-label">One-Time Password</label>
                  <div className="fp-otp-group">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-box-${idx}`}
                        type="tel"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="fp-otp-box"
                        inputMode="numeric"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>
                  <div className="fp-resend-row">
                    {resendTimer > 0
                      ? <span className="fp-resend-timer">Resend OTP in <strong>{resendTimer}s</strong></span>
                      : <button type="button" className="fp-resend-btn" onClick={handleResend}>Resend OTP</button>
                    }
                  </div>
                </div>
                <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" className="fp-back-link" onClick={() => { setOtp(['', '', '', '']); setStep(STEP.PHONE); }}>
                  <ArrowLeft size={14} /> Change phone number
                </button>
              </form>
            </>
          )}

          {/* ── STEP 3: New PIN ── */}
          {step === STEP.NEW_PIN && (
            <>
              <div className="fp-header">
                <div className="fp-icon-circle">
                  <KeyRound size={22} color="#b70805" />
                </div>
                <h2 className="fp-title">Set New PIN</h2>
                <p className="fp-subtitle">Choose a strong 4-digit PIN for your account.</p>
              </div>
              <form className="login-form" onSubmit={handleResetPin}>
                {/* New PIN */}
                <div className="login-field-group">
                  <label className="login-field-label">New PIN</label>
                  <div className="fp-pin-row-wrapper">
                    <div className="fp-pin-row">
                      {newPin.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`np-${idx}`}
                          type={showNewPin ? 'tel' : 'password'}
                          maxLength="1"
                          value={digit}
                          onChange={(e) => makePinHandler(setNewPin, 'np')(idx, e.target.value)}
                          onKeyDown={(e) => makePinKeyDown(newPin, setNewPin, 'np')(idx, e)}
                          className="fp-pin-box"
                          autoFocus={idx === 0}
                          inputMode="numeric"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="fp-pin-eye-btn"
                      onClick={() => setShowNewPin((v) => !v)}
                      aria-label={showNewPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {/* Confirm PIN */}
                <div className="login-field-group">
                  <label className="login-field-label">Confirm PIN</label>
                  <div className="fp-pin-row-wrapper">
                    <div className="fp-pin-row">
                      {confirmPin.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`cp-${idx}`}
                          type={showConfirmPin ? 'tel' : 'password'}
                          maxLength="1"
                          value={digit}
                          onChange={(e) => makePinHandler(setConfirmPin, 'cp')(idx, e.target.value)}
                          onKeyDown={(e) => makePinKeyDown(confirmPin, setConfirmPin, 'cp')(idx, e)}
                          className="fp-pin-box"
                          inputMode="numeric"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="fp-pin-eye-btn"
                      onClick={() => setShowConfirmPin((v) => !v)}
                      aria-label={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Resetting...' : 'Reset PIN'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 4: Success ── */}
          {step === STEP.SUCCESS && (
            <div className="fp-success-block">
              <div className="fp-success-icon">
                <CheckCircle size={44} color="#10b981" />
              </div>
              <h2 className="fp-title" style={{ color: '#10b981' }}>PIN Reset!</h2>
              <p className="fp-subtitle">Your PIN has been successfully updated. You can now sign in with your new PIN.</p>
              <button className="login-submit-btn" style={{ marginTop: 24 }} onClick={onBackToLogin}>
                Back to Sign In
              </button>
            </div>
          )}

          {/* Back to Login link */}
          {step !== STEP.SUCCESS && (
            <div className="login-footer">
              <button className="fp-back-to-login" onClick={onBackToLogin}>
                <ArrowLeft size={13} /> Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {showToast && createPortal(
        <div className="toast-container login-toast-container">
          <div className={`custom-toast ${toastType}`}>
            <div className="toast-icon-wrapper">
              {toastType === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </div>
            <span className="toast-message">{toastMsg}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
