import React, { useState, useEffect, useCallback } from 'react';
import GivePosts from './GivePosts';
import AskPosts from './AskPosts';
import { getInteractionsApi } from '../Api/interactionsApi';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import AppDatePicker from '../components/AppDatePicker';

export default function Interactions() {
  const [activeTab, setActiveTab] = useState('give'); // 'give' | 'ask'
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Pagination state
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const fetchInteractions = useCallback(async ({ page = 0, limit = 10, type, search = '', date = '' } = {}) => {
    try {
      setLoading(true);
      const res = await getInteractionsApi({ page, limit, type, search, date });
      setInteractions(res.data || []);
      setTotalCount(res.total || (res.data || []).length);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch interactions:', err);
      setError(err.message || 'Failed to fetch interactions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset page when tab, search, or date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, dateFilter]);

  // Re-fetch when page, tab, search, or date changes
  useEffect(() => {
    fetchInteractions({
      page: currentPage - 1,
      limit: itemsPerPage,
      type: activeTab,
      search,
      date: dateFilter
    });
  }, [currentPage, activeTab, search, dateFilter, fetchInteractions]);

  return (
    <div className="space-y-6">
      {/* Header with Tab Switcher */}
      <div className="flex flex-col sm-flex-row sm-items-center justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Interactions</h2>
        </div>
        <div style={{
          position: 'relative',
          display: 'flex',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '30px',
          border: '1px solid #e2e8f0',
          width: '280px',
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
            transform: activeTab === 'give' ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 0
          }} />
          <button
            onClick={() => setActiveTab('give')}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'give' ? 'bold' : '500',
              fontSize: '14px',
              fontFamily: 'Outfit, sans-serif',
              color: activeTab === 'give' ? '#ffffff' : '#64748b',
              transition: 'color 0.2s ease'
            }}
          >
            Give
          </button>
          <button
            onClick={() => setActiveTab('ask')}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'ask' ? 'bold' : '500',
              fontSize: '14px',
              fontFamily: 'Outfit, sans-serif',
              color: activeTab === 'ask' ? '#ffffff' : '#64748b',
              transition: 'color 0.2s ease'
            }}
          >
            Ask
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4 animate-in fade-in">
        {/* Search */}
        <div className="search-wrapper flex-1" style={{ width: '100%' }}>
          <Search size={16} className="input-icon-search" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'give' ? 'give' : 'ask'} posts by name, keyword, contact, or description`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Date Filter */}
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
        </div>
      </div>

      {/* Content */}
      <div className="activity-content mt-4 animate-in fade-in">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-slate-500 font-medium animate-pulse">Loading interactions...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-500 font-medium">{error}</div>
        ) : (
          activeTab === 'give' ? (
            <GivePosts
              apiData={interactions}
              currentPage={currentPage}
              totalCount={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              refreshData={() => fetchInteractions({ page: currentPage - 1, limit: itemsPerPage, type: 'give', search, date: dateFilter })}
            />
          ) : (
            <AskPosts
              apiData={interactions}
              currentPage={currentPage}
              totalCount={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              refreshData={() => fetchInteractions({ page: currentPage - 1, limit: itemsPerPage, type: 'ask', search, date: dateFilter })}
            />
          )
        )}
      </div>
    </div>
  );
}
