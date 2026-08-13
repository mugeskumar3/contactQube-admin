import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Edit2,
  Search,
  Plus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock,
  SlidersHorizontal
} from 'lucide-react';
import { Select } from 'antd';
import { getRolesApi, getModulesApi, getRoleByIdApi, createRoleApi, updateRoleApi, deleteRoleApi, toggleRoleActiveApi } from '../Api/roleApi';
import { hasPermission } from '../utils/permission';

const EMPTY_ACTIONS = { view: false, add: false, edit: false, delete: false };

const normalizeRole = (role, moduleMap = {}) => {
  if (!role) return null;

  const modulePermissions = {};
  Object.values(moduleMap).forEach(name => {
    modulePermissions[name] = { ...EMPTY_ACTIONS };
  });

  if (Array.isArray(role.permissions)) {
    role.permissions.forEach((permission) => {
      const moduleName = permission?.module?.name || permission?.moduleName || moduleMap[permission?.moduleId];
      if (moduleName) {
        modulePermissions[moduleName] = {
          view: !!permission.actions?.view,
          add: !!permission.actions?.add,
          edit: !!permission.actions?.edit,
          delete: !!permission.actions?.delete
        };
      }
    });
  }

  return {
    id: role._id || role.id,
    name: role.name,
    code: role.code || '',
    isActive: role.isActive,
    isEditable: role.isEditable,
    modulePermissions
  };
};

const mapRoleToPayload = (roleName, roleCode, modulePermissions, modules, isActive = true) => {
  const permissions = modules.map((module) => ({
    moduleId: module.id,
    actions: {
      view: !!modulePermissions[module.name]?.view,
      add: !!modulePermissions[module.name]?.add,
      edit: !!modulePermissions[module.name]?.edit,
      delete: !!modulePermissions[module.name]?.delete
    }
  }));

  return {
    name: roleName.trim(),
    code: (roleCode || roleName).trim().toLowerCase().replace(/\s+/g, ''),
    isActive: isActive ? 1 : 0,
    permissions
  };
};

