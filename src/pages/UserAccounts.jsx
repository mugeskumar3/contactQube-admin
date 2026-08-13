import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock, Unlock, Edit2, CheckCircle, XCircle, ArrowLeft, Key, Search, SlidersHorizontal, Eye, Trash2, AlertCircle, ShieldAlert } from 'lucide-react';
import { Select } from 'antd';
import { getAdminUsersApi, getAdminUserByIdApi, createAdminUserApi, updateAdminUserApi, deleteAdminUserApi } from '../Api/profileApi';
import { getRolesApi } from '../Api/roleApi';
import { uploadImageApi } from '../Api/imageApi';
import { IMAGE_BASE_URL } from '../config';
import { hasPermission } from '../utils/permission';
import PhoneNumberInput from '../components/PhoneNumberInput';
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';

const getAdminStatus = (adm) => {
  if (typeof adm?.status === 'string') return adm.status;
  return adm?.isActive === 0 || adm?.isActive === false ? 'Inactive' : 'Active';
};

const getProfileImageValue = (profileImage) => {
  if (!profileImage) return null;
  if (typeof profileImage === 'string') return profileImage;
  if (profileImage.path) return `${IMAGE_BASE_URL}/${profileImage.path}`;
  return null;
};

const getRoleBadgeClass = (roleName) => {
  if (!roleName) return 'badge-neutral';
  const lower = roleName.toLowerCase();
  if (lower.includes('admin')) return 'badge-info';
  return 'badge-neutral';
};

