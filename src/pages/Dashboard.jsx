import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import { getLatestMembersApi, getAssetGrowthApi, getDashboardStatsApi } from '../Api/dashboardApi';
import {
  Users,
  CreditCard,
  Gift,
  HelpCircle,
  Activity,
  CalendarClock,
  Phone
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-cyan-500',
];

export default function Dashboard() {
  const [latestMembers, setLatestMembers] = useState([]);
  const [assetGrowthData, setAssetGrowthData] = useState([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    trialPlan: 0,
    premiumPlan: 0,
    give: 0,
    ask: 0,
    expired: 0,
    totalContacts: 0
  });

  useEffect(() => {
    const fetchLatestMembers = async () => {
      try {
        const res = await getLatestMembersApi();
        setLatestMembers(res.data || []);
      } catch (err) {
        console.error('Failed to fetch latest members:', err);
      }
    };

    const fetchAssetGrowth = async () => {
      try {
        const res = await getAssetGrowthApi();
        if (res.data && Array.isArray(res.data)) {
          const normalized = res.data.map(item => ({
            month: item.month,
            netWorth: Number(item.netWorth ?? item.assetValue ?? item.value ?? 0)
          }));
          setAssetGrowthData(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch asset growth:', err);
      }
    };

    const fetchStatistics = async () => {
      try {
        const res = await getDashboardStatsApi();
        if (res.data) {
          setStats({
            totalMembers: res.data.totalMembers ?? 0,
            trialPlan: res.data.trialPlan ?? 0,
            premiumPlan: res.data.premiumPlan ?? 0,
            give: res.data.give ?? 0,
            ask: res.data.ask ?? 0,
            expired: res.data.expired ?? 0,
            totalContacts: res.data.totalContacts ?? 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      }
    };

    fetchLatestMembers();
    fetchAssetGrowth();
    fetchStatistics();
  }, []);

  // Plan distribution for Pie Chart
  const isDataEmpty = stats.trialPlan === 0 && stats.premiumPlan === 0;

  const planDistributionData = isDataEmpty
    ? [{ name: 'No Members', value: 1, color: '#cbd5e1' }]
    : [
      { name: 'Trial Plan', value: stats.trialPlan, color: '#1e2e45' },
      { name: 'Premium Plan', value: stats.premiumPlan, color: '#b70805' },
    ];

  const formatYAxisTick = (val) => {
    if (val === 0) return '₹0';
    const maxVal = Math.max(...assetGrowthData.map(d => d.netWorth || 0), 0);
    if (maxVal >= 10000000) { // >= 1 Crore
      return `₹${(val / 10000000).toFixed(1)}Cr`;
    }
    if (maxVal >= 100000) { // >= 1 Lakh
      return `₹${(val / 100000).toFixed(1)}L`;
    }
    if (maxVal >= 1000) { // >= 1 Thousand
      return `₹${(val / 1000).toFixed(1)}K`;
    }
    return `₹${val}`;
  };

  return (
    <div className="glass-panel" style={{ padding: 'clamp(14px, 2vw, 24px)', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
      <div className="space-y-6">
        {/* Intro Header */}
        <div style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
          <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Dashboard</h2>
        </div>

        {/* KPI Cards Grid - Row 1 (3 Columns) */}
        <div className="kpi-grid-3">
          {/* Card 1: Total Members */}
          <div className="kpi-card-new card-glow-brand">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Members</span>
              <div className="kpi-icon-badge bg-brand-light">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold font-outfit text-slate-800 leading-tight">{stats.totalMembers}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Registered users</p>
            </div>
          </div>

          {/* Card 2: Trial Plan */}
          <div className="kpi-card-new card-glow-basic">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trial Plan</span>
              <div className="kpi-icon-badge bg-basic-light">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold font-outfit text-slate-800 leading-tight">{stats.trialPlan}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">7 Days Premium Trial active</p>
            </div>
          </div>

          {/* Card 3: Premium Plan */}
          <div className="kpi-card-new card-glow-premium">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Premium Plan</span>
              <div className="kpi-icon-badge bg-premium-light">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold font-outfit text-slate-800 leading-tight">{stats.premiumPlan}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Elite tier active</p>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid - Row 2 (4 Columns) */}
        <div className="kpi-grid-4" style={{ marginTop: '20px' }}>
          {/* Card 4: Give */}
          <div className="kpi-card-new card-glow-success">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Give</span>
              <div className="kpi-icon-badge bg-success-light">
                <Gift size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold font-outfit text-slate-800 leading-tight">{stats.give}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Active offers</p>
            </div>
          </div>

          {/* Card 5: Ask */}
          <div className="kpi-card-new card-glow-warning">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ask</span>
              <div className="kpi-icon-badge bg-warning-light">
                <HelpCircle size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold font-outfit text-slate-800 leading-tight">{stats.ask}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Open requests</p>
            </div>
          </div>

          {/* Card 6: Expired */}
          <div className="kpi-card-new card-glow-danger">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expired</span>
              <div className="kpi-icon-badge bg-expired-light">
                <CalendarClock size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold font-outfit text-slate-800 leading-tight">{stats.expired}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Subscriptions expiring</p>
            </div>
          </div>

          {/* Card 7: Total Contacts */}
          <div className="kpi-card-new card-glow-standard">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Contacts</span>
              <div className="kpi-icon-badge bg-info-light">
                <Phone size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold font-outfit text-slate-800 leading-tight">{stats.totalContacts}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Connected contacts</p>
            </div>
          </div>
        </div>

        {/* Visual Charts Grid */}
        <div className="grid gap-6 lg-grid-cols-3">
          {/* Wealth Curve Area Chart */}
          <div className="glass-panel p-5 lg-col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-outfit font-bold text-slate-800">Asset Growth Curve</h3>
              </div>
              <div className="flex items-center gap-1-5 px-2-5 py-1 bg-slate-100 text-xs font-bold text-[#0ea5e9]" style={{ borderRadius: '8px' }}>
                <Activity size={12} /> Live
              </div>
            </div>
            <div style={{ height: '288px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={assetGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b70805" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#b70805" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={formatYAxisTick}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}
                    itemStyle={{ color: '#0ea5e9', fontSize: '12px' }}
                    formatter={(value) => [formatCurrency(value), 'Total Capital']}
                  />
                  <Area type="monotone" dataKey="netWorth" stroke="#b70805" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Breakdown Pie Chart */}
          <div className="glass-panel p-5 space-y-4">
            <div>
              <h3 className="font-outfit font-bold text-slate-800">Membership Tier Shares</h3>
            </div>
            <div style={{ height: '256px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {planDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    formatter={(value, name) => [isDataEmpty ? 0 : value, name]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom 5 Members Details Table View */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-1-5 border-b">
            <div>
              <h3 className="font-outfit font-bold text-slate-800">Members Details</h3>
            </div>
          </div>
          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>S.No</th>
                    <th>Name</th>
                    <th>Mobile Number</th>
                    <th>Tier Plan</th>
                    <th>Status</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {latestMembers.map((member, index) => {
                    const planText = member.tierPlan || member.plan || '—';
                    const expiryDateText = member.expiryDate
                      ? member.expiryDate.split('T')[0]
                      : (member.membershipExpiryDate || '—');

                    return (
                      <tr key={member.id || member._id || index}>
                        <td className="text-slate-500 font-semibold">{index + 1}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="overflow-hidden">
                              <p className="font-semibold text-slate-800 truncate" style={{ fontSize: '13px' }}>{member.name}</p>
                              <p className="text-xs text-slate-400 font-medium truncate" style={{ fontSize: '12px' }}>{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-slate-500 font-medium">{member.mobileNumber || '—'}</td>
                        <td>
                          <span className={`badge badge-plan ${planText.toLowerCase().includes('gold') ? 'badge-gold' :
                              planText.toLowerCase().includes('platinum') ? 'badge-platinum' :
                                planText.toLowerCase().includes('diamond') ? 'badge-diamond' :
                                  planText.toLowerCase().includes('trial') ? 'badge-trial' :
                                    'badge-neutral'
                            }`} style={{ fontSize: '12px' }}>
                            {planText}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${member.status?.toLowerCase() === 'active'
                            ? 'badge-success'
                            : member.status?.toLowerCase() === 'pending'
                              ? 'badge-warning'
                              : 'badge-danger'
                            }`} style={{ padding: '2px 8px', fontSize: '12px' }}>
                            {member.status || 'Inactive'}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400 font-medium">{expiryDateText}</td>
                      </tr>
                    );
                  })}
                  {latestMembers.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-400 font-medium">
                        No members registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
