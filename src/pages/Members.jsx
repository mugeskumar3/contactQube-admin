import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Select } from 'antd';
import { Search, Plus, Edit2, Lock, Unlock, SlidersHorizontal, ArrowLeft, CheckCircle, Eye, X, AlertCircle, User, Crown, MapPin, Phone, Calendar, Globe } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getMembersApi, getMemberByIdApi, createMemberApi, updateMemberApi, deleteMemberApi, toggleMemberActiveApi } from '../Api/membersApi';
import { getPlansApi } from '../Api/plansApi';
import { IMAGE_BASE_URL } from '../config';
import { hasPermission } from '../utils/permission';
import PhoneNumberInput from '../components/PhoneNumberInput';
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';

const sourcePrefixes = {
  'Direct': 'Direct',
  'Referral': 'REF',
  'Instagram': 'Instagram',
  'LinkedIn': 'LinkedIn',
  'Facebook': 'Facebook',
  'WhatsApp': 'WhatsApp'
};

const toIST = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

const getProfileImageUrl = (profileImage) => {
  if (!profileImage) return null;
  if (typeof profileImage === 'string') {
    return profileImage.startsWith('http') ? profileImage : `${IMAGE_BASE_URL}/${profileImage}`;
  }
  if (profileImage.path) {
    return profileImage.path.startsWith('http') ? profileImage.path : `${IMAGE_BASE_URL}/${profileImage.path}`;
  }
  return null;
};

const getLocalDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_FORM_DATA = {
  displayName: "",
  mobileNumber: "",
  email: "",
  registrationSource: "Direct",
  referralCode: "",
  username: "",
  pin: "",
  planId: "",
  isActive: 1
};

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];

const getExpiryClass = (expiryDateStr) => {
  if (!expiryDateStr || expiryDateStr === '—') return 'text-slate-400 font-medium';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiryDateStr);
  if (isNaN(expiryDate.getTime())) return 'text-slate-400 font-medium';
  expiryDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'text-rose-600 font-semibold';
  if (diffDays <= 15) return 'text-amber-500 font-semibold';
  return 'text-slate-400 font-medium';
};

const getPlanBadgeClass = (planName) => {
  if (!planName || planName === 'No plan') return 'badge-neutral';
  const name = String(planName).toLowerCase();
  if (name.includes('gold')) return 'badge-gold';
  if (name.includes('platinum')) return 'badge-platinum';
  if (name.includes('diamond')) return 'badge-diamond';
  if (name.includes('trial')) return 'badge-trial';
  return 'badge-neutral';
};

// Sub-component: Status Badge
const StatusBadge = ({ isActive }) => {
  const active = isActive === 'Active' || isActive === 1 || isActive === true;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 12px',
      borderRadius: '20px',
      fontSize: '12.5px',
      fontWeight: 700,
      background: active ? '#f0fdf4' : '#fff1f2',
      color: active ? '#059669' : '#e11d48',
      border: `1.5px solid ${active ? '#bbf7d0' : '#fecdd3'}`,
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
};

// Sub-component: Toast Notification
const ToastNotification = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show, onClose]);

  if (!toast.show) return null;

  return createPortal(
    <div className="toast-container">
      <div className={`custom-toast ${toast.type}`} style={{ background: '#ffffff', backdropFilter: 'none', WebkitBackdropFilter: 'none', border: '1px solid #e2e8f0' }}>
        <div className="toast-icon-wrapper">
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        </div>
        <span className="toast-message">{toast.message}</span>
      </div>
    </div>,
    document.body
  );
};

