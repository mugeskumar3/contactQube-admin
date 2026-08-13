import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd';
import { Plus, Edit2, Trash2, Lock, Unlock, Calendar, Users, MapPin, Video, ArrowLeft, CheckCircle, XCircle, AlertCircle, Eye, X, Search, SlidersHorizontal, Image, ShieldAlert, Clock, ExternalLink, Copy, Tag, User, FileText, Globe, Check, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getActivitiesApi, createActivityApi, updateActivityApi, deleteActivityApi, getActivityParticipantsApi } from '../Api/activitiesApi';
import { getPlansApi } from '../Api/plansApi';
import { getMembersApi } from '../Api/membersApi';
import { uploadImageApi } from '../Api/imageApi';
import { IMAGE_BASE_URL } from '../config';
import AppDatePicker from '../components/AppDatePicker';
import { hasPermission } from '../utils/permission';

// Helper to convert legacy YYYY-MM-DD + timeStr (like "18:00 EST") into YYYY-MM-DDTHH:MM
const convertToDateTimeLocal = (dateStr, timeStr) => {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('T') || dateStr.endsWith('Z')) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      }
    }
  } catch (err) {
    console.error(err);
  }

  let datePart = dateStr;
  if (dateStr.includes('T')) {
    datePart = dateStr.split('T')[0];
  }
  let timePart = '00:00';
  if (timeStr) {
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (match) {
      timePart = `${match[1]}:${match[2]}`;
    }
  }
  return `${datePart}T${timePart}`;
};

