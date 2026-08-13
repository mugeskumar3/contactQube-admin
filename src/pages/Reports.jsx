import React, { useState, useEffect } from 'react';
import { Select, message } from 'antd';
import { formatCurrency } from '../utils/format';
import { CreditCard, TrendingUp, Download, SlidersHorizontal, Users, Search, Calendar, X } from 'lucide-react';
import { getPlansApi } from '../Api/plansApi';
import { getMembersApi } from '../Api/membersApi';
import { getTransactionsApi, getMembershipReportApi, exportTransactionsApi, exportMembershipReportApi } from '../Api/reportsApi';
import AppDatePicker from '../components/AppDatePicker';

// getPlanName helper function moved inside component
const EMPTY_TEXT = '—';

const toDisplayText = (value, fallback = EMPTY_TEXT) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') {
    return value.name || value.planName || value.fullName || value.displayName || value.title || value.id || value._id || fallback;
  }
  return String(value);
};

const extractList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.list)) return value.list;
  if (Array.isArray(value.members)) return value.members;
  if (Array.isArray(value.plans)) return value.plans;
  if (value.data && typeof value.data === 'object') return extractList(value.data);
  return [];
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'trial'
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [dbPlanOptions, setDbPlanOptions] = useState([]);

  // Payments Report Filter state
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');

  // Trial Plan Report Filter state
  const [trialSearch, setTrialSearch] = useState('');
  const [trialDateFilter, setTrialDateFilter] = useState('');
  const [trialPlanFilter, setTrialPlanFilter] = useState('All');
  const [trialPlanTypeFilter, setTrialPlanTypeFilter] = useState('all');

  // Pagination states
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [trialPage, setTrialPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setPaymentsPage(1);
  }, [paymentsSearch, dateFilter, planFilter, planTypeFilter]);

  useEffect(() => {
    setTrialPage(1);
  }, [trialSearch, trialDateFilter, trialPlanFilter, trialPlanTypeFilter]);

  const getPlanName = (planIdOrName) => {
    if (!planIdOrName) return '—';
    if (typeof planIdOrName === 'object') {
      return planIdOrName.name || planIdOrName.planName || '—';
    }
    const found = dbPlanOptions.find(p => p.id === planIdOrName || p.name === planIdOrName);
    return found ? found.name : planIdOrName;
  };

  const getSafePlanName = (planIdOrName) => {
    if (!planIdOrName) return EMPTY_TEXT;
    const rawPlanName = toDisplayText(planIdOrName);
    const found = dbPlanOptions.find(p => String(p.id) === String(planIdOrName) || p.name === rawPlanName);
    return found ? found.name : rawPlanName;
  };

  const getPlanBadgeClass = (planIdOrName) => {
    const pName = getSafePlanName(planIdOrName).toLowerCase();
    if (pName.includes('gold')) return 'badge-gold';
    if (pName.includes('platinum')) return 'badge-platinum';
    if (pName.includes('diamond')) return 'badge-diamond';
    if (pName.includes('trial')) return 'badge-trial';
    return 'badge-neutral';
  };

  const toISTDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const cleanStr = String(dateStr).trim();
      if (!cleanStr || cleanStr === '—') return '—';
      const normalized = cleanStr.endsWith('Z') || cleanStr.includes('+') ? cleanStr : cleanStr + 'Z';
      const date = new Date(normalized);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Fetch payments from API with current filters
  const fetchPayments = React.useCallback(async ({ search = '', date = '', planId = '', planType = 'all' } = {}) => {
    try {
      const res = await getTransactionsApi({ page: 0, limit: 0, planId, planType, search, date });
      const paymentsList = extractList(res?.data || res);
      const normalized = paymentsList.map(p => {
        if (!p) return null;
        return {
          ...p,
          id: p.id || p._id || String(Math.random()),
          memberId: p.memberId || '',
          memberName: toDisplayText(p.memberName || p.name || p.member?.name || p.member?.fullName || p.member?.displayName, EMPTY_TEXT),
          email: toDisplayText(p.email || p.member?.email, EMPTY_TEXT),
          date: toDisplayText(p.date || p.paymentDate || p.createdAt, ''),
          amount: p.amount ?? 0,
          planName: toDisplayText(p.planName || p.plan || p.planId || p.membershipPlan || p.member?.plan, EMPTY_TEXT),
          method: (() => {
            const m = p.method || p.paymentMethod;
            return (!m || m.trim() === '' || m.trim() === '—' || m.trim() === '-') ? 'Free Trial' : m;
          })(),
          status: toDisplayText(p.status, EMPTY_TEXT),
        };
      }).filter(Boolean);
      setPayments(normalized);
    } catch (err) {
      console.error('Failed to fetch payments/transactions in Reports:', err);
    }
  }, []);

  // Fetch members (plan report) from API with current filters
  const fetchMembers = React.useCallback(async ({ search = '', date = '', planId = '', planType = 'all' } = {}) => {
    try {
      const res = await getMembershipReportApi({ page: 0, limit: 0, planId, planType, search, date });
      const membersList = extractList(res?.data || res);
      const normalized = membersList.map(m => {
        if (!m) return null;
        const displayName = m.displayName || m.fullName || m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Unnamed';
        const planVal = toDisplayText(m.plan || m.membershipPlan || m.planId, '');
        return {
          ...m,
          id: m.id || m._id || String(Math.random()),
          name: displayName,
          fullName: displayName,
          mobileNumber: toDisplayText(m.mobileNumber || m.phone, ''),
          email: toDisplayText(m.email, ''),
          plan: planVal,
          membershipPlan: planVal,
          planId: m.planId || '',
          membershipStartDate: toDisplayText(m.membershipStartDate || m.joinedDate, ''),
          membershipExpiryDate: toDisplayText(m.membershipExpiryDate, ''),
          status: toDisplayText(m.status, EMPTY_TEXT)
        };
      }).filter(Boolean);
      setMembers(normalized);
    } catch (err) {
      console.error('Failed to fetch members in Reports:', err);
    }
  }, []);

  useEffect(() => {
    const planIdParam = planFilter === 'All' ? '' : planFilter;
    fetchPayments({ search: paymentsSearch, date: dateFilter, planId: planIdParam, planType: planTypeFilter });
  }, [paymentsSearch, dateFilter, planFilter, planTypeFilter, fetchPayments]);

  useEffect(() => {
    const planIdParam = trialPlanFilter === 'All' ? '' : trialPlanFilter;
    fetchMembers({ search: trialSearch, date: trialDateFilter, planId: planIdParam, planType: trialPlanTypeFilter });
  }, [trialSearch, trialDateFilter, trialPlanFilter, trialPlanTypeFilter, fetchMembers]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getPlansApi({ page: 0, limit: 0 });
        const data = extractList(res?.data || res);
        const planObjects = data.map(p => ({ id: p.id || p._id, name: toDisplayText(p.name || p.planName, '') })).filter(p => p.name);
        setDbPlanOptions(planObjects);
      } catch (err) {
        console.error('Failed to fetch plans in Reports:', err);
        setDbPlanOptions([]);
      }
    };
    fetchPlans();
  }, []);



  // API handles all filtering — paginated below
  const filteredPayments = payments || [];
  const paymentsTotalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paymentsStartIndex = (paymentsPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(paymentsStartIndex, paymentsStartIndex + itemsPerPage);

  // API handles all filtering — paginated below
  const filteredTrialMembers = members || [];
  const trialTotalPages = Math.ceil(filteredTrialMembers.length / itemsPerPage);
  const trialStartIndex = (trialPage - 1) * itemsPerPage;
  const paginatedTrialMembers = filteredTrialMembers.slice(trialStartIndex, trialStartIndex + itemsPerPage);


  const handleExport = async (format) => {
    try {
      message.loading({ content: `Exporting to ${format.toUpperCase()}...`, key: 'exporting' });

      let blob;
      let filename;

      if (activeTab === 'payments') {
        const planIdParam = planFilter === 'All' ? '' : planFilter;
        blob = await exportTransactionsApi({
          planId: planIdParam,
          planType: planTypeFilter,
          search: paymentsSearch,
          date: dateFilter,
          format
        });
        filename = `payment_transactions_report_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      } else {
        const planIdParam = trialPlanFilter === 'All' ? '' : trialPlanFilter;
        blob = await exportMembershipReportApi({
          planId: planIdParam,
          planType: trialPlanTypeFilter,
          search: trialSearch,
          date: trialDateFilter,
          format
        });
        filename = `membership_plan_report_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      }

      // Create browser link to trigger download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success({ content: 'Report exported successfully!', key: 'exporting' });
    } catch (err) {
      console.error('Export failed:', err);
      message.error({ content: 'Failed to export report.', key: 'exporting' });
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Panel with Tab Switcher */}
      <div
        className="flex flex-col sm-flex-row sm-items-center justify-between border-b pb-4 gap-4 animate-in fade-in"
        style={{ marginLeft: '-24px', marginRight: '-24px', paddingLeft: '24px', paddingRight: '24px' }}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Reports Analysis</h2>

        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div style={{
            position: 'relative',
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '30px',
            border: '1px solid #e2e8f0',
            width: '380px',
            height: '40px',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: '4px',
              width: 'calc(50% - 4px)',
              backgroundColor: '#b70805',
              borderRadius: '26px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transform: activeTab === 'payments' ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 0
            }} />
            <button
              onClick={() => setActiveTab('payments')}
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'payments' ? 'bold' : '500',
                fontSize: '12px',
                fontFamily: 'Outfit, sans-serif',
                color: activeTab === 'payments' ? '#ffffff' : '#64748b',
                transition: 'color 0.2s ease'
              }}
            >
              Payments Report
            </button>
            <button
              onClick={() => setActiveTab('trial')}
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'trial' ? 'bold' : '500',
                fontSize: '12px',
                fontFamily: 'Outfit, sans-serif',
                color: activeTab === 'trial' ? '#ffffff' : '#64748b',
                transition: 'color 0.2s ease'
              }}
            >
              Plan Report
            </button>
          </div>
          <button
            onClick={() => handleExport('excel')}
            className="btn btn-secondary gap-1.5 text-xs py-2 px-3 self-stretch border-emerald-500 text-emerald-600 hover:bg-emerald-50"
          >
            <Download size={14} /> Export Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="btn btn-secondary gap-1.5 text-xs py-2 px-3 self-stretch border-rose-500 text-rose-600 hover:bg-rose-50"
          >
            <Download size={14} /> Export PDF
          </button>

        </div>
      </div>

      {activeTab === 'payments' ? (
        <>
          {/* Payments Filters */}
          <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4 animate-in fade-in">
            {/* Search */}
            <div className="search-wrapper flex-1" style={{ width: '100%' }}>
              <Search size={16} className="input-icon-search" />
              <input
                type="text"
                placeholder="Search payments by ID, member name, or email..."
                value={paymentsSearch}
                onChange={(e) => setPaymentsSearch(e.target.value)}
                className="search-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Filter by Date & Plan */}
            <div className="flex items-center gap-3" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <SlidersHorizontal size={14} /> Filters:
              </div>
              <AppDatePicker
                value={dateFilter}
                onChange={(v) => setDateFilter(v)}
                showTime={false}
                placeholder="Filter by Date"
                style={{ height: '36px', width: '160px', fontSize: '12px' }}
              />
              <Select
                value={planFilter}
                onChange={setPlanFilter}
                style={{ height: '36px', minWidth: '150px' }}
                options={[
                  { value: 'All', label: 'All Plans' },
                  ...dbPlanOptions.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
              <Select
                value={planTypeFilter}
                onChange={setPlanTypeFilter}
                style={{ height: '36px', minWidth: '120px' }}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'trial', label: 'Trial' },
                  { value: 'premium', label: 'Premium' }
                ]}
              />
              {(paymentsSearch || dateFilter || planFilter !== 'All' || planTypeFilter !== 'all') ? (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentsSearch('');
                    setDateFilter('');
                    setPlanFilter('All');
                    setPlanTypeFilter('all');
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                  style={{ height: '36px' }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {/* Transactions List */}
          <div className="glass-panel p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="font-outfit font-bold text-slate-800 flex items-center gap-2">
                <CreditCard size={18} className="text-[#b70805]" /> Recent Payment Transactions
              </h3>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    {/* <th style={{ whiteSpace: 'nowrap' }}>Transaction ID</th> */}
                    <th style={{ whiteSpace: 'nowrap' }}>Member Name</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Plan Type</th>
                    <th>Amount</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Payment Date</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((p, index) => (
                    <tr key={p.id || index}>
                      <td className="text-slate-500 font-semibold">{paymentsStartIndex + index + 1}</td>
                      {/* <td className="font-semibold text-slate-800 text-xs" style={{ whiteSpace: 'nowrap' }}>{toDisplayText(p.id, '')}</td> */}
                      <td className="font-bold text-slate-700" style={{ whiteSpace: 'nowrap' }}>{toDisplayText(p.memberName || p.name, '')}</td>
                      <td className="text-slate-500 text-xs">{toDisplayText(p.email, '')}</td>
                      <td>
                        <span className={`badge badge-plan ${getPlanBadgeClass(p.planName || p.plan || p.planId)}`}>
                          {getSafePlanName(p.planName || p.plan || p.planId)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: p.planType === 'TRIAL' ? '#fffbeb' : '#f5f3ff',
                          color: p.planType === 'TRIAL' ? '#d97706' : '#7c3aed',
                          border: `1.5px solid ${p.planType === 'TRIAL' ? '#fde68a' : '#ddd6fe'}`,
                        }}>
                          {p.planType === 'TRIAL' ? 'Trial' : 'Premium'}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-700">{formatCurrency(Number(p.amount) || 0)}</td>
                      <td className="text-slate-500 text-xs" style={{ whiteSpace: 'nowrap' }}>{toISTDateOnly(p.date)}</td>
                      <td className="text-slate-650 font-medium">{toDisplayText(p.method, EMPTY_TEXT)}</td>
                      <td>
                        <span className={`badge text-xs py-0.5 px-2 ${
                          (toDisplayText(p.status, '').toUpperCase() === 'COMPLETED' || toDisplayText(p.status, '').toUpperCase() === 'PAID')
                            ? 'badge-success'
                            : 'badge-danger'
                        }`}>
                          {toDisplayText(p.status, EMPTY_TEXT)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center py-8 text-slate-500">
                        No transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {paymentsTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {paymentsStartIndex + 1} to {Math.min(paymentsStartIndex + itemsPerPage, filteredPayments.length)} of {filteredPayments.length} transactions
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={paymentsPage === 1}
                    onClick={() => setPaymentsPage(paymentsPage - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: paymentsTotalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPaymentsPage(i + 1)}
                      className={`btn ${paymentsPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={paymentsPage === paymentsTotalPages}
                    onClick={() => setPaymentsPage(paymentsPage + 1)}
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
        <>
          {/* Trial Plan Filters */}
          <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4 animate-in fade-in">
            {/* Search */}
            <div className="search-wrapper flex-1" style={{ width: '100%' }}>
              <Search size={16} className="input-icon-search" />
              <input
                type="text"
                placeholder="Search trial users by name, email, or mobile..."
                value={trialSearch}
                onChange={(e) => setTrialSearch(e.target.value)}
                className="search-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Filter by Date & Plan */}
            <div className="flex items-center gap-3" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <SlidersHorizontal size={14} /> Filters:
              </div>
              <AppDatePicker
                value={trialDateFilter}
                onChange={(v) => setTrialDateFilter(v)}
                showTime={false}
                placeholder="Filter by Date"
                style={{ height: '36px', width: '160px', fontSize: '12px' }}
              />
              <Select
                value={trialPlanFilter}
                onChange={setTrialPlanFilter}
                style={{ height: '36px', minWidth: '150px' }}
                options={[
                  { value: 'All', label: 'All Plans' },
                  ...dbPlanOptions.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
              <Select
                value={trialPlanTypeFilter}
                onChange={setTrialPlanTypeFilter}
                style={{ height: '36px', minWidth: '120px' }}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'trial', label: 'Trial' },
                  { value: 'premium', label: 'Premium' }
                ]}
              />
              {(trialSearch || trialDateFilter || trialPlanFilter !== 'All' || trialPlanTypeFilter !== 'all') ? (
                <button
                  type="button"
                  onClick={() => {
                    setTrialSearch('');
                    setTrialDateFilter('');
                    setTrialPlanFilter('All');
                    setTrialPlanTypeFilter('all');
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                  style={{ height: '36px' }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {/* Trial Members List */}
          <div className="glass-panel p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="font-outfit font-bold text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-[#b70805]" /> {trialPlanFilter === 'All' ? 'Membership Accounts (All Plans)' : trialPlanFilter === 'trial' ? 'Membership Accounts (Trial)' : `Membership Accounts (${dbPlanOptions.find(p => p.id === trialPlanFilter)?.name || trialPlanFilter} Plan)`}
              </h3>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Name</th>
                    <th>Mobile Number</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Plan Tier</th>
                    <th>Plan Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrialMembers.map((m, index) => (
                    <tr key={m.id || index}>
                      <td className="text-slate-500 font-semibold">{trialStartIndex + index + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {m.profileImage ? (
                            <img
                              src={m.profileImage}
                              alt={toDisplayText(m.fullName || m.name, 'User')}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className={`avatar-circle ${m.color || 'bg-slate-500'}`} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                              {toDisplayText(m.avatar, '') || (toDisplayText(m.name, '') ? toDisplayText(m.name, '').charAt(0).toUpperCase() : 'U')}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{toDisplayText(m.fullName || m.name, 'Unnamed')}</p>
                            <p className="text-slate-500 text-xs">{toDisplayText(m.email, '')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-650 font-medium">{m.mobileNumber || '—'}</td>
                      <td className="text-slate-500 text-xs">{toISTDateOnly(m.startDate || m.joinedDate)}</td>
                      <td className="text-slate-500 text-xs">{toISTDateOnly(m.expiryDate)}</td>
                      <td>
                        <span className={`badge badge-plan ${getPlanBadgeClass(m.planTier || m.plan || m.planId)}`}>
                          {getSafePlanName(m.planTier || m.plan || m.planId)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: m.status === 'TRIAL' ? '#fffbeb' : '#f5f3ff',
                          color: m.status === 'TRIAL' ? '#d97706' : '#7c3aed',
                          border: `1.5px solid ${m.status === 'TRIAL' ? '#fde68a' : '#ddd6fe'}`,
                        }}>
                          {m.status === 'TRIAL' ? 'Trial' : 'Premium'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          (m.status === 'ACTIVE' || m.status === 'TRIAL')
                            ? 'badge-success'
                            : m.status === 'PENDING'
                              ? 'badge-warning'
                              : 'badge-danger'
                        }`}>
                          {m.status === 'ACTIVE' || m.status === 'TRIAL' ? 'Active' : m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredTrialMembers.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-500">
                        No {trialPlanFilter !== 'All' ? trialPlanFilter.toLowerCase() : ''} membership accounts recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {trialTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {trialStartIndex + 1} to {Math.min(trialStartIndex + itemsPerPage, filteredTrialMembers.length)} of {filteredTrialMembers.length} accounts
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={trialPage === 1}
                    onClick={() => setTrialPage(trialPage - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: trialTotalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setTrialPage(i + 1)}
                      className={`btn ${trialPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={trialPage === trialTotalPages}
                    onClick={() => setTrialPage(trialPage + 1)}
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
      )}
    </div>
  );
}
