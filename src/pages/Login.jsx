import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { loginApi } from '../Api/loginApi';
import { profileApi } from '../Api/profileApi';
import { AlertCircle, CheckCircle, Phone, Eye, EyeOff } from 'lucide-react';
import nwLogo from '../assets/NW_Logo.svg';
import ForgotPin from './ForgotPin';
import PhoneNumberInput from '../components/PhoneNumberInput';
import { isValidPhoneNumber } from 'libphonenumber-js';

export default function Login({ onLoginSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('error');
  const [showToast, setShowToast] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

  // Login form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);

  const triggerToast = (message, type = 'error') => {
    setToastMsg(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(timer);
  }, [showToast, toastMsg]);

  const handlePinChange = (index, val) => {
    if (val && !/^\d$/.test(val)) return;
    const newPin = [...pin];
    newPin[index] = val;
    setPin(newPin);
    if (val && index < 3) {
      document.getElementById(`pin-input-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
      document.getElementById(`pin-input-${index - 1}`)?.focus();
    }
  };

  const getLoginPayload = (loginResponse) => {
    const data = loginResponse?.data || loginResponse;
    return {
      token: data?.token || loginResponse?.token,
      user: data?.user || loginResponse?.user,
      userType: data?.userType || loginResponse?.userType
    };
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const phoneNumber = loginIdentifier.trim();
    const pinValue = pin.join('');

    if (!phoneNumber) { triggerToast('Phone number is required.'); return; }
    if (!isValidPhoneNumber(phoneNumber)) { triggerToast('Enter a valid  phone number'); return; }
    if (pinValue.length !== 4) { triggerToast('Enter your 4 digit PIN.'); return; }

    try {
      setIsSubmitting(true);
      const loginResponse = await loginApi(phoneNumber, pinValue);
      const { token, user, userType } = getLoginPayload(loginResponse);

      if (!token) throw new Error('Login succeeded, but token was missing from the server response.');

      localStorage.setItem('userToken', token);

      let adminProfile = user || {};
      try {
        const profileRes = await profileApi();
        if (profileRes && profileRes.data) {
          adminProfile = profileRes.data;
        } else if (profileRes) {
          adminProfile = profileRes;
        }
      }
      catch (profileError) { console.warn('Profile fetch failed after login:', profileError); }

      triggerToast(loginResponse?.message || 'Success', 'success');

      setTimeout(() => {
        onLoginSuccess({
          ...adminProfile,
          id: adminProfile.id || user?.id,
          name: adminProfile.name || user?.name || '',
          phoneNumber: adminProfile.phoneNumber || user?.phoneNumber || phoneNumber,
          role: adminProfile.role || adminProfile.userType || userType || '',
          status: adminProfile.status || ''
        });
      }, 1200);
    } catch (error) {
      localStorage.removeItem('userToken');
      triggerToast(error.response?.data?.message || error.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show Forgot PIN page
  if (showForgotPin) {
    return <ForgotPin onBackToLogin={() => setShowForgotPin(false)} />;
  }

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        <div className="login-form-panel">

          {/* Logo + Title */}
          <div className="login-brand-header">
            <div className="login-brand-logo-frame">
              <img src={nwLogo} alt="ContactQube" className="login-brand-logo" />
            </div>
            <h2 className="login-title">Sign In</h2>
            <p className="login-subtitle">Enter Your Phone Number and PIN to Continue</p>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleLoginSubmit} className="login-form" autoComplete="off">
            {/* Dummy fields to prevent browser autofill */}
            <input type="text" name="chrome_autofill_dummy_username" style={{ display: 'none' }} autoComplete="off" />
            <input type="password" name="chrome_autofill_dummy_password" style={{ display: 'none' }} autoComplete="off" />

            {/* Phone Number */}
            <div className="login-field-group">
              <label className="login-field-label">Phone Number</label>
              <div className="phone-input-wrapper block w-full">
                <PhoneNumberInput
                  id="fresh_login_field_value"
                  value={loginIdentifier}
                  onChange={(val) => setLoginIdentifier(val)}
                  placeholder="Enter Phone Number"
                  className="h-12"
                />
              </div>
            </div>

            {/* PIN */}
            <div className="login-field-group">
              <label className="login-field-label">PIN</label>
              <div className="pin-section-wrapper">
                <div className="pin-inputs-column">
                  <div className="pin-boxes-group">
                    {pin.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`pin-input-${idx}`}
                        type={showPin ? 'text' : 'password'}
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="pin-box-input"
                        autoComplete="new-password"
                      />
                    ))}
                  </div>
                  <div className="forgot-pin-container">
                    <button
                      type="button"
                      className="forgot-pin-link"
                      onClick={() => setShowForgotPin(true)}
                    >
                      Forgot PIN?
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="pin-eye-btn"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer">
            <span className="login-powered-text">Powered by ContactQube</span>
          </div>
        </div>
      </div>

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