// Helper: Convert any date string to IST (UTC+5:30) and return a readable string
const toIST = (dateStr) => {
  if (!dateStr) return '—';
  try {
    // Append Z if it's an ISO string without timezone info so Date() treats it as UTC
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateStr; // fallback
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

// getPlanName helper function moved inside component

const toISTDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
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

// Helper to format activity date for display in list table (date only, no time)
const formatActivityDateTime = (dateStr) => {
  if (!dateStr) return '—';
  // If it's a full ISO string (from server), convert to IST Date Only
  if (dateStr.includes('T') || dateStr.endsWith('Z')) {
    return toISTDateOnly(dateStr);
  }
  return dateStr;
};

const formatTimeRange = (start, end) => {
  if (!start || !end) return '';
  try {
    const sDate = new Date(start);
    const eDate = new Date(end);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return '';

    const formatTime = (date) => {
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const strHours = String(hours).padStart(2, '0');
      return `${strHours}:${minutes} ${ampm}`;
    };

    return `${formatTime(sDate)} - ${formatTime(eDate)}`;
  } catch {
    return '';
  }
};

const getDurationString = (start, end) => {
  if (!start || !end) return null;
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const diffMs = e - s;
    if (diffMs <= 0) return null;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours >= 24) {
      const days = Math.round(diffHours / 24);
      return `${days} Day${days > 1 ? 's' : ''}`;
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${mins} min${mins > 1 ? 's' : ''}`;
  } catch {
    return null;
  }
};

export default function Activities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [planOptions, setPlanOptions] = useState([]);

  const getPlanName = (planIdOrName) => {
    if (!planIdOrName) return '—';
    const found = planOptions.find(p => p.id === planIdOrName || p.name === planIdOrName);
    return found ? found.name : planIdOrName;
  };

  const [selectedActivityParticipants, setSelectedActivityParticipants] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  const [deletePopup, setDeletePopup] = useState({ show: false, activityId: null, activityTitle: '' });

  // Search & Filter state for modal participants
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantPlanFilter, setParticipantPlanFilter] = useState('All');

  // Date filter state
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [activitySearch, setActivitySearch] = useState('');

  const getCreatedPersonDisplay = (evt) => {
    const rawVal = evt.createdPersonName || evt.createdByName || evt.creatorName || evt.memberName || evt.adminName;
    if (rawVal) {
      if (typeof rawVal === 'object') {
        return rawVal.displayName || rawVal.fullName || `${rawVal.firstName || ''} ${rawVal.lastName || ''}`.trim() || '—';
      }
      if (String(rawVal).trim() !== '') {
        return String(rawVal);
      }
    }
    if (evt.createdBy) {
      const match = (members || []).find(m => m && (m.id === evt.createdBy || m._id === evt.createdBy));
      if (match) {
        return match.displayName || match.name || '—';
      }
    }
    const createdFromVal = evt.createdFrom;
    if (createdFromVal) {
      if (typeof createdFromVal === 'object') {
        return createdFromVal.displayName || createdFromVal.fullName || `${createdFromVal.firstName || ''} ${createdFromVal.lastName || ''}`.trim() || '—';
      }
      return String(createdFromVal);
    }
    return '—';
  };

  // API handles filtering — data as-is
  const filteredActivities = activities;

  const showActionColumn = useMemo(() => {
    return hasPermission('Activities', 'view') || hasPermission('Activities', 'edit') || hasPermission('Activities', 'delete');
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStartDate, filterEndDate, activitySearch]);

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = filteredActivities;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Form Fields
  const [title, setTitle] = useState('');
  const [host, setHost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('Online');
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [status, setStatus] = useState('Active');
  const [paymentMode, setPaymentMode] = useState('Free');
  const [paymentMethod, setPaymentMethod] = useState('—');
  const [fees, setFees] = useState(0);
  const [Location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [comments, setComments] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [banner, setBanner] = useState(null);       // preview URL (blob or server URL)
  const [bannerUrl, setBannerUrl] = useState('');    // final server URL to send in payload
  const [bannerPath, setBannerPath] = useState('');  // server path returned from upload
  const [bannerFileName, setBannerFileName] = useState(''); // filename from server
  const [bannerUploading, setBannerUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message, type = 'success') => {
    setToastMsg(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const normalizeActivity = (evt) => {
    const startDt = evt.startDate || evt.date || '';
    const endDt = evt.endDate || evt.date || '';
    const participantsList = Array.isArray(evt.participants)
      ? evt.participants
      : Array.isArray(evt.members)
        ? evt.members
        : [];
    const normalizedAttendeeCount =
      evt.attendeeCount ??
      evt.participantCount ??
      evt.participantsCount ??
      evt.totalParticipants ??
      evt.registeredParticipants ??
      participantsList.length ??
      0;

    // bannerImage from server is an object: { fileName, path, originalName }
    // Build full display URL from path
    const bannerObj = evt.bannerImage;
    let bannerDisplay = null;
    if (bannerObj && typeof bannerObj === 'object' && bannerObj.path) {
      bannerDisplay = `${IMAGE_BASE_URL}/${bannerObj.path}`;
    } else if (typeof bannerObj === 'string' && bannerObj) {
      bannerDisplay = bannerObj; // legacy string fallback
    } else if (evt.banner) {
      bannerDisplay = evt.banner;
    }
    const createdByDetails = evt.createdByDetails || {};
    const createdByName = `${createdByDetails.firstName || ''} ${createdByDetails.lastName || ''}`.trim();
    const resolvedName = (createdByDetails.name && typeof createdByDetails.name === 'object')
      ? (createdByDetails.name.displayName || `${createdByDetails.name.firstName || ''} ${createdByDetails.name.lastName || ''}`.trim())
      : (typeof createdByDetails.name === 'string' ? createdByDetails.name : '');

    const createdPersonName =
      resolvedName ||
      createdByDetails.displayName ||
      createdByDetails.fullName ||
      createdByName ||
      evt.createdByName ||
      evt.createdPersonName ||
      evt.creatorName ||
      evt.memberName ||
      evt.adminName ||
      '';

    return {
      ...evt,
      id: evt.id || evt._id,
      title: evt.name || evt.title || '',
      host: evt.host || 'Admin',
      startDate: startDt,
      endDate: endDt,
      type: evt.type === 'online' ? 'Online' : evt.type === 'activity' ? 'Offline' : (evt.type || 'Online'),
      attendeeCount: normalizedAttendeeCount,
      status: evt.status === 'active' ? 'Active' : evt.status === 'inactive' ? 'Inactive' : (evt.status || 'Active'),
      fees: evt.fees ?? 0,
      Location: evt.address || evt.Location || '',
      meetingLink: evt.meetingLink || '',
      comments: evt.description || evt.comments || '',
      createdPersonName,
      banner: bannerDisplay,
      // Keep raw bannerObj for re-submit
      bannerObj: (bannerObj && typeof bannerObj === 'object') ? bannerObj : { fileName: '', path: '', originalName: '' },
    };
  };


  const fetchActivities = useCallback(async ({ page = 0, limit = 10, search = '', startDate = '', endDate = '' } = {}) => {
    try {
      const res = await getActivitiesApi({ page, limit, search, startDate, endDate });
      const data = res?.data || [];
      const mapped = data.map(normalizeActivity);
      setActivities(mapped);
      setTotalCount(res?.total || mapped.length);
    } catch (err) {
      console.error('Failed to load activities from API:', err);
      setActivities([]);
      setTotalCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset page when search or date filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activitySearch, filterStartDate, filterEndDate]);

  // Re-fetch when page, search, or date filters change
  useEffect(() => {
    fetchActivities({
      page: currentPage - 1,
      limit: itemsPerPage,
      search: activitySearch,
      startDate: filterStartDate,
      endDate: filterEndDate
    });
  }, [currentPage, activitySearch, filterStartDate, filterEndDate, fetchActivities]);

  // Initial fetch on mount for members and plans
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // Fetch all members with a large limit
        const res = await getMembersApi({ page: 0, limit: 0 });
        const rawData = res?.data || res || [];
        const membersList = Array.isArray(rawData) ? rawData : (rawData?.list || rawData?.members || []);
        const normalized = membersList.map(m => {
          if (!m) return null;
          const displayName = m.displayName || m.fullName || m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Unnamed';
          return {
            ...m,
            id: m.id || m._id || String(Math.random()),
            name: displayName,
            mobileNumber: m.mobileNumber || m.phone || '',
            email: m.email || '',
            plan: m.plan || m.membershipPlan || '',
            planId: m.planId || ''
          };
        }).filter(Boolean);
        setMembers(normalized);
      } catch (err) {
        console.error('Failed to load members in Activities:', err);
        setMembers([]);
      }
    };
    fetchMembers();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await getPlansApi({ page: 0, limit: 0 });
      const data = res?.data || [];
      const planObjects = data.map(p => ({ id: p.id || p._id, name: p.name || p.planName })).filter(p => p.name);
      setPlanOptions(planObjects);
    } catch (err) {
      console.error('Failed to load plans in Activities:', err);
      setPlanOptions([]);
    }
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

  const fetchActivityParticipants = async (evtId, search = '', planId = '') => {
    if (!evtId) return;
    setIsLoadingParticipants(true);
    setParticipants([]); // Clear old list while loading
    try {
      fetchPlans();
      const params = {};
      if (search) params.search = search;
      if (planId && planId !== 'All') params.planId = planId;

      const res = await getActivityParticipantsApi(evtId, params);
      const data = res?.data || res || [];
      const rawParticipants = Array.isArray(data) ? data : (data.list || data.members || data.participants || []);
      const normalized = rawParticipants.map(m => {
        if (!m) return null;
        const displayName = m.displayName || m.fullName || m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Unnamed';
        return {
          ...m,
          id: m.id || m._id || String(Math.random()),
          name: displayName,
          mobileNumber: m.mobileNumber || m.phone || '',
          email: m.email || '',
          plan: m.plan || m.membershipPlan || '',
          planId: m.planId || ''
        };
      }).filter(Boolean);
      setParticipants(normalized);
    } catch (err) {
      console.error('Failed to fetch activity participants:', err);
      // Fallback to local members list
      setParticipants(members);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const getFilteredParticipants = () => {
    return participants;
  };

  useEffect(() => {
    if (selectedActivityParticipants) {
      const delayDebounceFn = setTimeout(() => {
        fetchActivityParticipants(
          selectedActivityParticipants.id || selectedActivityParticipants._id,
          participantSearch,
          participantPlanFilter
        );
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [participantSearch, participantPlanFilter, selectedActivityParticipants]);

  const isAdminCreatedActivity = (evt) => evt.createdFrom?.toLowerCase() === 'admin';

  const openAddForm = () => {
    setEditingActivity(null);
    setTitle('');
    setHost('Admin');
    setStartDate('');
    setEndDate('');
    setTime('');
    setType('Online');
    setAttendeeCount(0);
    setStatus('Active');
    setPaymentMode('Free');
    setPaymentMethod('—');
    setFees(0);
    setLocation('');
    setMeetingLink('');
    setComments('');
    setErrorMsg('');
    setBanner(null);
    setBannerUrl('');
    setBannerPath('');
    setBannerFileName('');
    setErrors({});
    setView('add');
  };

  const handleCopyLink = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    triggerToast('Link copied to clipboard!', 'success');
  };

  const openViewDetails = (evt) => {
    setEditingActivity(evt);
    setTitle(evt.title);
    setHost(evt.host);
    setStartDate(evt.startDate || evt.date || '');
    setEndDate(evt.endDate || evt.date || '');
    setTime(evt.time || '');
    const normalizedType = evt.type === 'Webinar' ? 'Online' : evt.type === 'Local Meetup' ? 'Offline' : (evt.type || 'Online');
    setType(normalizedType);
    setAttendeeCount(evt.attendeeCount);
    setStatus(evt.status || 'Active');
    setPaymentMode(evt.paymentMode || 'Free');
    setPaymentMethod(evt.paymentMethod || '—');
    setFees(evt.fees !== undefined ? evt.fees : 0);
    setLocation(evt.Location || '');
    setMeetingLink(evt.meetingLink || '');
    setComments(evt.comments || '');
    setErrorMsg('');
    setBanner(evt.banner || null);
    setBannerUrl(evt.banner || '');
    setBannerPath('');
    setBannerFileName('');
    setErrors({});
    setView('view');
    if (evt.id || evt._id) {
      fetchActivityParticipants(evt.id || evt._id);
    }
  };

  const openEditForm = (evt) => {
    setEditingActivity(evt);
    setTitle(evt.title);
    setHost(evt.host);
    setStartDate(convertToDateTimeLocal(evt.startDate || evt.date || '', evt.time || ''));
    setEndDate(convertToDateTimeLocal(evt.endDate || evt.date || '', evt.time || ''));
    setTime(evt.time || '');
    const normalizedType = evt.type === 'Webinar' ? 'Online' : evt.type === 'Local Meetup' ? 'Offline' : (evt.type || 'Online');
    setType(normalizedType);
    setAttendeeCount(evt.attendeeCount);
    setStatus(evt.status || 'Active');
    setPaymentMode(evt.paymentMode || 'Free');
    setPaymentMethod(evt.paymentMethod || '—');
    setFees(evt.fees !== undefined ? evt.fees : 0);
    setLocation(evt.Location || '');
    setMeetingLink(evt.meetingLink || '');
    setComments(evt.comments || '');
    setErrorMsg('');
    setBanner(evt.banner || null);
    setBannerUrl(evt.banner || '');
    setBannerPath('');
    setBannerFileName('');
    setErrors({});
    setView('edit');
  };

  const handleDeleteClick = (id, name) => {
    setDeletePopup({ show: true, activityId: id, activityTitle: name });
  };

  const confirmDeleteActivity = async () => {
    const id = deletePopup.activityId;
    if (!id) return;
    try {
      const res = await deleteActivityApi(id);
      const updated = activities.filter(e => e.id !== id && e._id !== id);
      setActivities(updated);
      triggerToast(res?.message || 'Success', 'success');
    } catch (err) {
      console.error('Failed to delete activity:', err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
    } finally {
      setDeletePopup({ show: false, activityId: null, activityTitle: '' });
    }
  };

  const handleToggleStatus = async (evt) => {
    const updatedStatus = (evt.status === 'Active' || evt.status === 'Upcoming') ? 'inactive' : 'active';
    try {
      const payload = {
        name: evt.title,
        host: evt.host,
        startDate: evt.startDate,
        endDate: evt.endDate,
        time: "",
        description: evt.comments || '',
        address: evt.Location || '',
        status: updatedStatus,
        fees: evt.fees,
        type: evt.type === 'Online' ? 'online' : 'activity',
        bannerImage: evt.bannerObj || { fileName: '', path: '', originalName: '' }
      };

      const updatedRes = await updateActivityApi(evt.id || evt._id, payload);
      const mapped = normalizeActivity(updatedRes.data);
      const updatedList = activities.map(e => (e.id === evt.id || e._id === evt._id) ? mapped : e);
      setActivities(updatedList);
      triggerToast(updatedRes.message || 'Success', 'success');
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local blob preview immediately
    const previewUrl = URL.createObjectURL(file);
    setBanner(previewUrl);
    setBannerUploading(true);
    setBannerUrl('');
    setBannerPath('');
    setBannerFileName('');

    try {
      const result = await uploadImageApi(file, 'activities');
      // Server returns: { originalName, fileName, path }
      // e.g. path = "activities/image_1782460618769.png"
      const serverPath = result?.path || result?.data?.path || '';
      const serverName = result?.fileName || result?.data?.fileName || file.name;
      // Build full accessible URL
      const fullUrl = serverPath ? `${IMAGE_BASE_URL}/${serverPath}` : previewUrl;
      setBannerUrl(fullUrl);
      setBannerPath(serverPath);
      setBannerFileName(serverName);
      setBanner(fullUrl);
    } catch (err) {
      console.error('Banner upload failed:', err);
      triggerToast(err.response?.data?.message || err.message || 'Error', 'error');
      setBanner(null);
      setBannerUrl('');
    } finally {
      setBannerUploading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const newErrors = {};
    if (!title.trim()) {
      newErrors.title = 'Name is Required';
    }
    if (!startDate.trim()) {
      newErrors.startDate = 'Start Date & Time is Required';
    }
    if (!endDate.trim()) {
      newErrors.endDate = 'End Date & Time is Required';
    }
    if (!Location.trim()) {
      newErrors.Location = 'Location is Required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (isNaN(attendeeCount) || attendeeCount < 0) {
      setErrorMsg('Please specify a positive participants.');
      return;
    }

    setIsSubmitting(true);

    const activityPayload = {
      name: title.trim(),
      host: host.trim() || 'Admin',
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      time: formatTimeRange(startDate, endDate) || "",
      description: comments.trim() || 'No description provided.',
      address: Location.trim(),
      status: status === 'Active' ? 'active' : 'inactive',
      fees: Number(fees),
      type: "event",
      // Server expects bannerImage as object: { fileName, path, originalName }
      bannerImage: bannerPath
        ? { fileName: bannerFileName, path: bannerPath, originalName: bannerFileName }
        : (editingActivity?.bannerObj || { fileName: '', path: '', originalName: '' }),
    };

    try {
      if (editingActivity) {
        // Edit via API (PUT)
        const updatedRes = await updateActivityApi(editingActivity.id || editingActivity._id, activityPayload);
        const mapped = normalizeActivity(updatedRes.data);
        const updatedList = activities.map(e => (e.id === editingActivity.id || e._id === editingActivity._id) ? mapped : e);
        setActivities(updatedList);
        triggerToast(updatedRes.message || 'Success', 'success');
      } else {
        // Add via API (POST)
        const newRes = await createActivityApi(activityPayload);
        const mapped = normalizeActivity(newRes.data);
        const updatedList = [...activities, mapped];
        setActivities(updatedList);
        triggerToast(newRes.message || 'Success', 'success');
      }
      setView('list');
    } catch (err) {
      console.error(err);
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
  };

  const isReadOnly = view === 'view';

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Activities List</h2>
            </div>
            <div className="flex items-center gap-3">
              {hasPermission('Banners', 'view') && (
                <button
                  onClick={() => navigate('/banners')}
                  className="btn btn-secondary gap-1.5"
                  style={{ fontSize: '14px' }}
                >
                  <Image size={16} style={{ marginRight: '6px' }} /> Manage Banners
                </button>
              )}
              {hasPermission('Activities', 'view') && hasPermission('Activities', 'add') && (
                <button
                  onClick={openAddForm}
                  className="btn btn-primary gap-1.5"
                  style={{ fontSize: '14px' }}
                >
                  <Plus size={16} /> Create Activity
                </button>
              )}
            </div>
          </div>

          {hasPermission('Activities', 'view') ? (
            <>
          {/* Filters & Search controls */}
          <div className="glass-panel p-4 flex flex-col sm-flex-row sm-items-center justify-between gap-4">
            {/* Search */}
            <div className="search-wrapper flex-1" style={{ position: 'relative' }}>
              <Search size={16} className="input-icon-search" />
              <input
                type="text"
                placeholder="Search"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="search-input"
                style={{ width: '100%', paddingRight: activitySearch ? '30px' : '36px' }}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <SlidersHorizontal size={14} /> Filters:
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">From:</span>
                <AppDatePicker
                  value={filterStartDate}
                  onChange={(v) => setFilterStartDate(v)}
                  showTime={false}
                  placeholder="Start date"
                  style={{ height: '36px', width: '160px', fontSize: '12px' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">To:</span>
                <AppDatePicker
                  value={filterEndDate}
                  onChange={(v) => setFilterEndDate(v)}
                  showTime={false}
                  minDate={filterStartDate || undefined}
                  placeholder="End date"
                  style={{ height: '36px', width: '160px', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Activities Table */}
          <div className="table-container">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', fontSize: '14px' }}>S.No</th>
                    <th style={{ fontSize: '14px' }}>Name</th>
                    <th style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>Created Person</th>
                    <th className="text-center" style={{ fontSize: '14px' }}>Participants</th>
                    <th style={{ fontSize: '14px' }}>Start Date</th>
                    <th style={{ fontSize: '14px' }}>End Date</th>
                    <th style={{ fontSize: '14px' }}>Location</th>
                    <th style={{ fontSize: '14px' }}>Status</th>
                    {showActionColumn && <th style={{ width: '150px', fontSize: '14px', textAlign: 'left' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivities.map((evt, index) => {
                    const canViewParticipants = isAdminCreatedActivity(evt);

                    return (
                      <tr key={evt.id}>
                        <td className="text-slate-500 font-semibold" style={{ fontSize: '14px' }}>{startIndex + index + 1}</td>
                        <td className="font-bold text-slate-800 text-sm" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>
                          <div className="flex items-center gap-2.5">
                            <span>{evt.title}</span>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-slate-700 font-semibold text-sm">
                              {getCreatedPersonDisplay(evt)}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center ${isAdminCreatedActivity(evt)
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                              {isAdminCreatedActivity(evt) ? 'Admin' : 'Member'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>
                          <span
                            onClick={() => {
                              if (!canViewParticipants) return;
                              setParticipantSearch('');
                              setParticipantPlanFilter('All');
                              setSelectedActivityParticipants(evt);
                            }}
                            className={`font-bold bg-slate-50 border border-slate-200/60 py-1.5 px-3 rounded-lg transition-all ${canViewParticipants
                              ? 'text-slate-800 hover:text-[#aaaaaaff] hover:underline'
                              : 'participant-count-disabled'
                              }`}
                            style={{ cursor: canViewParticipants ? 'pointer' : 'default' }}
                            title={canViewParticipants ? 'View participants' : 'Participants are available only for admin-created activities'}
                            aria-disabled={!canViewParticipants}
                          >
                            {evt.attendeeCount}
                          </span>
                        </td>
                        <td className="text-slate-500 font-medium" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {formatActivityDateTime(evt.startDate || evt.date, evt.time)}
                        </td>
                        <td className="text-slate-500 font-medium" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {formatActivityDateTime(evt.endDate || evt.date, evt.time)}
                        </td>
                        <td className="text-slate-650 font-medium text-sm" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {evt.Location || (evt.type === 'Webinar' || evt.type === 'Online' ? 'Online Zoom' : 'Grand Hall, NYC')}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 12px',
                            borderRadius: '20px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            background: evt.status === 'Active' ? '#f0fdf4' : '#fff1f2',
                            color: evt.status === 'Active' ? '#059669' : '#e11d48',
                            border: `1.5px solid ${evt.status === 'Active' ? '#bbf7d0' : '#fecdd3'}`,
                          }}>
                            {evt.status}
                          </span>
                        </td>
                        {showActionColumn && (
                          <td style={{ textAlign: 'left' }}>
                            <div className="flex items-center justify-start gap-2">
                              {hasPermission('Activities', 'view') && <button
                                onClick={() => openViewDetails(evt)}
                                className="btn-icon-only text-[#1e2e45] hover:text-[#aaaaaaff]"
                                title="View Activity Details"
                              >
                                <Eye size={16} />
                              </button>}
                              {hasPermission('Activities', 'edit') && (() => {
                                const isCompleted = evt.endDate ? new Date(evt.endDate) < new Date() : false;
                                const isEditDisabled = !canViewParticipants || isCompleted;
                                return (
                                  <button
                                    disabled={isEditDisabled}
                                    onClick={() => openEditForm(evt)}
                                    className={`btn-icon-only text-slate-500 hover:text-[#1e2e45] ${!isEditDisabled
                                      ? 'text-slate-800 hover:text-[#aaaaaaff] cursor-pointer hover:underline'
                                      : 'participant-count-disabled'
                                      }`}
                                    title={!canViewParticipants
                                      ? "Edit is available only for admin-created activities"
                                      : isCompleted
                                        ? "Edit is disabled for completed activities"
                                        : "Edit Activity"}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                );
                              })()}
                              {hasPermission('Activities', 'delete') && <button
                                disabled={!canViewParticipants}
                                onClick={() => handleDeleteClick(evt.id || evt._id, evt.title)}
                                className={`btn-icon-only text-rose-500 hover:text-rose-700 ${canViewParticipants
                                  ? 'text-slate-800 hover:text-[#aaaaaaff] cursor-pointer hover:underline'
                                  : 'participant-count-disabled'
                                  }`}
                                title={canViewParticipants ? "Delete Activity" : "Delete is available only for admin-created activities"}
                              >
                                <Trash2 size={16} />
                              </button>}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {paginatedActivities.length === 0 && (
                    <tr>
                      <td colSpan={showActionColumn ? 9 : 8} className="text-center py-8 text-slate-500 font-medium">
                        {activities.length === 0 ? "No platform activities scheduled." : "No activities found matching the selected dates."}
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
                  Showing {startIndex + 1} to {Math.min(startIndex + paginatedActivities.length, totalCount)} of {totalCount} profiles
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
              <h3 className="text-lg font-bold text-slate-800 font-outfit">Activities Access Restricted</h3>
              <p className="text-sm text-slate-500 max-w-md">
                You do not have permission to view Activities. Please use the <span className="font-semibold text-slate-700">Manage Banners</span> button above to access Banners.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in form-card">
          {/* Form Header for Add/Edit */}
          {!isReadOnly && (
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
                  {hasPermission('Activities', 'view') && (
                    <h3 className="text-lg font-bold font-outfit text-slate-800" style={{ lineHeight: '1.2' }}>
                      {view === 'add' ? 'Create new activity' : 'Edit Activity Details'}
                    </h3>
                  )}
                </div>
              </div>
            </div>
          )}

          {isReadOnly ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Top Title & Close Header */}
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
                      View Platform Activity Details
                    </h3>
                  </div>
                </div>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  background: status === 'Active' ? '#f0fdf4' : '#fff1f2',
                  color: status === 'Active' ? '#059669' : '#e11d48',
                  border: `1.5px solid ${status === 'Active' ? '#bbf7d0' : '#fecdd3'}`,
                }}>
                  {status}
                </span>
              </div>

              {/* Banner Image Preview (Centered if present) */}
              {banner && (
                <div className="flex justify-center my-2">
                  <div
                    style={{
                      maxWidth: '550px',
                      width: '100%',
                      maxHeight: '260px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      background: '#f8fafc'
                    }}
                  >
                    <img
                      src={banner}
                      alt={title || 'Activity Banner'}
                      style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                </div>
              )}

              {/* Basic Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 font-outfit border-b pb-2" style={{ margin: 0 }}>
                  Basic Information
                </h4>

                <div className="grid grid-2-cols gap-4">
                  <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Activity Name</span>
                    <p className="text-slate-800 font-bold text-base leading-tight">{title || '—'}</p>
                  </div>

                  <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Posted By / Host</span>
                    <p className="text-slate-800 font-bold text-base leading-tight">{host || 'Admin'}</p>
                  </div>
                </div>

                <div className="grid grid-2-cols gap-4">
                  <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event Format</span>
                    <p className="text-slate-800 font-semibold text-sm leading-tight flex items-center gap-1.5">
                      {type === 'Online' ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-emerald-500" />}
                      {type === 'Online' ? 'Online Event' : 'In-Person Event'}
                    </p>
                  </div>

                  <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registration Fees</span>
                    <p className="text-slate-800 font-bold text-sm leading-tight">
                      {Number(fees) > 0 ? `₹${fees}` : 'Free'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule & Location Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 font-outfit border-b pb-2" style={{ margin: 0 }}>
                  Schedule & Location
                </h4>

                <div className="grid grid-2-cols gap-4">
                  <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date & Time</span>
                    <p className="text-slate-800 font-semibold text-sm leading-tight">{toIST(startDate)}</p>
                  </div>

                  <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date & Time</span>
                    <p className="text-slate-800 font-semibold text-sm leading-tight">{toIST(endDate)}</p>
                  </div>
                </div>

                <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {type === 'Online' ? 'Meeting Link' : 'Location / Venue'}
                  </span>
                  <p className="text-slate-800 font-semibold text-sm leading-tight" style={{ wordBreak: 'break-all' }}>
                    {type === 'Online' ? (meetingLink || 'No meeting link provided.') : (Location || 'No location specified.')}
                  </p>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 font-outfit border-b pb-2" style={{ margin: 0 }}>
                  Description
                </h4>
                <div className="metadata-card space-y-1.5" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p className="text-slate-700 text-sm leading-relaxed" style={{ whiteSpace: 'pre-line', margin: 0 }}>
                    {comments || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="btn btn-secondary"
                  style={{ minWidth: '100px' }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4" style={{ maxWidth: '800px' }}>
              <div className="form-group flex flex-col">
                <label className="form-label">Activity Banner Image</label>
                <div
                  className="banner-upload-container"
                  onClick={() => !bannerUploading && document.getElementById('banner-upload').click()}
                  style={{
                    cursor: bannerUploading ? 'not-allowed' : 'pointer',
                    opacity: bannerUploading ? 0.85 : 1,
                    height: 'auto',
                    aspectRatio: '16/9',
                    maxWidth: '500px',
                    width: '100%',
                    margin: '0 auto'
                  }}
                >
                  {bannerUploading ? (
                    /* Uploading spinner state */
                    <div className="flex flex-col items-center text-center gap-3">
                      <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Uploading banner...</p>
                        <p className="text-xs text-slate-400 mt-1">Please wait while we upload your image</p>
                      </div>
                    </div>
                  ) : banner ? (
                    <div className="banner-preview-wrapper">
                      <img src={banner} alt="Banner Preview" className="banner-preview-img" style={{ objectFit: 'cover' }} />
                      <div className="banner-overlay" style={{ display: 'flex', flexDirection: 'row', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-3 py-1.5"
                          style={{ background: '#ffffff', color: '#1e293b', border: 'none', fontWeight: 'bold' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('banner-upload').click();
                          }}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger text-xs px-3 py-1.5"
                          style={{ fontWeight: 'bold', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBanner(null);
                            setBannerUrl('');
                            setBannerPath('');
                            setBannerFileName('');
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-slate-450" style={{ display: 'inline-flex', padding: '12px', background: 'white', borderRadius: '50%', border: '1px solid #e2e8f0' }}>
                        <svg style={{ width: '24px', height: '24px', stroke: '#64748b' }} viewBox="0 0 24 24" fill="none">
                          <path d="M15 8l-2.5-2.5L10 8m-6 8l3.5-3.5 4.5 4.5m4.5-4.5L20 16M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Click to upload activity banner</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, or WEBP (Recommended: 1200x630px)</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    id="banner-upload"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                    disabled={bannerUploading}
                  />
                </div>
              </div>


              <div className="grid grid-2-cols gap-4">
                <div className="form-group">
                  <label className="form-label">Name <span className="text-rose-500">*</span></label>
                  <div className="input-error-wrapper">
                    <input
                      type="text"
                      required
                      disabled={isReadOnly}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (errors.title) {
                          setErrors(prev => {
                            const clone = { ...prev };
                            delete clone.title;
                            return clone;
                          });
                        }
                      }}
                      placeholder="Enter Name"
                      className={`form-input ${errors.title ? 'is-invalid' : ''}`}
                    />
                  </div>
                  {errors.title && (
                    <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                      {errors.title}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-2-cols gap-4">
                <div className="form-group">
                  <label className="form-label">Start Date &amp; Time <span className="text-rose-500">*</span></label>
                  <div className="input-error-wrapper">
                    <AppDatePicker
                      showTime
                      disabled={isReadOnly}
                      value={startDate}
                      minDate={editingActivity ? undefined : new Date().toISOString()}
                      onChange={(val) => {
                        setStartDate(val);
                        // If end date is before new start date, clear end date
                        if (endDate && val && endDate < val) {
                          setEndDate('');
                          setErrors(prev => ({ ...prev, endDate: 'End date must be after start date' }));
                        }
                        if (errors.startDate) {
                          setErrors(prev => { const c = { ...prev }; delete c.startDate; return c; });
                        }
                      }}
                      hasError={!!errors.startDate}
                      placeholder="Select start date & time"
                    />
                  </div>
                  {errors.startDate && (
                    <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                      {errors.startDate}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">End Date &amp; Time <span className="text-rose-500">*</span></label>
                  <div className="input-error-wrapper">
                    <AppDatePicker
                      showTime
                      disabled={isReadOnly || !startDate}
                      value={endDate}
                      minDate={startDate || undefined}
                      onChange={(val) => {
                        setEndDate(val);
                        if (errors.endDate) {
                          setErrors(prev => { const c = { ...prev }; delete c.endDate; return c; });
                        }
                      }}
                      hasError={!!errors.endDate}
                      placeholder={!startDate ? 'Choose start date first' : 'Select end date & time'}
                    />
                  </div>
                  {errors.endDate && (
                    <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                      {errors.endDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-2-cols gap-4">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    disabled={isReadOnly}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter your Description here..."
                    className="form-input"
                    rows="2"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location <span className="text-rose-500">*</span></label>
                  <div className="input-error-wrapper">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={Location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        if (errors.Location) {
                          setErrors(prev => {
                            const clone = { ...prev };
                            delete clone.Location;
                            return clone;
                          });
                        }
                      }}
                      placeholder="Enter Location"
                      className={`form-input ${errors.Location ? 'is-invalid' : ''}`}
                      required
                    />
                  </div>
                  {errors.Location && (
                    <span className="form-error-message animate-in fade-in" style={{ paddingLeft: 0, color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                      {errors.Location}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-2-cols gap-4">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <Select
                    disabled={isReadOnly}
                    value={status}
                    onChange={setStatus}
                    style={{ height: '40px', width: '100%' }}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fees</label>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="0"
                    className="form-input"
                    min="0"
                  />
                </div>
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
                >
                  Save Activity
                </button>
              </div>
            </form>
          )}
        </div>
      )
      }

      {
        selectedActivityParticipants && createPortal(
          <div className="modal-overlay" onClick={() => setSelectedActivityParticipants(null)}>
            <div className="modal-content modal-wide glass-panel p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header border-b pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold font-outfit text-slate-800">Activity Participants</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedActivityParticipants.title}</p>
                </div>
                <button onClick={() => setSelectedActivityParticipants(null)} className="btn-icon-only text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Filter & Search controls */}
              <div className="flex flex-col sm-flex-row gap-3 justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                {/* Search */}
                <div className="search-wrapper flex-1" style={{ width: '100%' }}>
                  <Search size={14} className="input-icon-search" />
                  <input
                    type="text"
                    placeholder="Search participants by name, mobile, email..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', height: '32px', fontSize: '12.5px', paddingLeft: '32px' }}
                  />
                </div>

                {/* Plan filter */}
                <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                  <span className="text-xs font-semibold text-slate-500">Plan:</span>
                  <Select
                    value={participantPlanFilter}
                    onChange={setParticipantPlanFilter}
                    style={{ height: '32px', minWidth: '120px' }}
                    options={[
                      { value: 'All', label: 'All Plans' },
                      ...planOptions.map(p => ({ value: p.id, label: p.name }))
                    ]}
                  />
                </div>
              </div>

              {isLoadingParticipants ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b70805]" />
                  <p className="text-xs text-slate-500 font-semibold">Loading participants list...</p>
                </div>
              ) : (
                <>
                  <div className="table-container max-h-96 overflow-y-auto">
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>S.No</th>
                            <th>Name</th>
                            <th>Mobile Number</th>
                            <th>Email</th>
                            <th>Plan</th>
                            <th>Payment Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredParticipants().map((m, index) => (
                            <tr key={m.id || index}>
                              <td className="text-slate-500 font-semibold">{index + 1}</td>
                              <td className="font-bold text-slate-700" style={{ whiteSpace: 'nowrap' }}>{m.name}</td>
                              <td className="text-slate-650 font-semibold" style={{ whiteSpace: 'nowrap' }}>{m.mobileNumber}</td>
                              <td className="text-slate-500 text-xs">{m.email}</td>
                              <td>
                                <span className={`badge badge-plan ${getPlanBadgeClass(getPlanName(m.plan || m.membershipPlan || m.planId))}`}>
                                  {getPlanName(m.plan || m.membershipPlan || m.planId)}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  String(m.paymentStatus || '').toUpperCase() === 'PAID' ? 'badge-success' :
                                  String(m.paymentStatus || '').toUpperCase() === 'PENDING' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                  {m.paymentStatus || 'UNPAID'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {getFilteredParticipants().length === 0 && (
                            <tr>
                              <td colSpan="6" className="text-center py-6 text-slate-500">
                                No registered participants found matching search/filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-xs text-slate-400 font-medium">
                      Total participants: {getFilteredParticipants().length}
                    </span>
                    <button onClick={() => setSelectedActivityParticipants(null)} className="btn btn-secondary">
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )
      }
      {
        showToast && createPortal(
          <div className="toast-container">
            <div className={`custom-toast ${toastType}`} style={{ background: '#ffffff', backdropFilter: 'none', WebkitBackdropFilter: 'none', border: '1px solid #e2e8f0' }}>
              <div className="toast-icon-wrapper">
                {toastType === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              </div>
              <span className="toast-message">{toastMsg}</span>
            </div>
          </div>,
          document.body
        )
      }

      {/* Delete Confirmation Popup */}
      {
        deletePopup.show && createPortal(
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
                Delete Activity
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
                Are you sure you want to delete the activity <strong style={{ color: '#1e293b' }}>"{deletePopup.activityTitle}"</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setDeletePopup({ show: false, activityId: null, activityTitle: '' })}
                  className="btn btn-secondary"
                  style={{ fontSize: '14px', minWidth: '100px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteActivity}
                  style={{
                    fontSize: '14px', minWidth: '100px',
                    padding: '9px 20px', borderRadius: '10px',
                    background: '#e11d48', color: '#fff',
                    border: 'none', fontWeight: 700, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </div >
  );
}
