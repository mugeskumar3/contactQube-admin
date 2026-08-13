import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select } from 'antd';
import { formatCurrency } from '../utils/format';
import { Check, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getPlansApi, createPlanApi, updatePlanApi } from '../Api/plansApi';
import { hasPermission } from '../utils/permission';
const PLAN_THEME = {
  'Diamond Plan': { gradient: 'linear-gradient(to right, #b70805, #1e2e45)', badge: 'badge-purple', accent: 'text-[#b70805]' },
  'Platinum Plan': { gradient: 'linear-gradient(to right, #b70805, #1e2e45)', badge: 'badge-info', accent: 'text-[#b70805]' },
  default: { gradient: 'linear-gradient(to right, #1e2e45, #b70805)', badge: 'badge-neutral', accent: 'text-[#1e2e45]' },
};
const getPlanTheme = (name) => PLAN_THEME[name] || PLAN_THEME.default;

const normalizePlan = (p) => ({
  ...p,
  id: p.id || p._id,
  name: p.name || p.planName || '',
  price: p.price ?? p.amount ?? 0,
  interval: p.interval || p.billingInterval || 'month',
  activeSubscribers: p.activeSubscribers ?? p.activeUserCount ?? p.subscriberCount ?? 0,
  features: Array.isArray(p.features) ? p.features : [],
});

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'edit' | 'add' | 'view'
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = useCallback((message, type = 'success') => {
    setToastMsg(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Form Fields
  const [planName, setPlanName] = useState('');
  const [planInterval, setPlanInterval] = useState('month');
  const [price, setPrice] = useState(0);
  const [featuresInput, setFeaturesInput] = useState('');
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      try {
        const res = await getPlansApi({ page: 0, limit: 0 });
        const normalized = (res?.data || []).map(normalizePlan);
        if (!cancelled) setPlans(normalized);
      } catch (err) {
        console.error('Failed to load plans from API:', err);
        if (!cancelled) {
          setPlans([]);
          triggerToast(err.response?.data?.message || err.message || 'Error loading plans', 'error');
        }
      } finally {
        if (!cancelled) setIsLoadingPlans(false);
      }
    };

    fetchPlans();
    return () => { cancelled = true; };
  }, [triggerToast]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const newErrors = {};
    if (view === 'add' && !planName.trim()) {
      newErrors.planName = 'Plan Name is Required';
    }
    if (price === '' || price === null || price === undefined) {
      newErrors.price = 'Billing Rate is Required';
    } else if (Number(price) < 0 || isNaN(Number(price))) {
      newErrors.price = 'Price must be a valid, positive number.';
    }

    const featureList = featuresInput
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
    if (featureList.length === 0) {
      newErrors.featuresInput = 'Please specify at least one feature.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      if (view === 'add') {
        const payload = {
          name: planName.trim(),
          interval: planInterval,
          price: Number(price),
          features: featureList,
        };
        const res = await createPlanApi(payload);
        const newPlan = normalizePlan({
          ...payload,
          ...res?.data,
          id: res?.data?.id || res?.data?._id || `plan_${Date.now()}`,
        });
        setPlans((prev) => [...prev, newPlan]);
        triggerToast(res?.message || 'Success', 'success');
      } else {
        const payload = {
          price: Number(price),
          features: featureList,
          interval: planInterval,
        };
        const res = await updatePlanApi(editingPlan.id, payload);
        const updatedPlan = normalizePlan({
          ...editingPlan,
          ...payload,
          ...(res?.data || {}),
          id: editingPlan.id,
        });
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? updatedPlan : p)));
        triggerToast(res?.message || 'Success', 'success');
      }
      setView('list');
    } catch (err) {
      console.error('Failed to save plan:', err);
      let errMsg = err.response?.data?.message || err.message || 'Error';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const backendErrors = {};
        const messages = [];
        err.response.data.errors.forEach(errorObj => {
          if (errorObj.message) {
            messages.push(errorObj.message);
          }
          if (errorObj.field) {
            backendErrors[errorObj.field] = errorObj.message;
          }
        });
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
        }
        if (messages.length > 0) {
          errMsg = `${errMsg}: ${messages.join(', ')}`;
        }
      }
      setErrorMsg(errMsg);
      triggerToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [view, planName, price, featuresInput, planInterval, editingPlan, triggerToast]);

  const BILLING_LABEL = 'per user/annually';

  const clearError = useCallback((field) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const clone = { ...prev };
      delete clone[field];
      return clone;
    });
  }, []);

  const renderPlanCard = useCallback((p) => {
    const theme = getPlanTheme(p.name);
    return (
      <div key={p.id} className="glass-panel overflow-hidden flex flex-col justify-between">
        {/* Header accent line */}
        <div style={{ height: '6px', background: theme.gradient }} />

        {/* Plan Info */}
        <div className="p-6 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-outfit font-extrabold text-slate-800 text-lg uppercase tracking-wide">{p.name}</h3>
            <span className={`badge ${theme.badge}`}>{p.activeSubscribers} Subs</span>
          </div>

          {/* Price */}
          <div className="flex flex-col py-2 border-b gap-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-outfit text-slate-800">{formatCurrency(p.price)}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium font-sans">{BILLING_LABEL}</span>
          </div>

          {/* Features List (Show all features) */}
          <div className="space-y-2-5" style={{ marginTop: '16px' }}>
            <p className="form-label text-xs text-slate-400 font-bold uppercase tracking-wider">Features</p>
            <ul className="features-list space-y-2">
              {p.features.map((feat, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-650 font-medium text-xs">
                  <span className={`${theme.accent} shrink-0`} style={{ display: 'flex', marginTop: '2px' }}>
                    <Check size={12} />
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }, []);

  const planCards = useMemo(() => plans.map(renderPlanCard), [plans, renderPlanCard]);

  return (
    <div className="space-y-8">
      {view === 'list' ? (
        <>
          {/* Grid of Plans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px', marginTop: '20px' }}>
            {planCards}
          </div>

          {isLoadingPlans && plans.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-medium">
              Loading plans...
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in form-card">
          {/* Form Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setView('list'); setErrors({}); }}
                className="btn btn-secondary"
                style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Back to list"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                {hasPermission('Plans', 'view') && (
                  <h3 className="text-lg font-bold font-outfit text-slate-800" style={{ lineHeight: '1.2' }}>
                    {view === 'add' ? 'Create New Plan' : `Configure ${editingPlan?.name} Tier`}
                  </h3>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {view === 'add' && (
              <div className="grid grid-2-cols gap-4">
                <div className={`form-group ${errors.planName ? 'has-error' : ''}`}>
                  <label className="form-label">Plan Name <span className="text-rose-500">*</span></label>
                  <div className="input-error-wrapper">
                    <input
                      type="text"
                      required
                      value={planName}
                      onChange={(e) => {
                        setPlanName(e.target.value);
                        clearError('planName');
                      }}
                      placeholder="e.g. Gold, Enterprise"
                      className={`form-input ${errors.planName ? 'is-invalid' : ''}`}
                    />
                  </div>
                  {errors.planName && (
                    <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                      {errors.planName}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Billing Interval</label>
                  <Select
                    value={planInterval}
                    onChange={setPlanInterval}
                    style={{ height: '40px', width: '100%' }}
                    options={[
                      { value: 'month', label: 'Monthly' },
                      { value: 'year', label: 'Yearly' }
                    ]}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-2-cols gap-4">
              <div className={`form-group ${errors.price ? 'has-error' : ''}`}>
                <label className="form-label">Billing Rate (INR) <span className="text-rose-500">*</span></label>
                <div className="input-error-wrapper">
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      clearError('price');
                    }}
                    className={`form-input ${errors.price ? 'is-invalid' : ''}`}
                  />
                </div>
                {errors.price && (
                  <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                    {errors.price}
                  </span>
                )}
              </div>

              {view === 'edit' && (
                <div className="form-group">
                  <label className="form-label">Active Subscribers</label>
                  <input
                    type="number"
                    readOnly
                    disabled
                    value={activeSubscribers}
                    className="form-input bg-slate-100 cursor-not-allowed text-slate-500"
                  />
                </div>
              )}
            </div>

            <div className={`form-group ${errors.featuresInput ? 'has-error' : ''}`}>
              <label className="form-label">Plan Features (One per line) <span className="text-rose-500">*</span></label>
              <div className="input-error-wrapper">
                <textarea
                  required
                  value={featuresInput}
                  onChange={(e) => {
                    setFeaturesInput(e.target.value);
                    clearError('featuresInput');
                  }}
                  rows="5"
                  placeholder="Enter features list, one feature per line..."
                  className={`form-textarea ${errors.featuresInput ? 'is-invalid' : ''}`}
                />
              </div>
              {errors.featuresInput && (
                <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                  {errors.featuresInput}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => { setView('list'); setErrors({}); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showToast && createPortal(
        <div className="toast-container">
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