// Sub-component: Status Toggle Modal
const StatusToggleModal = ({ show, member, onCancel, onConfirm }) => {
  if (!show) return null;
  const isActive = member?.status === 'Active';

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(15, 23, 42, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px 28px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: isActive ? '#fff1f2' : '#f0fdf4',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          {isActive ? <Lock size={24} color="#e11d48" /> : <Unlock size={24} color="#10b981" />}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
          {isActive ? 'Deactivate Account' : 'Activate Account'}
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
          Are you sure you want to {isActive ? 'deactivate' : 'activate'} the member profile for <strong style={{ color: '#1e293b' }}>"{member?.displayName || member?.fullName || member?.name}"</strong>?
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ fontSize: '14px', minWidth: '100px' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              fontSize: '14px', minWidth: '100px',
              padding: '9px 20px', borderRadius: '10px',
              background: isActive ? '#e11d48' : '#10b981',
              color: '#fff',
              border: 'none', fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


export default function Members() {
  const [members, setMembers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [planOptions, setPlanOptions] = useState([]); // [{id, name}]

  useEffect(() => {
    if (selectedMember) {
      setAvatarImgError(false);
    }
  }, [selectedMember]);
  const planOptionsRef = useRef([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusPopup, setStatusPopup] = useState({ show: false, member: null });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view]);

  // Consolidated toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const itemsPerPage = 10;

  // Memoized calculations
  const totalPages = useMemo(() => Math.ceil(totalCount / itemsPerPage), [totalCount]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);

  const showActionColumn = useMemo(() => {
    return hasPermission('Members', 'view') || hasPermission('Members', 'edit') || hasPermission('Members', 'delete');
  }, []);

  // DRY error-clearing helper
  const clearError = useCallback((field) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const clone = { ...prev };
      delete clone[field];
      return clone;
    });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Memoized plan lookup map to optimize getPlanName O(1) lookups
  const planMap = useMemo(() => {
    const map = new Map();
    planOptions.forEach(p => {
      if (p.id) map.set(p.id, p.name);
      if (p.name) map.set(p.name, p.name);
    });
    return map;
  }, [planOptions]);

  const getPlanName = useCallback((planIdOrName) => {
    if (!planIdOrName) return 'No plan';
    return planMap.get(planIdOrName) || planIdOrName;
  }, [planMap]);

  const normalizeMember = useCallback((m) => {
    const nameObj = m.name && typeof m.name === 'object' ? m.name : null;
    const displayName = m.displayName || nameObj?.displayName ||
      `${m.firstName || nameObj?.firstName || ''} ${m.lastName || nameObj?.lastName || ''}`.trim() || '';

    const primaryPhone = Array.isArray(m.phones)
      ? (m.phones.find(p => p.isPrimary) || m.phones[0])
      : null;
    let formattedMobile = m.mobileNumber || primaryPhone?.number || '';
    if (formattedMobile) {
      try {
        const parsed = parsePhoneNumberFromString(formattedMobile);
        if (parsed) {
          formattedMobile = parsed.formatInternational();
        }
      } catch (_) { }
    }

    const primaryEmail = Array.isArray(m.emails)
      ? (m.emails.find(e => e.isPrimary) || m.emails[0])
      : null;
    const emailValue = m.email || primaryEmail?.email || '';

    const planName = m.membershipPlan || m.plan ||
      (m.planId ? (planOptionsRef.current.find(p => p.id === m.planId)?.name || 'Plan') : '');

    const expiryDate = m.membershipExpiryDate || m.expiryDate || m.expiry || '';
    const startDate = m.membershipStartDate || m.startDate || m.joinedDate || m.createdAt || '';

    return {
      ...m,
      id: m.id || m._id,
      displayName,
      fullName: displayName,
      name: displayName,
      email: emailValue,
      mobileNumber: formattedMobile,
      status: (m.isActive === 1 || m.isActive === true) ? 'Active' : (m.status || 'Inactive'),
      membershipPlan: planName,
      plan: planName,
      planId: m.planId || '',
      membershipStartDate: startDate,
      membershipExpiryDate: expiryDate,
      source: m.registrationSource || m.source || 'Direct',
      registrationSource: m.registrationSource || m.source || 'Direct',
      referredBy: m.referredByCode || m.referredBy || '',
      avatar: (displayName.charAt(0) + (displayName.split(/\s+/)[1]?.charAt(0) || '')).toUpperCase() || 'ME',
      color: m.color || 'bg-blue-500',
      profileImage: m.profileImage?.path ? `${IMAGE_BASE_URL}/${m.profileImage.path}` : null,
    };
  }, []);

  const fetchMembers = useCallback(async ({ page = 0, limit = 10, search = '', planId = '', status = '', isActive = '' } = {}) => {
    try {
      const res = await getMembersApi({ page, limit, search, planId, status, isActive });
      const rawData = res?.data || res || [];
      const mapped = (Array.isArray(rawData) ? rawData : rawData?.list || rawData?.members || []).map(normalizeMember);
      setMembers(mapped);
      setTotalCount(res?.total || mapped.length);
    } catch (err) {
      console.error('Failed to load members from API:', err);
      setMembers([]);
      setTotalCount(0);
      triggerToast(err.response?.data?.message || err.message || 'Failed to load members.', 'error');
    }
  }, [normalizeMember, triggerToast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, planFilter, statusFilter]);

  useEffect(() => {
    if (!plansLoaded) return;

    let statusParam = '';
    let isActiveParam = '';
    if (statusFilter === 'Active') {
      statusParam = 'active';
      isActiveParam = 1;
    } else if (statusFilter === 'Inactive') {
      statusParam = 'inactive';
      isActiveParam = 0;
    }

    const planIdParam = planFilter === 'All' ? '' : planFilter;

    fetchMembers({
      page: currentPage - 1,
      limit: itemsPerPage,
      search: searchTerm,
      planId: planIdParam,
      status: statusParam,
      isActive: isActiveParam
    });
  }, [currentPage, searchTerm, planFilter, statusFilter, fetchMembers, plansLoaded, refreshTrigger]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getPlansApi({ page: 0, limit: 0 });
        const data = res?.data || [];
        const planObjects = data.map(p => ({ id: p.id || p._id, name: p.name || p.planName })).filter(p => p.name);
        if (planObjects.length > 0) {
          planOptionsRef.current = planObjects;
          setPlanOptions(planObjects);
          setFormData(prev => ({
            ...prev,
            planId: planObjects[0].id
          }));
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
        setPlanOptions([]);
      }
    };
    fetchPlans().finally(() => setPlansLoaded(true));

  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const openAddForm = useCallback(() => {
    setEditingMember(null);
    const defaultPlanId = planOptions[0]?.id || '';
    setFormData({
      ...INITIAL_FORM_DATA,
      planId: defaultPlanId,
    });
    setErrorMsg('');
    setErrors({});
    setView('add');
  }, [planOptions]);

  const openEditForm = useCallback(async (member) => {
    let memberDetails = member;
    try {
      const res = await getMemberByIdApi(member.id);
      memberDetails = normalizeMember(res?.data || res || member);
    } catch (err) {
      console.error('Failed to fetch member details for editing:', err);
      memberDetails = normalizeMember(member);
    }

    setEditingMember(memberDetails);

    const primaryPhone = Array.isArray(memberDetails.phones)
      ? (memberDetails.phones.find(p => p.isPrimary) || memberDetails.phones[0])
      : null;
    const phoneVal = memberDetails.mobileNumber || primaryPhone?.number || '';

    const primaryEmail = Array.isArray(memberDetails.emails)
      ? (memberDetails.emails.find(e => e.isPrimary) || memberDetails.emails[0])
      : null;
    const emailValue = memberDetails.email || primaryEmail?.email || '';

    setFormData({
      displayName: memberDetails.displayName || memberDetails.fullName || memberDetails.name || '',
      mobileNumber: phoneVal,
      email: emailValue,
      registrationSource: memberDetails.registrationSource || memberDetails.source || 'Direct',
      referralCode: memberDetails.referredByCode || memberDetails.referredBy || '',
      pin: memberDetails.pin || '',
      planId: memberDetails.planId || '',
      isActive: (memberDetails.isActive === 1 || memberDetails.isActive === true || memberDetails.status === 'Active') ? 1 : 0
    });

    setErrorMsg('');
    setErrors({});
    setView('edit');
  }, [normalizeMember]);

  const handleViewDetails = useCallback(async (member) => {
    try {
      const res = await getMemberByIdApi(member.id);
      const detailedMember = normalizeMember(res?.data || res || member);
      setSelectedMember(detailedMember);
      setActiveDetailTab('overview');
    } catch (err) {
      console.error('Failed to load member details:', err);
      setSelectedMember(normalizeMember(member));
      setActiveDetailTab('overview');
    }
  }, [normalizeMember]);

  const handleToggleStatusClick = useCallback((member) => {
    setStatusPopup({ show: true, member });
  }, []);

  const confirmToggleStatus = useCallback(async () => {
    const member = statusPopup.member;
    if (!member) return;
    try {
      const res = await toggleMemberActiveApi(member.id);
      const updatedStatus = member.status === 'Active' ? 'Inactive' : 'Active';
      const updated = members.map(m =>
        m.id === member.id ? { ...m, status: updatedStatus, isActive: updatedStatus === 'Active' ? 1 : 0 } : m
      );
      setMembers(updated);
      setRefreshTrigger(prev => prev + 1);
      triggerToast(res?.message || `Member status updated to ${updatedStatus}.`, 'success');
    } catch (err) {
      console.error('Failed to toggle member status:', err);
      triggerToast(err.response?.data?.message || err.message || 'Failed to update member status.', 'error');
    } finally {
      setStatusPopup({ show: false, member: null });
    }
  }, [statusPopup.member, members, triggerToast, setRefreshTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const newErrors = {};
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is Required';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.displayName.trim())) {
      newErrors.displayName = 'Name should contain only alphabets';
    }

    if (!formData.mobileNumber) {
      newErrors.mobileNumber = 'Mobile Number is Required';
    } else if (!isValidPhoneNumber(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Please enter a valid phone number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is Required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid Email Address';
    }

    if (formData.registrationSource === 'Referral' && !formData.referralCode.trim()) {
      newErrors.referralCode = 'Referral Code is Required';
    }



    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const displayNameVal = formData.displayName.trim();
    const initials = (displayNameVal.charAt(0) + (displayNameVal.split(/\s+/)[1]?.charAt(0) || '')).toUpperCase() || 'ME';

    const nameParts = displayNameVal.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const apiPayload = {
      firstName,
      lastName,
      displayName: displayNameVal,
      phones: [
        {
          type: "Mobile",
          number: formData.mobileNumber.replace(/[^\d+]/g, ''),
          isPrimary: true,
          customType: "Personal Number"
        }
      ],
      emails: [
        {
          type: "Personal",
          email: formData.email.trim(),
          isPrimary: true,
          customType: "Personal Email"
        }
      ],
      registrationSource: formData.registrationSource,
      referralCode: formData.referralCode.trim() || undefined,
      planId: formData.planId || undefined,
      isActive: Number(formData.isActive)
    };

    try {
      if (editingMember) {
        const res = await updateMemberApi(editingMember.id, apiPayload);
        const responseData = res?.data || res || {};
        const updatedMember = normalizeMember({
          ...editingMember,
          ...apiPayload,
          ...responseData,
          id: editingMember.id,
          avatar: initials,
        });
        const updated = members.map(m => m.id === editingMember.id ? updatedMember : m);
        setMembers(updated);
        triggerToast(res?.message || 'Member profile updated successfully!', 'success');
      } else {
        const res = await createMemberApi(apiPayload);
        const responseData = res?.data || res || {};
        const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        const newMember = normalizeMember({
          ...apiPayload,
          ...responseData,
          id: responseData.id || responseData._id || `mem_${Date.now()}`,
          avatar: initials,
          color: randomColor,
        });
        const updated = [newMember, ...members];
        setMembers(updated);
        triggerToast(res?.message || 'New member registered successfully!', 'success');
      }
      setRefreshTrigger(prev => prev + 1);
      setView('list');
    } catch (err) {
      console.error('Failed to save member:', err);
      let errMsg = err.response?.data?.message || err.message || 'Failed to save member on the server.';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const backendErrors = {};
        const messages = [];
        err.response.data.errors.forEach(errorObj => {
          if (errorObj.message) {
            messages.push(errorObj.message);
          }
          if (errorObj.field === 'emails') {
            backendErrors.email = errorObj.message;
          } else if (errorObj.field === 'phones') {
            backendErrors.mobileNumber = errorObj.message;
          } else if (errorObj.field) {
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
      triggerToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          {/* Header Panel */}
          <div className="flex flex-col sm-flex-row sm-items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Member List</h2>
            </div>
            {hasPermission('Members', 'add') &&
              <button
                onClick={openAddForm}
                className="btn btn-primary gap-1-5 self-start"
                style={{ fontSize: '14px' }}
              >
                <Plus size={16} /> Add Member
              </button>}
          </div>

          {/* Filters & Search controls */}
          <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4">
            {/* Search */}
            <div className="search-wrapper flex-1">
              <Search size={16} className="input-icon-search" />
              <input
                type="text"
                placeholder="Search by name,mobile,email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="search-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <SlidersHorizontal size={14} /> Filters:
              </div>

              {/* Plan filter */}
              <Select
                value={planFilter}
                onChange={setPlanFilter}
                style={{ height: '36px', minWidth: '150px' }}
                options={[
                  { value: 'All', label: 'All Plans' },
                  ...planOptions.map(p => ({ value: p.id, label: p.name }))
                ]}
              />

              {/* Status filter */}
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ height: '36px', minWidth: '120px' }}
                options={[
                  { value: 'All', label: 'All Status' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' }
                ]}
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', fontSize: '14px' }}>S.No</th>
                    <th style={{ fontSize: '14px' }}>Name</th>
                    <th style={{ fontSize: '14px' }}>Mobile Number</th>
                    <th style={{ fontSize: '14px' }}>Plan</th>
                    <th style={{ fontSize: '14px' }}>Plan Type</th>
                    <th style={{ fontSize: '14px' }}>Expiry Date</th>
                    <th style={{ fontSize: '14px' }}>Status</th>
                    {showActionColumn && <th style={{ width: '151px', fontSize: '14px', textAlign: 'left' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, index) => (
                    <tr key={member.id}>
                      <td className="text-slate-500 font-semibold" style={{ fontSize: '14px' }}>{startIndex + index + 1}</td>
                      <td style={{ fontSize: '14px' }}>
                        <div className="flex items-center gap-3">
                          {member.profileImage ? (
                            <img
                              src={member.profileImage}
                              alt={member.fullName}
                              style={{
                                width: '34px',
                                height: '34px',
                                minWidth: '34px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                                border: '1px solid #e2e8f0'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '34px',
                              height: '34px',
                              minWidth: '34px',
                              borderRadius: '50%',
                              background: 'lightgray',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#475569',
                              flexShrink: 0,
                              border: '1px solid #e2e8f0'
                            }}>
                              {member.avatar?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="font-semibold text-slate-800 truncate" style={{ fontSize: '14px' }}>{member.fullName || member.name}</p>
                            <p className="text-xs text-slate-400 font-medium truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-500 font-medium" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>{member.mobileNumber || '—'}</td>
                      <td style={{ fontSize: '14px' }}>
                        <span className={`badge badge-plan ${getPlanBadgeClass(getPlanName(member.planId || member.plan))}`} style={{ fontSize: '13px' }}>
                          {getPlanName(member.planId || member.plan)}
                        </span>
                      </td>
                      <td style={{ fontSize: '14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 12px',
                          borderRadius: '20px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          background: member.isTrial ? '#fffbeb' : '#f5f3ff',
                          color: member.isTrial ? '#d97706' : '#7c3aed',
                          border: `1.5px solid ${member.isTrial ? '#fde68a' : '#ddd6fe'}`,
                        }}>
                          {member.isTrial ? 'Trial' : 'Premium'}
                        </span>
                      </td>
                      <td className={`${getExpiryClass(member.membershipExpiryDate)}`} style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>{toIST(member.membershipExpiryDate)}</td>
                      <td>
                        <StatusBadge isActive={member.status} />
                      </td>
                      {showActionColumn && (
                        <td style={{ textAlign: 'left' }}>
                          <div className="flex items-center justify-start gap-2">
                            {hasPermission('Members', 'view') && <button
                              onClick={() => handleViewDetails(member)}
                              className="btn-icon-only hover-primary"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>}
                            {hasPermission('Members', 'edit') && <button
                              onClick={() => openEditForm(member)}
                              className="btn-icon-only hover-primary"
                              title="Edit Details"
                            >
                              <Edit2 size={16} />
                            </button>}
                            {hasPermission('Members', 'delete') && <button
                              onClick={() => handleToggleStatusClick(member)}
                              className="btn-icon-only hover-danger"
                              title={member.status === 'Active' ? "Lock / Deactivate Account" : "Unlock / Activate Account"}
                            >
                              {member.status === 'Active' ? <Unlock size={16} /> : <Lock size={16} className="text-rose-500" />}
                            </button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={showActionColumn ? 8 : 7} className="text-center py-8 text-slate-500 font-medium">
                        No members match search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Nav */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {startIndex + 1} to {Math.min(startIndex + members.length, totalCount)} of {totalCount} profiles
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in">
          {/* Header */}
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
                <h3 className="text-lg font-bold font-outfit text-slate-800" style={{ lineHeight: '1.2' }}>
                  {view === 'add' ? 'Register New Member' : 'Edit Member Profile'}
                </h3>
                <p className="text-xs text-slate-500 font-medium" style={{ marginTop: '2px' }}>
                  {view === 'add' ? '' : ''}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            <div className="pb-6">
              <div className="flex flex-col sm-flex-row gap-6 items-start">

                {/* Left Upload Column */}
                {/* <div className="flex flex-col items-center gap-3 shrink-0">
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
                    style={{ position: 'relative', width: '110px', height: '110px' }}
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center justify-center gap-1">
                        <svg className="stroke-current" style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none">
                          <path d="M12 15V3M12 3L8 7M12 3L16 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4 17V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="profile-upload"
                    className="btn btn-secondary cursor-pointer"
                    style={{
                  {/* Right Form Inputs */}
                <div className="flex-1 space-y-4 w-full">

                  {/* Row 1: Name + Email Address */}
                  <div className="grid grid-2-cols gap-4">
                    <div className="form-group">
                      <label className="form-label">Name <span className="text-rose-500">*</span></label>
                      <div className="input-error-wrapper">
                        <input
                          type="text"
                          required
                          value={formData.displayName}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setFormData(prev => ({ ...prev, displayName: val }));
                            if (errors.displayName) clearError('displayName');
                          }}
                          placeholder="Enter Your Name"
                          className={`form-input ${errors.displayName ? 'is-invalid' : ''}`}
                        />
                      </div>
                      {errors.displayName && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, fontSize: '14px' }}>
                          {errors.displayName}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address <span className="text-rose-500">*</span></label>
                      <div className="input-error-wrapper">
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, email: val }));
                            if (errors.email) clearError('email');
                          }}
                          placeholder="Enter Your Email Address"
                          className={`form-input ${errors.email ? 'is-invalid' : ''}`}
                        />
                      </div>
                      {errors.email && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, fontSize: '14px' }}>
                          {errors.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Mobile Number + Registration Source */}
                  <div className="grid grid-2-cols gap-4">
                    <div className="form-group">
                      <label className="form-label">Mobile Number <span className="text-rose-500">*</span></label>
                      <div className="input-error-wrapper block w-full">
                        <PhoneNumberInput
                          id="mobile-number-input"
                          value={formData.mobileNumber}
                          onChange={(val) => {
                            setFormData(prev => ({
                              ...prev,
                              mobileNumber: val
                            }));
                            if (errors.mobileNumber) clearError('mobileNumber');
                          }}
                          error={!!errors.mobileNumber}
                          placeholder="Enter Phone Number"
                        />
                      </div>
                      {errors.mobileNumber && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, fontSize: '14px' }}>
                          {errors.mobileNumber}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Registration Source</label>
                      <div className="flex gap-3">
                        <Select
                          disabled={!!editingMember}
                          value={formData.registrationSource}
                          onChange={(val) => {
                            setFormData(prev => ({
                              ...prev,
                              registrationSource: val
                            }));
                          }}
                          style={{ flex: '1', height: '40px' }}
                          options={[
                            { value: 'Direct', label: 'Direct / Other' },
                            { value: 'Referral', label: 'Referral' },
                            { value: 'Instagram', label: 'Instagram' },
                            { value: 'LinkedIn', label: 'LinkedIn' },
                            { value: 'Facebook', label: 'Facebook' },
                            { value: 'WhatsApp', label: 'WhatsApp' },
                            ...(editingMember ? [{ value: 'Mobile App', label: 'Mobile App' }] : [])
                          ]}
                        />
                        {formData.registrationSource === 'Referral' && (
                          <div className="flex-1 flex flex-col gap-1">
                            <input
                              disabled={!!editingMember}
                              type="text"
                              value={formData.referralCode}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ ...prev, referralCode: val }));
                                if (errors.referralCode) clearError('referralCode');
                              }}
                              placeholder="Enter Referral Code"
                              className={`form-input animate-in slide-in-from-left-2 duration-200 ${errors.referralCode ? 'is-invalid' : ''}`}
                              style={{ flex: '1', minWidth: '120px' }}
                            />
                            {errors.referralCode && (
                              <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, fontSize: '14px' }}>
                                {errors.referralCode}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Membership Plan + Member Status */}
                  <div className="grid grid-2-cols gap-4">
                    <div className="form-group">
                      <label className="form-label">Membership Plan</label>
                      <Select
                        disabled={!!editingMember}
                        value={formData.planId || undefined}
                        onChange={(val) => {
                          setFormData(prev => ({
                            ...prev,
                            planId: val
                          }));
                        }}
                        style={{ height: '40px', width: '100%' }}
                        placeholder="Select Plan"
                        options={planOptions.map(p => ({ value: p.id, label: p.name }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Member Status</label>
                      <Select
                        value={formData.isActive}
                        onChange={(val) => {
                          setFormData(prev => ({ ...prev, isActive: val }));
                        }}
                        style={{ height: '40px', width: '100%' }}
                        options={[
                          { value: 1, label: 'Active' },
                          { value: 0, label: 'Inactive' }
                        ]}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => { setView('list'); setErrors({}); }}
                className="btn btn-secondary"
                style={{ fontSize: '14px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ fontSize: '14px' }}
              >
                {isSubmitting ? 'Saving...' : (view === 'add' ? 'Save Profile' : 'Save Changes')}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Member Details Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal-content glass-panel p-4 space-y-0" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%', borderRadius: '16px', border: 'none', background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>

            {/* Header */}
            <div className="modal-header pb-2 flex items-center justify-between" style={{ borderBottomColor: '#f1f5f9', paddingBottom: '10px', position: 'relative', zIndex: 2 }}>
              <h3 className="text-xl font-bold font-outfit text-[#0f172a]" style={{ margin: 0 }}>Member Profile Details</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3" style={{ marginTop: '12px', position: 'relative', zIndex: 2 }}>
              {/* Profile Header section with wave background */}
              <div className="flex items-center gap-4 pb-2" style={{ position: 'relative', overflow: 'hidden', minHeight: '64px', paddingBottom: '8px' }}>
                {/* Wave Line Vector Graphic */}
                <div style={{ position: 'absolute', right: '-24px', top: '-24px', bottom: 0, width: '280px', height: '80px', pointerEvents: 'none', opacity: 0.7, overflow: 'hidden' }}>
                  <svg width="100%" height="100%" viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M100 80 C 150 50, 190 60, 280 20" stroke="url(#wave-grad)" strokeWidth="0.8" strokeOpacity="0.4" />
                    <path d="M80 80 C 140 40, 180 50, 280 10" stroke="url(#wave-grad)" strokeWidth="1.2" strokeOpacity="0.3" />
                    <path d="M60 80 C 130 30, 170 40, 280 0" stroke="url(#wave-grad)" strokeWidth="0.6" strokeOpacity="0.5" />
                    <defs>
                      <linearGradient id="wave-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {getProfileImageUrl(selectedMember.profileImage) && !avatarImgError ? (
                  <img
                    src={getProfileImageUrl(selectedMember.profileImage)}
                    alt={selectedMember.name?.displayName || selectedMember.fullName || selectedMember.name}
                    className="object-cover border border-slate-200"
                    style={{ width: '60px', height: '60px', minWidth: '60px', minHeight: '60px', borderRadius: '50%', position: 'relative', zIndex: 2, objectFit: 'cover', flexShrink: 0 }}
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  <div className="flex items-center justify-center bg-[#D9E4F5] text-[#1E293B] font-bold" style={{ width: '60px', height: '60px', minWidth: '60px', minHeight: '60px', borderRadius: '50%', fontSize: '20px', position: 'relative', zIndex: 2, flexShrink: 0 }}>
                    {selectedMember.avatar || `${(selectedMember.name?.displayName || selectedMember.fullName || selectedMember.name || 'M').charAt(0)}`}
                  </div>
                )}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-bold text-slate-800 leading-tight font-outfit" style={{ margin: 0 }}>
                      {selectedMember.name?.displayName || selectedMember.fullName || selectedMember.name}
                    </h4>
                    <span
                      style={{
                        fontSize: '11px',
                        color: (selectedMember.status === 'Active' || selectedMember.isActive === 1 || selectedMember.isActive === true) ? '#059669' : '#e11d48',
                        background: (selectedMember.status === 'Active' || selectedMember.isActive === 1 || selectedMember.isActive === true) ? '#D1FAE5' : '#FFE4E6',
                        border: `1px solid ${(selectedMember.status === 'Active' || selectedMember.isActive === 1 || selectedMember.isActive === true) ? '#A7F3D0' : '#FECDD3'}`,
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: (selectedMember.status === 'Active' || selectedMember.isActive === 1 || selectedMember.isActive === true) ? '#059669' : '#e11d48'
                      }}></span>
                      {(selectedMember.status === 'Active' || selectedMember.isActive === 1 || selectedMember.isActive === true) ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className="badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#FFF1F2',
                        color: '#b70805',
                        border: '1px solid #FFE4E6',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '600',
                        gap: '3px'
                      }}
                    >
                      <Crown size={10} style={{ color: '#b70805' }} />
                      {(() => {
                        const planName = getPlanName(selectedMember.planId || selectedMember.plan || selectedMember.membershipPlan);
                        const suffix = selectedMember.isTrial ? ' (Trial)' : ' (Premium)';
                        const formattedPlan = planName.toLowerCase().endsWith('plan') ? planName : `${planName} Plan`;
                        return `${formattedPlan}${suffix}`;
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5" style={{ margin: '2px 0 0 0' }}>
                    {selectedMember.email || selectedMember.emails?.find(e => e.isPrimary)?.email || selectedMember.emails?.[0]?.email || '—'}
                  </p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0px', marginBottom: '8px' }}>
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'contact', label: 'Contact Info' },
                  { id: 'addresses', label: 'Addresses' },
                  { id: 'personal', label: 'Personal & Custom' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveDetailTab(t.id)}
                    style={{
                      padding: '6px 2px 8px 2px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none',
                      borderBottom: activeDetailTab === t.id ? '2px solid #b70805' : '2px solid transparent',
                      cursor: 'pointer',
                      background: 'transparent',
                      color: activeDetailTab === t.id ? '#b70805' : '#64748b',
                      transition: 'all 0.15s ease-in-out',
                      borderRadius: 0
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Grey inset panel containing the Tab Contents */}
              <div style={{ background: '#f8fafc', margin: '0 -20px', padding: '16px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', maxHeight: '55vh', overflowY: 'auto' }}>
                {activeDetailTab === 'overview' && (
                  <div className="grid grid-2-cols gap-4" style={{ alignItems: 'start' }}>
                    {/* Left Column: Basic Info & Membership */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Basic Info */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Basic Information</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {[
                            { label: 'Member ID', value: selectedMember.memberId },
                            { label: 'Gender', value: selectedMember.gender, capitalize: true },
                            {
                              label: 'Date of Birth',
                              value: (() => {
                                const birthday = selectedMember.importantDates?.find(d => d.type === "Birthday")?.date;
                                return birthday ? new Date(birthday).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
                              })()
                            },
                            { label: 'Registration Source', value: selectedMember.registrationSource || selectedMember.source },
                            { label: 'Referred By', value: selectedMember.referredBy }
                          ]
                            .filter(field => field.value && field.value !== '—' && String(field.value).trim() !== '')
                            .map((field, idx, arr) => (
                              <div
                                key={field.label}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: idx < arr.length - 1 ? '1px solid #f8fafc' : 'none',
                                  paddingBottom: idx < arr.length - 1 ? '6px' : '0'
                                }}
                              >
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{field.label}</span>
                                <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600', textTransform: field.capitalize ? 'capitalize' : 'none' }}>{field.value}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                      {/* Membership Info */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Crown size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Membership</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Membership Plan</span>
                            <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{getPlanName(selectedMember.planId || selectedMember.plan || selectedMember.membershipPlan)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Start Date</span>
                            <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>
                              {(() => {
                                const dateStr = selectedMember.membershipStartDate || selectedMember.joinedDate || selectedMember.createdAt;
                                return dateStr ? (typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr) : '—';
                              })()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Expiry Date</span>
                            <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                              {selectedMember.membershipExpiryDate ? toIST(selectedMember.membershipExpiryDate) : (selectedMember.expiryDate ? toIST(selectedMember.expiryDate) : '—')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Organization Details & Groups/Notes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Organization Info */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Organization Details</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(() => {
                            const fields = [
                              { label: 'Company Name', value: selectedMember.organization?.companyName },
                              { label: 'Designation', value: selectedMember.organization?.designation },
                              { label: 'Department', value: selectedMember.organization?.department },
                              { label: 'Industry', value: selectedMember.organization?.industry },
                              { label: 'Office Location', value: selectedMember.organization?.officeLocation }
                            ].filter(field => field.value && field.value !== '—' && String(field.value).trim() !== '');

                            if (fields.length === 0) {
                              return <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No organization details available</span>;
                            }

                            return fields.map((field, idx, arr) => (
                              <div
                                key={field.label}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: idx < arr.length - 1 ? '1px solid #f8fafc' : 'none',
                                  paddingBottom: idx < arr.length - 1 ? '6px' : '0'
                                }}
                              >
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{field.label}</span>
                                <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{field.value}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Groups & Notes */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SlidersHorizontal size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Groups & Notes</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Groups</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {Array.isArray(selectedMember.groups) && selectedMember.groups.length > 0 ? (
                                selectedMember.groups.map((group, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      background: '#f1f5f9',
                                      color: '#334155',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {group}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No groups assigned</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>Notes</span>
                            <p style={{ margin: 0, fontSize: '12px', color: '#1e293b', background: '#f8fafc', padding: '8px', borderRadius: '6px', minHeight: '44px', whiteSpace: 'pre-wrap' }}>
                              {selectedMember.notes || 'No notes available.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'contact' && (
                  <div className="grid grid-2-cols gap-4" style={{ alignItems: 'start' }}>
                    {/* Phones Column */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Phone size={12} style={{ color: '#b70805' }} />
                        </div>
                        <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Phone Numbers</h5>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Array.isArray(selectedMember.phones) && selectedMember.phones.length > 0 ? (
                          selectedMember.phones.map((phone, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < selectedMember.phones.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>
                                  {(() => {
                                    const parsed = parsePhoneNumberFromString(phone.number || '');
                                    return parsed ? parsed.formatInternational() : phone.number;
                                  })()}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'capitalize' }}>
                                  {(phone.type || '').toLowerCase() === 'custom' ? phone.customType : phone.type}
                                </span>
                              </div>
                              {phone.isPrimary && (
                                <span style={{ fontSize: '10px', color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: '8px', fontWeight: '600' }}>
                                  Primary
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No phone numbers available</span>
                        )}
                      </div>
                    </div>

                    {/* Emails & Websites Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Emails */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Email Addresses</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {Array.isArray(selectedMember.emails) && selectedMember.emails.length > 0 ? (
                            selectedMember.emails.map((email, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < selectedMember.emails.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{email.email}</span>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'capitalize' }}>
                                    {(email.type || '').toLowerCase() === 'custom' ? email.customType : email.type}
                                  </span>
                                </div>
                                {email.isPrimary && (
                                  <span style={{ fontSize: '10px', color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: '8px', fontWeight: '600' }}>
                                    Primary
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No email addresses available</span>
                          )}
                        </div>
                      </div>

                      {/* Websites */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Globe size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-[#b70805] text-xs uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Websites</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {Array.isArray(selectedMember.websites) && selectedMember.websites.length > 0 ? (
                            selectedMember.websites.map((web, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < selectedMember.websites.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <a href={web.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textDecoration: 'none' }}>
                                    {web.url}
                                  </a>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'capitalize' }}>
                                    {(web.type || '').toLowerCase() === 'custom' ? web.customType : web.type}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No websites linked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'addresses' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Array.isArray(selectedMember.addresses) && selectedMember.addresses.length > 0 ? (
                      selectedMember.addresses.map((addr, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={12} style={{ color: '#b70805' }} />
                              </div>
                              <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>
                                {(addr.type || '').toLowerCase() === 'custom' ? addr.customType : addr.type} Address
                              </h5>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                              { label: 'Street Address', value: addr.street },
                              { label: 'City', value: addr.city },
                              { label: 'State', value: addr.state },
                              { label: 'Postal Code', value: addr.postalCode },
                              { label: 'Country', value: addr.country }
                            ]
                              .filter(field => field.value && field.value !== '—' && String(field.value).trim() !== '')
                              .map((field, fIdx, arr) => (
                                <div
                                  key={field.label}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: fIdx < arr.length - 1 ? '1px solid #f8fafc' : 'none',
                                    paddingBottom: fIdx < arr.length - 1 ? '6px' : '0'
                                  }}
                                >
                                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{field.label}</span>
                                  <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{field.value}</span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        <MapPin size={20} style={{ color: '#cbd5e1', marginBottom: '6px' }} />
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: '500' }}>No addresses available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'personal' && (
                  <div className="grid grid-2-cols gap-4" style={{ alignItems: 'start' }}>
                    {/* Left Column: Important Dates & Relationships */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Important Dates */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Important Dates</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {Array.isArray(selectedMember.importantDates) && selectedMember.importantDates.length > 0 ? (
                            selectedMember.importantDates.map((d, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < selectedMember.importantDates.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', textTransform: 'capitalize' }}>
                                  {(d.type || '').toLowerCase() === 'custom' ? d.customType : d.type}
                                </span>
                                <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>
                                  {new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No important dates available</span>
                          )}
                        </div>
                      </div>

                      {/* Relationships */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={12} style={{ color: '#b70805' }} />
                          </div>
                          <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Relationships</h5>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {Array.isArray(selectedMember.relationships) && selectedMember.relationships.length > 0 ? (
                            selectedMember.relationships.map((rel, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < selectedMember.relationships.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{rel.name}</span>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'capitalize' }}>
                                  {(rel.relationType || '').toLowerCase() === 'custom' ? rel.customRelationType : rel.relationType}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No relationships listed</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Custom Fields */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <SlidersHorizontal size={12} style={{ color: '#b70805' }} />
                        </div>
                        <h5 className="font-bold text-xs text-[#b70805] uppercase tracking-wider font-outfit" style={{ margin: 0 }}>Custom Fields</h5>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Array.isArray(selectedMember.customFields) && selectedMember.customFields.length > 0 ? (
                          selectedMember.customFields.map((field, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < selectedMember.customFields.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{field.key}</span>
                              <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{field.value}</span>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No custom fields defined</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2" style={{ paddingTop: '10px' }}>
              <button
                onClick={() => setSelectedMember(null)}
                className="btn"
                style={{
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />

      <StatusToggleModal
        show={statusPopup.show}
        member={statusPopup.member}
        onCancel={() => setStatusPopup({ show: false, member: null })}
        onConfirm={confirmToggleStatus}
      />
    </div>
  );
}