// Sub-component: Permission Grid checklist
const PermissionGrid = ({ modules, permissions, onToggle, onToggleAll }) => {
  const isAllChecked = (permissionType) => {
    if (modules.length === 0) return false;
    return modules.every(mod => permissions[mod.name]?.[permissionType] === true);
  };

  return (
    <div className="table-container" style={{ border: '1px solid #cbd5e1' }}>
      <div className="table-wrapper">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#b70805' }}>
              <th style={{ padding: '12px 20px', fontSize: '14px', background: '#b70805', color: '#fff', borderBottom: '1px solid #cbd5e1', width: '24%' }}>Module Name</th>
              {['view', 'add', 'edit', 'delete'].map(type => (
                <th key={type} style={{ padding: '12px 20px', fontSize: '14px', textTransform: 'uppercase', background: '#b70805', color: '#fff', borderBottom: '1px solid #cbd5e1', width: '19%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <span className="capitalize">{type}</span>
                    <input
                      type="checkbox"
                      checked={isAllChecked(type)}
                      onChange={(e) => onToggleAll(type, e.target.checked)}
                      style={{ cursor: 'pointer', transform: 'scale(1.15)', accentColor: '#b70805' }}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => (
              <tr key={mod.name}>
                <td style={{ padding: '12px 20px', fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                  {mod.name}
                </td>
                {['view', 'add', 'edit', 'delete'].map(type => (
                  <td key={type} style={{ padding: '12px 20px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={permissions[mod.name]?.[type] || false}
                      onChange={() => onToggle(mod.name, type)}
                      style={{ cursor: 'pointer', transform: 'scale(1.2)', accentColor: '#b70805' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ToastNotification = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show, onClose]);

  if (!toast.show) return null;

  return createPortal(
    <div className="toast-container animate-in fade-in">
      <div className={`custom-toast ${toast.type}`} style={{ background: '#ffffff', backdropFilter: 'none', border: '1px solid #e2e8f0' }}>
        <div className="toast-icon-wrapper">
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        </div>
        <span className="toast-message">{toast.message}</span>
      </div>
    </div>,
    document.body
  );
};

// Sub-component: Status Toggle Confirmation Portal
const StatusToggleConfirmationModal = ({ show, role, onCancel, onConfirm }) => {
  if (!show) return null;
  const roleName = role?.name || '';
  const isActive = role?.isActive !== false && role?.isActive !== 0;

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
      }} className="animate-in zoom-in-95">
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: isActive ? '#fff1f2' : '#f0fdf4', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          {isActive ? <Lock size={24} color="#e11d48" /> : <Unlock size={24} color="#10b981" />}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
          {isActive ? 'Deactivate Role' : 'Activate Role'}
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
          Are you sure you want to {isActive ? 'deactivate' : 'activate'} the role <strong style={{ color: '#1e293b' }}>"{roleName}"</strong>?
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
              background: isActive ? '#e11d48' : '#10b981', color: '#fff',
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

export default function UserRoles() {
  const navigate = useNavigate();

  // Data lists & loading states
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Navigation states
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'

  // consolidated toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  // consolidated form states
  const [form, setForm] = useState({ name: '', code: '', isActive: true, permissions: {} });
  const [formErrors, setFormErrors] = useState({});
  const [formErrorMsg, setFormErrorMsg] = useState('');

  const [editingRole, setEditingRole] = useState(null);
  const [statusPopup, setStatusPopup] = useState({ show: false, role: null });

  const itemsPerPage = 10;

  // Memoized helpers
  const moduleMap = useMemo(() => {
    return modules.reduce((acc, mod) => {
      acc[mod.id] = mod.name;
      return acc;
    }, {});
  }, [modules]);

  const totalPages = useMemo(() => Math.ceil(totalCount / itemsPerPage), [totalCount]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);

  const showActionColumn = useMemo(() => {
    return hasPermission('User Roles', 'edit') || hasPermission('User Roles', 'delete');
  }, []);

  const triggerToast = useCallback((message, type = 'error') => {
    setToast({ show: true, message, type });
  }, []);

  const updateForm = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Search debouncing hook
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Scroll window to top whenever view changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view]);

  // Load modules list on mount
  useEffect(() => {
    const loadModules = async () => {
      let moduleSource = [];
      try {
        const res = await getModulesApi({ page: 0, limit: 0 });
        const data = res?.data || [];
        moduleSource = data.map(mod => ({
          id: mod._id || mod.id,
          name: mod.name
        }));
      } catch (err) {
        console.error("Failed to fetch modules from API:", err);
      }
      setModules(moduleSource);
      setModulesLoaded(true);
    };
    loadModules();
  }, []);

  // Re-fetch roles on pagination, search debounced or module map loaded
  const fetchRoles = useCallback(async () => {
    if (!modulesLoaded) return;
    try {
      let isActiveParam = '';
      if (statusFilter === 'Active') isActiveParam = 1;
      else if (statusFilter === 'Inactive') isActiveParam = 0;

      const res = await getRolesApi({ page: currentPage - 1, limit: itemsPerPage, search: searchTerm, isActive: isActiveParam });
      const data = res?.data || [];
      const mapped = data.map(role => normalizeRole(role, moduleMap)).filter(Boolean);
      setRoles(mapped);
      setTotalCount(res?.total || mapped.length);
    } catch (err) {
      console.error("Failed to fetch roles from API:", err);
      setRoles([]);
      setTotalCount(0);
      triggerToast(err.response?.data?.message || err.message || "Error loading roles", 'error');
    }
  }, [modules, modulesLoaded, currentPage, searchTerm, statusFilter, moduleMap, triggerToast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // View state handlers
  const openAddForm = useCallback(() => {
    setEditingRole(null);
    setForm({
      name: '',
      code: '',
      isActive: true,
      permissions: modules.reduce((acc, mod) => {
        acc[mod.name] = { ...EMPTY_ACTIONS };
        return acc;
      }, {})
    });
    setFormErrorMsg('');
    setFormErrors({});
    setView('add');
  }, [modules]);

  const openEditForm = useCallback(async (role) => {
    let latestRole = role;
    try {
      const res = await getRoleByIdApi(role.id);
      latestRole = normalizeRole(res?.data || res, moduleMap) || role;
    } catch (err) {
      console.error("Failed to fetch role by id:", err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
    }

    setEditingRole(latestRole);

    const clonedPerms = JSON.parse(JSON.stringify(latestRole.modulePermissions || {}));
    modules.forEach(mod => {
      if (!clonedPerms[mod.name]) {
        clonedPerms[mod.name] = { ...EMPTY_ACTIONS };
      } else {
        clonedPerms[mod.name] = {
          view: !!clonedPerms[mod.name].view,
          add: !!clonedPerms[mod.name].add,
          edit: !!clonedPerms[mod.name].edit,
          delete: !!clonedPerms[mod.name].delete
        };
      }
    });

    setForm({
      name: latestRole.name,
      code: latestRole.code || '',
      isActive: latestRole.isActive !== false,
      permissions: clonedPerms
    });
    setFormErrorMsg('');
    setFormErrors({});
    setView('edit');
  }, [modules, moduleMap, triggerToast]);

  const handleToggleStatus = useCallback((roleToToggle) => {
    setStatusPopup({ show: true, role: roleToToggle });
  }, []);

  const confirmToggleStatus = useCallback(async () => {
    const roleToToggle = statusPopup.role;
    setStatusPopup({ show: false, role: null });
    if (!roleToToggle) return;
    try {
      const res = await toggleRoleActiveApi(roleToToggle.id);
      triggerToast(res?.message || 'Success', 'success');
      await fetchRoles();
    } catch (err) {
      console.error("Failed to toggle role status:", err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
    }
  }, [statusPopup.role, fetchRoles, triggerToast]);

  const handleToggleCheckbox = useCallback((moduleName, permissionType) => {
    setForm(prev => {
      const modulePerms = prev.permissions[moduleName] || { ...EMPTY_ACTIONS };
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleName]: {
            ...modulePerms,
            [permissionType]: !modulePerms[permissionType]
          }
        }
      };
    });
  }, []);

  const handleToggleAll = useCallback((permissionType, checked) => {
    setForm(prev => {
      const updatedPermissions = { ...prev.permissions };
      modules.forEach(mod => {
        const modulePerms = updatedPermissions[mod.name] || { ...EMPTY_ACTIONS };
        updatedPermissions[mod.name] = {
          ...modulePerms,
          [permissionType]: checked
        };
      });
      return {
        ...prev,
        permissions: updatedPermissions
      };
    });
  }, [modules]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrorMsg('');

    const newErrors = {};
    const nameRegex = /^[a-zA-Z\s]+$/;
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      newErrors.roleName = 'Role Name is Required';
    } else if (!nameRegex.test(trimmedName)) {
      newErrors.roleName = 'Role Name should contain only letters and spaces';
    } else {
      const nameExists = roles.some(r =>
        r.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!editingRole || r.id !== editingRole.id)
      );
      if (nameExists) {
        newErrors.roleName = 'Role name is already exists.';
      }
    }

    if (!form.code.trim()) {
      newErrors.roleCode = 'Role Code is Required';
    }

    const hasAtLeastOneChecked = Object.values(form.permissions).some(
      perms => perms.view
    );
    if (!hasAtLeastOneChecked) {
      newErrors.permissions = 'At least one view checkbox permission must be selected.';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setFormErrors({});

    try {
      const backendPayload = mapRoleToPayload(form.name, form.code, form.permissions, modules, form.isActive);

      if (editingRole) {
        const res = await updateRoleApi(editingRole.id, backendPayload);
        triggerToast(res?.message || 'Success', 'success');
      } else {
        const res = await createRoleApi(backendPayload);
        triggerToast(res?.message || 'Success', 'success');
      }
      await fetchRoles();
      setView('list');
    } catch (err) {
      console.error("Failed to save role:", err);
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
          setFormErrors(backendErrors);
        }
        if (messages.length > 0) {
          errMsg = `${errMsg}: ${messages.join(', ')}`;
        }
      }
      setFormErrorMsg(errMsg);
      triggerToast(errMsg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          <div className="flex flex-col sm-flex-row sm-items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Roles & Permissions</h2>
            </div>
            <div className="flex items-center gap-3 self-start">
              <button
                onClick={() => navigate('/admins')}
                className="btn btn-secondary gap-1-5"
              >
                <ArrowLeft size={16} /> Back
              </button>
              {hasPermission('User Roles', 'add') && (
                <button
                  onClick={openAddForm}
                  className="btn btn-primary gap-1-5"
                >
                  <Plus size={16} /> Add Role
                </button>
              )}
            </div>
          </div>

          <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4">
            <div className="search-wrapper flex-1">
              <Search size={16} className="input-icon-search" />
              <input
                type="text"
                placeholder="Search role by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="search-input"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <SlidersHorizontal size={14} /> Filters:
              </div>
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
              <div className="text-slate-400 font-medium ml-2" style={{ fontSize: '14px' }}>
                Total Roles: {totalCount}
              </div>
            </div>
          </div>

          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', fontSize: '14px' }}>S.No</th>
                    <th style={{ width: '800px', textAlign: "left", fontSize: '14px', paddingLeft: '100px' }}>Role Name</th>
                    <th style={{ width: '290px', textAlign: "left", fontSize: '14px' }}>Status</th>
                    {showActionColumn && <th style={{ width: '150px', fontSize: '14px', textAlign: 'left' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr key={role.name}>
                      <td className="text-slate-500 font-semibold" style={{ fontSize: '14px' }}>
                        {startIndex + index + 1}
                      </td>
                      <td style={{ paddingLeft: '100px' }}>
                        <span className="font-bold text-slate-800" style={{ fontSize: '14px' }}>{role.name}</span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 12px',
                          borderRadius: '20px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          background: role.isActive !== false && role.isActive !== 0 ? '#f0fdf4' : '#fff1f2',
                          color: role.isActive !== false && role.isActive !== 0 ? '#059669' : '#e11d48',
                          border: `1.5px solid ${role.isActive !== false && role.isActive !== 0 ? '#bbf7d0' : '#fecdd3'}`,
                        }}>
                          {role.isActive !== false && role.isActive !== 0 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {showActionColumn && (
                        <td style={{ textAlign: 'left' }}>
                          <div className="flex items-center justify-start gap-2">
                            {hasPermission('User Roles', 'edit') && <button
                              onClick={() => openEditForm(role)}
                              className="btn-icon-only hover-primary"
                              title="Edit Permissions"
                              style={{ padding: '6px' }}
                            >
                              <Edit2 size={15} />
                            </button>}
                            {hasPermission('User Roles', 'delete') && <button
                              disabled={role.name === 'Admin' || role.code === 'SUPER_ADMIN'}
                              onClick={() => handleToggleStatus(role)}
                              className={`btn-icon-only ${role.name === 'Admin' || role.code === 'SUPER_ADMIN' ? 'opacity-40 cursor-not-allowed' : 'hover-danger'}`}
                              title={role.name === 'Admin' || role.code === 'SUPER_ADMIN' ? "Cannot deactivate default Admin role" : (role.isActive !== false && role.isActive !== 0 ? "Deactivate Role" : "Activate Role")}
                              style={{ padding: '6px' }}
                            >
                              {role.isActive !== false && role.isActive !== 0 ? <Unlock size={15} /> : <Lock size={15} className="text-rose-500" />}
                            </button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {roles.length === 0 && (
                    <tr>
                      <td colSpan={showActionColumn ? 4 : 3} className="text-center py-8 text-slate-500 font-medium">
                        No roles match your search term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {startIndex + 1} to {Math.min(startIndex + roles.length, totalCount)} of {totalCount} roles
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
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
        <div className="glass-panel p-6 space-y-6 animate-in fade-in form-card">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setView('list'); setFormErrors({}); }}
                className="btn btn-secondary"
                style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Back to list"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 className="text-lg font-bold font-outfit text-slate-800" style={{ lineHeight: '1.2' }}>
                  {view === 'add' ? 'Create New User Role' : `Edit Role: ${editingRole?.name}`}
                </h3>
                <p className="text-xs text-slate-500 font-medium" style={{ marginTop: '2px' }}>
                  {view === 'add' ? 'Define a new role and configure its permissions checklist.' : 'Modify permissions checkboxes for this role profile.'}
                </p>
              </div>
            </div>
          </div>

          {formErrorMsg && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
              {formErrorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="form-group">
              <label className="form-label">Role Name <span className="text-rose-500">*</span></label>
              <div className="input-error-wrapper">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
                    updateForm('name', value);
                    if (!form.code || form.code === value.trim().toLowerCase().replace(/\s+/g, '')) {
                      updateForm('code', value.trim().toLowerCase().replace(/\s+/g, ''));
                    }
                    if (formErrors.roleName) {
                      setFormErrors(prev => {
                        const clone = { ...prev };
                        delete clone.roleName;
                        return clone;
                      });
                    }
                  }}
                  placeholder="Please Enter Role Name"
                  className={`form-input ${formErrors.roleName ? 'is-invalid' : ''}`}
                />
              </div>
              {formErrors.roleName && (
                <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                  {formErrors.roleName}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="form-label">
                    Role Permissions{" "}
                    <span className="text-rose-500">*</span>
                  </span>
                </div>

                {formErrors.permissions && (
                  <span
                    className="self-end animate-in fade-in"
                    style={{
                      color: "#e11d48",
                      fontSize: "12px",
                      fontWeight: 600,
                      marginTop: "4px",
                      padding: "0px"
                    }}
                  >
                    {formErrors.permissions}
                  </span>
                )}
              </div>

              <PermissionGrid
                modules={modules}
                permissions={form.permissions}
                onToggle={handleToggleCheckbox}
                onToggleAll={handleToggleAll}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => { setView('list'); setFormErrors({}); }}
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
                {view === 'add' ? 'Save Role' : 'Update Role'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />

      <StatusToggleConfirmationModal
        show={statusPopup.show}
        role={statusPopup.role}
        onCancel={() => setStatusPopup({ show: false, role: null })}
        onConfirm={confirmToggleStatus}
      />
    </div>
  );
}