export default function UserAccounts() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Form state (all fields in one object)
  const FORM_DEFAULTS = {
    name: '', email: '', phoneNumber: '',
    pin: ['', '', '', ''],
    role: '', status: 'Active',
    profileImage: null,
    profileImageObj: { fileName: '', path: '', originalName: '' },
    profileImageUploading: false,
    errorMsg: '',
    errors: {},
  };
  const [formData, setFormData] = useState(FORM_DEFAULTS);
  const setField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));
  const clearFieldError = (field) => setFormData(prev => {
    if (!prev.errors[field]) return prev;
    const errors = { ...prev.errors };
    delete errors[field];
    return { ...prev, errors };
  });

  // Destructure for convenience in render
  const { name, email, phoneNumber, pin, role, status, profileImage, profileImageObj, profileImageUploading, errorMsg, errors } = formData;

  const [roleOptions, setRoleOptions] = useState([]);
  const [dbRoles, setDbRoles] = useState([]);

  const mapAdminUser = useCallback((adm) => {
    let formattedPhone = adm.phoneNumber || '';
    if (formattedPhone) {
      try {
        const parsed = parsePhoneNumberFromString(formattedPhone);
        if (parsed) {
          formattedPhone = parsed.formatInternational();
        }
      } catch (_) {}
    }

    let roleName = 'Viewer';
    if (typeof adm?.role === 'string' && adm.role) {
      roleName = adm.role;
    } else if (adm?.role?.name) {
      roleName = adm.role.name;
    } else if (adm?.roleId) {
      const foundRole = dbRoles.find(r => r.id === adm.roleId || r._id === adm.roleId);
      if (foundRole) roleName = foundRole.name;
    }

    return {
      ...adm,
      id: adm.id || adm._id,
      role: roleName,
      status: getAdminStatus(adm),
      phoneNumber: formattedPhone,
      profileImage: getProfileImageValue(adm.profileImage),
      profileImageObj: adm.profileImage && typeof adm.profileImage === 'object' ? adm.profileImage : { fileName: '', path: '', originalName: '' },
    };
  }, [dbRoles]);

  // Confirmations
  const [deletePopup, setDeletePopup] = useState({ show: false, adminId: null, adminName: '' });
  const [statusPopup, setStatusPopup] = useState({ show: false, admin: null });

  // Toast state (single object)
  const [toast, setToast] = useState({ show: false, msg: '', type: 'error' });
  const triggerToast = (msg, type = 'error') => setToast({ show: true, msg, type });
  // Aliases used in JSX
  const showToast = toast.show;
  const toastMsg = toast.msg;
  const toastType = toast.type;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);


  // Filtered admin users logic (API handles all filters now)
  const filteredAdmins = admins || [];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmins = filteredAdmins;

  const showActionColumn = useMemo(() => {
    return hasPermission('Admin User', 'edit') || hasPermission('Admin User', 'delete');
  }, []);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchAdmins = useCallback(async ({ page = 0, limit = 10, search = '', roleId = '', status = '', isActive = '' } = {}) => {
    try {
      const res = await getAdminUsersApi({ page, limit, search, roleId, status, isActive });
      const data = res?.data || [];
      const mapped = data.map(mapAdminUser);
      setAdmins(mapped);
      setTotalCount(res?.total || data.length);
    } catch (err) {
      console.error("Failed to load admin users from backend API:", err);
      setAdmins([]);
      setTotalCount(0);
      triggerToast(err.response?.data?.message || err.message || "Error loading admin users", 'error');
    }
  }, [mapAdminUser]);

  useEffect(() => {
    let statusParam = '';
    let isActiveParam = '';
    if (statusFilter === 'Active') {
      statusParam = 'active';
      isActiveParam = 1;
    } else if (statusFilter === 'Inactive') {
      statusParam = 'inactive';
      isActiveParam = 0;
    }

    const roleIdParam = roleFilter === 'All' ? 'all' : roleFilter;

    fetchAdmins({
      page: currentPage - 1,
      limit: itemsPerPage,
      search: searchTerm,
      roleId: roleIdParam,
      status: statusParam,
      isActive: isActiveParam
    });
  }, [currentPage, searchTerm, roleFilter, statusFilter, fetchAdmins]);

  useEffect(() => {
    const fetchRoles = async () => {
      let rolesList = [];
      try {
        const res = await getRolesApi({ isActive: 1 });
        rolesList = res?.data || [];
      } catch (err) {
        console.error("Failed to fetch roles from API:", err);
        rolesList = [];
      }
      if (rolesList.length > 0) {
        const mappedRoles = rolesList.map(r => ({ id: r.id || r._id, name: r.name })).filter(r => r.name);
        setDbRoles(mappedRoles);
        setRoleOptions(mappedRoles.map(r => r.name));
      }
    };
    fetchRoles();
  }, []);


  const openAddForm = () => {
    setEditingAdmin(null);
    setFormData(FORM_DEFAULTS);
    setView('add');
  };

  const fillAdminForm = (adm) => {
    setEditingAdmin(adm);
    setFormData({
      ...FORM_DEFAULTS,
      name: adm.name || '',
      email: adm.email || '',
      phoneNumber: adm.phoneNumber || '',
      pin: ['•', '•', '•', '•'],
      role: adm.role || '',
      status: adm.status || 'Active',
      profileImage: adm.profileImage || null,
      profileImageObj: (adm.profileImageObj?.path ? adm.profileImageObj : FORM_DEFAULTS.profileImageObj),
    });
  };

  const fetchAdminForForm = async (adm) => {
    try {
      const res = await getAdminUserByIdApi(adm.id);
      return mapAdminUser(res?.data || res);
    } catch (err) {
      console.error("Failed to fetch admin by id:", err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
      return adm;
    }
  };

  const openEditForm = async (adm) => {
    const freshAdmin = await fetchAdminForForm(adm);
    fillAdminForm(freshAdmin);
    setView('edit');
  };

  const openViewForm = async (adm) => {
    const freshAdmin = await fetchAdminForForm(adm);
    fillAdminForm(freshAdmin);
    setView('view');
  };


  const confirmDelete = async () => {
    const { adminId } = deletePopup;
    setDeletePopup({ show: false, adminId: null, adminName: '' });
    if (!adminId) return;
    try {
      const res = await deleteAdminUserApi(adminId);
      const updated = admins.filter(a => a.id !== adminId);
      setAdmins(updated);
      triggerToast(res?.message || 'Success', 'success');
    } catch (err) {
      console.error("Failed to delete admin:", err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
    }
  };

  const handleToggleStatus = (adm) => {
    setStatusPopup({ show: true, admin: adm });
  };

  const confirmToggleStatus = async () => {
    const adm = statusPopup.admin;
    setStatusPopup({ show: false, admin: null });
    if (!adm) return;
    const updatedStatus = adm.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await updateAdminUserApi(adm.id, {
        isActive: updatedStatus === 'Active' ? 1 : 0
      });

      triggerToast(res?.message || 'Success', 'success');
      await fetchAdmins({ page: currentPage - 1, limit: itemsPerPage, search: searchTerm });
    } catch (err) {
      console.error("Failed to update status:", err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
    }
  };


  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, profileImage: previewUrl, profileImageUploading: true }));
    try {
      const result = await uploadImageApi(file, 'admin');
      const serverPath = result?.path || '';
      const fullUrl = serverPath ? `${IMAGE_BASE_URL}/${serverPath}` : previewUrl;
      setFormData(prev => ({
        ...prev,
        profileImage: fullUrl,
        profileImageObj: { fileName: result?.fileName || file.name, path: serverPath, originalName: result?.originalName || file.name },
        profileImageUploading: false,
      }));
    } catch (err) {
      console.error('Profile image upload failed:', err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
      setFormData(prev => ({ ...prev, profileImage: null, profileImageObj: FORM_DEFAULTS.profileImageObj, profileImageUploading: false }));
    }
  };

  const handlePinChange = (index, value) => {
    if (value.length > 1) value = value.charAt(value.length - 1);
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setField('pin', newPin);
    clearFieldError('pin');
    if (value && index < 3) document.getElementById(`pin-${index + 1}`)?.focus();
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) document.getElementById(`pin-${index - 1}`)?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setField('errorMsg', '');

    const newErrors = {};
    const nameRegex = /^[a-zA-Z\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name.trim()) newErrors.name = 'Full Name is Required';
    else if (!nameRegex.test(name.trim())) newErrors.name = 'Full Name should contain only letters and spaces';

    if (!email.trim()) newErrors.email = 'Email Address is Required';
    else if (!emailRegex.test(email.trim())) newErrors.email = 'Please enter a valid Email Address';

    const rawPhoneVal = phoneNumber.trim();
    if (!rawPhoneVal) newErrors.phoneNumber = 'Mobile Number is Required';
    else if (!isValidPhoneNumber(rawPhoneVal)) newErrors.phoneNumber = 'Please enter a valid international phone number';

    const pinStr = pin.join('');
    const pinChanged = pinStr && !pinStr.includes('•');
    if (editingAdmin) {
      if (pinStr.length > 0 && !pinStr.includes('•') && pinStr.length !== 4) newErrors.pin = 'PIN must be exactly 4 digits';
    } else {
      if (pinStr.length !== 4) newErrors.pin = 'PIN must be exactly 4 digits';
    }

    if (!role) newErrors.role = 'Role Type is Required';

    if (Object.keys(newErrors).length > 0) {
      setField('errors', newErrors);
      return;
    }
    setField('errors', {});

    try {
      const foundRole = dbRoles.find(r => r.name === role);
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.replace(/[^\d+]/g, ''),
        roleId: foundRole ? foundRole.id : null,
        isActive: status === 'Active' ? 1 : 0,
        profileImage: profileImageObj,
      };
      if (pinChanged) payload.pin = pinStr;

      if (editingAdmin) {
        const res = await updateAdminUserApi(editingAdmin.id, payload);
        triggerToast(res?.message || 'Success', 'success');
      } else {
        const res = await createAdminUserApi(payload);
        triggerToast(res?.message || 'Success', 'success');
      }
      await fetchAdmins({ page: currentPage - 1, limit: itemsPerPage, search: searchTerm });
      setView('list');
    } catch (err) {
      console.error("Failed to submit admin form:", err);
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
          setField('errors', backendErrors);
        }
        if (messages.length > 0) {
          errMsg = `${errMsg}: ${messages.join(', ')}`;
        }
      }
      triggerToast(errMsg, 'error');
    }
  };


  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Admin Users</h2>
            </div>
            <div className="flex items-center gap-3">
              {hasPermission('User Roles', 'view') && (
                <button
                  onClick={() => navigate('/roles')}
                  className="btn btn-secondary gap-1-5"
                  style={{ fontSize: '14px' }}
                >
                  <Key size={16} /> User Roles
                </button>
              )}
              {hasPermission('Admin User', 'view') && hasPermission('Admin User', 'add') && (
                <button
                  onClick={openAddForm}
                  className="btn btn-primary gap-1-5"
                  style={{ fontSize: '14px' }}
                >
                  <Plus size={16} /> Add Admin User
                </button>
              )}
            </div>
          </div>

          {hasPermission('Admin User', 'view') ? (
            <>
              {/* Filters & Search controls */}
              <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4">
                {/* Search */}
                <div className="search-wrapper flex-1">
                  <Search size={16} className="input-icon-search" />
                  <input
                    type="text"
                    placeholder="Search by name, email or phone..."
                    value={searchTerm}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\+/g, '').trim();
                      setSearchTerm(value);
                    }}
                    className="search-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <SlidersHorizontal size={14} /> Filters:
                  </div>

                  {/* Role filter */}
                  <Select
                    value={roleFilter}
                    onChange={setRoleFilter}
                    style={{ height: '36px', minWidth: '150px' }}
                    options={[
                      { value: 'All', label: 'All Roles' },
                      ...dbRoles.map(opt => ({ value: opt.id, label: opt.name }))
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

              {/* Admins Table */}
              <div className="table-container">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px', fontSize: '14px' }}>S.NO</th>
                        <th style={{ fontSize: '14px' }}>NAME</th>
                        <th style={{ fontSize: '14px' }}>MOBILE NUMBER</th>
                        <th style={{ fontSize: '14px' }}>EMAIL</th>
                        <th style={{ fontSize: '14px' }}>ROLE</th>
                        <th style={{ width: '100px', fontSize: '14px' }}>STATUS</th>
                        {showActionColumn && <th style={{ width: '151px', fontSize: '14px', textAlign: 'left' }}>ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAdmins.map((adm, index) => (
                        <tr key={adm.id}>
                          <td className="text-slate-500 font-semibold" style={{ fontSize: '14px' }}>{startIndex + index + 1}</td>
                          <td className="font-semibold text-slate-700" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>
                            <div className="flex items-center gap-2.5" style={{ gap: '10px' }}>
                              {adm.profileImage ? (
                                <img
                                  src={adm.profileImage}
                                  alt={adm.name}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    minWidth: '32px',
                                    minHeight: '32px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    border: '1px solid #e2e8f0'
                                  }}
                                />
                              ) : (
                                <div className="bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-650 border border-slate-200" style={{ width: '32px', height: '32px', borderRadius: '50%', background: "lightgray" }}>
                                  {adm.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span>{adm.name}</span>
                            </div>
                          </td>
                          <td className="text-slate-500 font-medium" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>{adm.phoneNumber || '—'}</td>
                          <td className="text-slate-500 font-medium" style={{ fontSize: '14px' }}>{adm.email}</td>
                          <td style={{ fontSize: '14px' }}>
                            <span className={`badge ${getRoleBadgeClass(adm.role)}`} style={{ fontSize: '13px' }}>
                              {adm.role}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 12px',
                              borderRadius: '20px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              background: adm.status === 'Active' ? '#f0fdf4' : '#fff1f2',
                              color: adm.status === 'Active' ? '#059669' : '#e11d48',
                              border: `1.5px solid ${adm.status === 'Active' ? '#bbf7d0' : '#fecdd3'}`,
                            }}>
                              {adm.status}
                            </span>
                          </td>
                          {showActionColumn && (
                            <td style={{ textAlign: 'left' }}>
                              <div className="flex items-center justify-start gap-2">
                                {hasPermission('Admin User', 'edit') && (
                                  <button
                                    onClick={() => openEditForm(adm)}
                                    className="btn-icon-only hover-primary"
                                    title="Edit Admin"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                {hasPermission('Admin User', 'delete') && (
                                  <button
                                    onClick={() => handleToggleStatus(adm)}
                                    className="btn-icon-only hover-danger"
                                    title={adm.status === 'Active' ? "Lock / Deactivate Account" : "Unlock / Activate Account"}
                                  >
                                    {adm.status === 'Active' ? <Unlock size={16} /> : <Lock size={16} className="text-rose-500" />}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {paginatedAdmins.length === 0 && (
                        <tr>
                          <td colSpan={showActionColumn ? 7 : 6} className="text-center py-8 text-slate-500 font-medium">
                            No administrator accounts detected.
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
                      Showing {startIndex + 1} to {Math.min(startIndex + paginatedAdmins.length, totalCount)} of {totalCount} profiles
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
            <div className="glass-panel p-8 text-center my-6 space-y-3 flex flex-col items-center justify-center" style={{ minHeight: '260px' }}>
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-outfit">Admin Users Access Restricted</h3>
              <p className="text-sm text-slate-500 max-w-md">
                You do not have permission to view Admin Users. Please use the <span className="font-semibold text-slate-700">User Roles</span> button above to access Roles management.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in form-card" style={{ minHeight: '520px' }}>
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
                <h3 className="text-lg font-bold font-outfit text-slate-800" style={{ lineHeight: '1.2' }}>
                  {view === 'add' ? 'Create Admin User' : `Edit Admin`}
                </h3>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div>
              <h4 className="font-bold text-slate-700 mb-4 font-outfit" style={{ fontSize: '14px' }}>Basic Information</h4>

              <div className="flex flex-col sm-flex-row gap-4 items-start">
                {/* Left Upload Column */}
                <div className="flex flex-col items-center gap-3 shrink-0">
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
                      padding: '6px 16px',
                      fontSize: '12px',
                      borderStyle: 'dashed',
                      borderColor: '#b70805',
                      color: '#0284c7',
                      background: '#f0f9ff'
                    }}
                  >
                    Choose
                  </label>
                  <input
                    type="file"
                    id="profile-upload"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Right Form Inputs */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-2-cols gap-4">
                    <div className="form-group">
                      <label className="form-label">Full Name <span className="text-rose-500">*</span></label>
                      <div className="input-error-wrapper">
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => {
                            setField('name', e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                            clearFieldError('name');
                          }}
                          placeholder="Enter Full Name"
                          className={`form-input form-input-sm ${errors.name ? 'is-invalid' : ''}`}
                          style={{ height: '44px' }}
                        />
                      </div>
                      {errors.name && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0 }}>
                          {errors.name}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address <span className="text-rose-500">*</span></label>
                      <div className="input-error-wrapper">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setField('email', e.target.value);
                            clearFieldError('email');
                          }}
                          placeholder="Enter Email Address"
                          className={`form-input form-input-sm ${errors.email ? 'is-invalid' : ''}`}
                          style={{ height: '44px' }}
                        />
                      </div>
                      {errors.email && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0 }}>
                          {errors.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-2-cols gap-4">
                    <div className="form-group">
                      <label className="form-label">Mobile Number <span className="text-rose-500">*</span></label>
                      <div className="input-error-wrapper block w-full">
                        <PhoneNumberInput
                          id="mobile-number-input"
                          value={phoneNumber}
                          onChange={(val) => {
                            setField('phoneNumber', val);
                            clearFieldError('phoneNumber');
                          }}
                          error={!!errors.phoneNumber}
                          placeholder="Enter Phone Number"
                        />
                      </div>
                      {errors.phoneNumber && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0 }}>
                          {errors.phoneNumber}
                        </span>
                      )}
                    </div>

                    {/* Role field */}
                    <div className="form-group">
                      <label className="form-label">Role Type <span className="text-rose-500">*</span></label>
                      <div className="input-error-wrapper">
                        <Select
                          value={role || undefined}
                          onChange={(val) => {
                            setField('role', val);
                            clearFieldError('role');
                          }}
                          placeholder="Select Role"
                          style={{ height: '44px', width: '100%' }}
                          status={errors.role ? 'error' : undefined}
                          options={roleOptions.map(opt => ({ value: opt, label: opt }))}
                        />
                      </div>
                      {errors.role && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0 }}>
                          {errors.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-2-cols gap-4 items-end">
                    {/* PIN field */}
                    <div className="form-group">
                      <label className="form-label">PIN - 4 Digits {!editingAdmin && <span className="text-rose-500">*</span>}</label>
                      <div className="flex gap-2">
                        {pin.map((digit, i) => (
                          <input
                            key={i}
                            id={`pin-${i}`}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handlePinChange(i, e.target.value)}
                            onKeyDown={(e) => handlePinKeyDown(i, e)}
                            onFocus={() => { if (pin.includes('•')) setField('pin', ['', '', '', '']); }}
                            onBlur={() => {
                              setTimeout(() => {
                                const activeEl = document.activeElement;
                                const isPinInput = activeEl?.id?.startsWith('pin-');
                                if (!isPinInput && !pin.join('').trim() && editingAdmin) setField('pin', ['•', '•', '•', '•']);
                              }, 100);
                            }}
                            className={`form-input form-input-sm ${errors.pin ? 'is-invalid' : ''}`}
                            style={{ width: '44px', height: '44px', textAlign: 'center', padding: '4px 2px' }}
                          />
                        ))}
                      </div>
                      {errors.pin && (
                        <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0 }}>
                          {errors.pin}
                        </span>
                      )}
                    </div>

                    {/* Status field */}
                    <div className="form-group">
                      <label className="form-label" style={{ marginBottom: '8px' }}>Status</label>
                      <div className="flex items-center gap-4 h-10">
                        <button
                          type="button"
                          onClick={() => setField('status', 'Active')}
                          className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none focus:outline-none"
                          style={{ background: 'none', border: 'none', padding: 0 }}
                        >
                          <div
                            className="rounded border flex items-center justify-center transition-all"
                            style={{
                              width: '20px',
                              height: '20px',
                              backgroundColor: status === 'Active' ? '#b70805' : '#ffffff',
                              borderColor: status === 'Active' ? '#b70805' : '#cbd5e1',
                              color: '#ffffff'
                            }}
                          >
                            {status === 'Active' && (
                              <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.285 2L9 13.567 3.714 8.556 0 12.272 9 21 24 5.715z" />
                              </svg>
                            )}
                          </div>
                          <span className={status === 'Active' ? 'text-slate-800' : 'text-slate-500'}>Active</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setField('status', 'Inactive')}
                          className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none focus:outline-none"
                          style={{ background: 'none', border: 'none', padding: 0 }}
                        >
                          <div
                            className="rounded border flex items-center justify-center transition-all"
                            style={{
                              width: '20px',
                              height: '20px',
                              backgroundColor: status === 'Inactive' ? '#b70805' : '#ffffff',
                              borderColor: status === 'Inactive' ? '#b70805' : '#cbd5e1',
                              color: '#ffffff'
                            }}
                          >
                            {status === 'Inactive' && (
                              <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.285 2L9 13.567 3.714 8.556 0 12.272 9 21 24 5.715z" />
                              </svg>
                            )}
                          </div>
                          <span className={status === 'Inactive' ? 'text-slate-800' : 'text-slate-500'}>Inactive</span>
                        </button>
                      </div>
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
                style={{ fontSize: '14px' }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'view' && (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in form-card" style={{ minHeight: '520px' }}>
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
                <h3 className="text-lg font-bold font-outfit text-slate-800" style={{ lineHeight: '1.2' }}>
                  Administrator Details
                </h3>
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-4 font-outfit">Basic Information</h4>

              <div className="flex flex-col sm-flex-row gap-6 items-start">
                {/* Left Profile Image */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm"
                    style={{ position: 'relative', width: '120px', height: '120px' }}
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-400 w-full h-full">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Details Grid */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-2-cols gap-4">
                    <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1/40' }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                      <p className="text-slate-800 font-bold text-base leading-tight">{name || '—'}</p>
                    </div>

                    <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1/40' }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                      <p className="text-slate-800 font-semibold text-sm leading-tight">{email || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-2-cols gap-4">
                    <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1/40' }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                      <p className="text-slate-800 font-semibold text-sm leading-tight">{phoneNumber || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-3-cols gap-4">
                    <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1/40' }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role Type</span>
                      <p className="mt-1">
                        <span className={`badge ${getRoleBadgeClass(role)}`} style={{ fontSize: '12px', fontWeight: 600 }}>
                          {role || '—'}
                        </span>
                      </p>
                    </div>

                    <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1/40' }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                      <p className="mt-1">
                        <span className={`badge ${status === 'Active' ? 'badge-success' : 'badge-danger'} text-xs font-semibold py-1 px-2.5`}>
                          {status}
                        </span>
                      </p>
                    </div>

                    <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1/40' }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PIN Set</span>
                      <p className="text-slate-800 font-semibold text-sm leading-tight">****</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast container */}
      {showToast && createPortal(
        <div className="toast-container">
          <div className={`custom-toast ${toastType}`} style={{ background: '#ffffff', backdropFilter: 'none', WebkitBackdropFilter: 'none', border: '1px solid #e2e8f0' }}>
            <div className="toast-icon-wrapper">
              {toastType === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </div>
            <span className="toast-message">{toastMsg}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Popup */}
      {deletePopup.show && createPortal(
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
              background: '#fff1f2', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Trash2 size={24} color="#e11d48" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
              Remove Account
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to remove the administrator account for <strong style={{ color: '#1e293b' }}>"{deletePopup.adminName}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletePopup({ show: false, adminId: null, adminName: '' })}
                className="btn btn-secondary"
                style={{ fontSize: '14px', minWidth: '100px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  fontSize: '14px', minWidth: '100px',
                  padding: '9px 20px', borderRadius: '10px',
                  background: '#e11d48', color: '#fff',
                  border: 'none', fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Status Toggle Confirmation Popup */}
      {statusPopup.show && createPortal(
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
              background: statusPopup.admin?.status === 'Active' ? '#fff1f2' : '#f0fdf4',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              {statusPopup.admin?.status === 'Active' ? (
                <Lock size={24} color="#e11d48" />
              ) : (
                <Unlock size={24} color="#10b981" />
              )}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
              {statusPopup.admin?.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to {statusPopup.admin?.status === 'Active' ? 'deactivate' : 'activate'} the administrator account for <strong style={{ color: '#1e293b' }}>"{statusPopup.admin?.name}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setStatusPopup({ show: false, admin: null })}
                className="btn btn-secondary"
                style={{ fontSize: '14px', minWidth: '100px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleStatus}
                style={{
                  fontSize: '14px', minWidth: '100px',
                  padding: '9px 20px', borderRadius: '10px',
                  background: statusPopup.admin?.status === 'Active' ? '#e11d48' : '#10b981',
                  color: '#fff',
                  border: 'none', fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {statusPopup.admin?.status === 'Active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
