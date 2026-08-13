import React, { useState, useEffect } from 'react';
import { Select, Tooltip } from 'antd';
import { getMembersApi } from '../Api/membersApi';
import { Plus, HelpCircle, Trash2, Reply, ArrowLeft, Eye, X, Search, SlidersHorizontal } from 'lucide-react';
import AppDatePicker from '../components/AppDatePicker';

export default function AskPosts({ apiData, refreshData, currentPage, totalCount, itemsPerPage, onPageChange }) {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'add'
  const [errors, setErrors] = useState({});
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Expertise');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (apiData) {
      const normalized = apiData.map((item, idx) => {
        return {
          id: item._id || item.id,
          date: item.createdAt ? item.createdAt.split('T')[0] : '',
          author: item.memberName && item.memberName.trim() ? item.memberName : '—',
          contactName: item.contactName || '—',
          contactPhone: item.contactPhone || '—',
          keyword: item.keyword || '—',
          title: item.description || '',
          category: item.keyword || '—',
          status: 'Open',
          type: item.type
        };
      });
      setPosts(normalized);
    } else {
      setPosts([]);
    }

    const fetchMembersData = async () => {
      try {
        const res = await getMembersApi({ page: 0, limit: 0 });
        const rawData = res?.data || res || [];
        const membersList = Array.isArray(rawData) ? rawData : (rawData?.list || rawData?.members || []);
        const mapped = membersList.map(m => ({
          fullName: m.displayName || m.fullName || m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Unnamed',
          mobileNumber: m.mobileNumber || m.phone || ''
        }));
        setMembers(mapped);
      } catch (err) {
        console.error('Failed to load members for AskPosts:', err);
        setMembers([]);
      }
    };
    fetchMembersData();
  }, [apiData]);

  const getMobileNumber = (authorName) => {
    const member = members.find(m => m.fullName === authorName || m.name === authorName);
    return member ? member.mobileNumber : '—';
  };



  const getKeyword = (post) => {
    if (post.keyword) return post.keyword.toLowerCase();
    const titleLower = post.title.toLowerCase();
    if (titleLower.includes('real estate')) return 'realestate';
    if (titleLower.includes('templates')) return 'templates';
    if (titleLower.includes('tokyo') || titleLower.includes('tech')) return 'networking';
    if (titleLower.includes('cpa') || titleLower.includes('accountant') || titleLower.includes('tax')) return 'finance';
    if (titleLower.includes('dakar') || titleLower.includes('seed')) return 'startup';
    if (titleLower.includes('mexico') || titleLower.includes('retail')) return 'retail';
    return (post.category || 'general').toLowerCase();
  };

  const filteredPosts = posts.filter((post, index) => {
    const searchVal = searchTerm.trim().toLowerCase();
    const searchableText = [
      post.date,
      post.author,
      getMobileNumber(post.author),
      post.contactName,
      post.contactPhone,
      getKeyword(post),
      post.title,
      post.category,
      post.status
    ].join(' ').toLowerCase();

    const matchesSearch = !searchVal || searchableText.includes(searchVal);
    const matchesDate = !dateFilter || post.date === dateFilter;

    return matchesSearch && matchesDate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPosts = filteredPosts;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handleToggleStatus = (id) => {
    const updated = posts.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'Open' ? 'Closed' : 'Open';
        return { ...p, status: newStatus };
      }
      return p;
    });
    setPosts(updated);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to permanently delete this resource request?')) {
      const updated = posts.filter(p => p.id !== id);
      setPosts(updated);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const newErrors = {};
    if (!title.trim()) {
      newErrors.title = 'Request Title is Required';
    }
    if (!author.trim()) {
      newErrors.author = 'Author Name is Required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const newPost = {
      id: `ask_${Date.now()}`,
      title,
      author,
      category,
      status: 'Open',
      responsesCount: 0,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    setView('list');
  };

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          {/* <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4">
            <div className="search-wrapper flex-1">
                <Search size={16} className="input-icon-search" />
              <input
                type="text"
                placeholder="Search by name, phone, keyword, or Description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{ width: '100%' }}
              />
            </div>

            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
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
          </div> */}

          {/* Posts List */}
          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', whiteSpace: 'nowrap' }}>S.No</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Created By</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Contact Name</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Keyword</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPosts.map((post, index) => {
                    return (
                      <tr key={post.id}>
                        <td className="text-slate-500 font-semibold">{startIndex + index + 1}</td>
                        <td className="text-xs text-slate-400 font-medium" style={{ whiteSpace: 'nowrap' }}>
                          {post.date}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div className="font-bold text-slate-800 text-sm">{post.author}</div>
                          {/* <div className="text-xs text-slate-500 font-medium" style={{ marginTop: '2px' }}>
                            {getMobileNumber(post.author)}
                          </div> */}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div className="font-bold text-slate-800 text-sm">{post.contactName}</div>
                          <div className="text-xs text-slate-500 font-medium" style={{ marginTop: '2px' }}>
                            {post.contactPhone}
                          </div>
                        </td>
                        <td className="text-slate-700 font-medium">
                          <span className="badge badge-neutral text-xs py-0.5 px-2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {getKeyword(post)}
                          </span>
                        </td>
                        <td className="text-slate-700 text-sm font-medium" style={{ maxWidth: '280px' }}>
                          <Tooltip title={post.title || 'No description'}>
                            <div
                              style={{
                                maxWidth: '280px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {post.title || '—'}
                            </div>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedPosts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-500 font-medium">
                        No results found for your search
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
                  Showing {startIndex + 1} to {Math.min(startIndex + paginatedPosts.length, totalCount)} of {totalCount} requests
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
        <div className="glass-panel p-6 space-y-6 animate-in fade-in form-card">
          {/* Form Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="btn btn-secondary"
                style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Back to list"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 className="text-lg font-bold font-outfit text-slate-800" style={{ lineHeight: '1.2' }}>
                  Register Member Request
                </h3>
                <p className="text-xs text-slate-500 font-medium" style={{ marginTop: '2px' }}>
                  Provide details about the resources, mentorship, or support requests you wish to post.
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Request Title / Details</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Looking for a trust accountant in Switzerland"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Author / Member</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Member name..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <Select
                value={category}
                onChange={setCategory}
                style={{ height: '40px', width: '100%' }}
                options={[
                  { value: 'Expertise', label: 'Expertise' },
                  { value: 'Knowledge', label: 'Knowledge' },
                  { value: 'Co-Investment', label: 'Co-Investment' }
                ]}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setView('list')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-content modal-wide glass-panel p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header border-b pb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold font-outfit text-slate-800">Resource Request Details</h3>
              <button onClick={() => setSelectedPost(null)} className="btn-icon-only text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Request Title / Details</span>
                <div className="details-paragraph-box" style={{ minHeight: 'auto' }}>
                  <p className="text-slate-800 font-medium">{selectedPost.title}</p>
                </div>
              </div>

              <div className="metadata-grid-row">
                <div className="metadata-card">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Name</span>
                  <p className="text-slate-800 font-bold text-sm leading-tight">{selectedPost.author}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{getMobileNumber(selectedPost.author)}</p>
                </div>
                <div className="metadata-card">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Contact Person</span>
                  <p className="text-slate-800 font-bold text-sm leading-tight">{selectedPost.contactName}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedPost.contactPhone}</p>
                </div>
                <div className="metadata-card">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Category</span>
                  <p className="mt-1"><span className="badge badge-neutral text-xs py-0.5 px-2">{selectedPost.category || 'Expertise'}</span></p>
                </div>
                <div className="metadata-card">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Created Date</span>
                  <p className="text-slate-800 font-medium mt-1 text-sm">{selectedPost.date}</p>
                </div>
                <div className="metadata-card">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                  <p className="mt-1">
                    <span className={`badge text-xs py-0.5 px-2 ${selectedPost.status === 'Open' ? 'badge-success' : 'badge-neutral'}`}>
                      {selectedPost.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button onClick={() => setSelectedPost(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
