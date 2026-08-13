import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Select } from 'antd';
import {
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Calendar,
  Link as LinkIcon,
  ImageIcon,
  GripVertical,
  Loader2,
  Sparkles,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  Search,
  UploadCloud
} from 'lucide-react';
import { getBannersApi, createBannerApi, deleteBannerApi, updateBannerOrderApi } from '../Api/bannerApi';
import { uploadImageApi } from '../Api/imageApi';
import { IMAGE_BASE_URL } from '../config';
import AppDatePicker from '../components/AppDatePicker';
import { hasPermission } from '../utils/permission';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableBannerItem({ banner, onDelete, isOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id || banner._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    borderRadius: '16px'
  };

  const imageUrl = banner.bannerImage?.path
    ? `${IMAGE_BASE_URL}/${banner.bannerImage.path}`
    : (typeof banner.bannerImage === 'string' ? banner.bannerImage : '');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  let dateRangeStr = '';
  if (banner.startDate && banner.endDate) {
    dateRangeStr = `${formatDate(banner.startDate)} - ${formatDate(banner.endDate)}`;
  } else if (banner.startDate) {
    dateRangeStr = `${formatDate(banner.startDate)} - Indefinite`;
  } else if (banner.endDate && banner.createdAt) {
    dateRangeStr = `${formatDate(banner.createdAt)} - ${formatDate(banner.endDate)}`;
  } else if (banner.createdAt) {
    dateRangeStr = formatDate(banner.createdAt);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col justify-between overflow-hidden bg-white transition-all duration-300 border ${isOverlay
        ? 'shadow-2xl border-primary/30 scale-105 ring-2 ring-primary/10'
        : 'shadow-sm hover:shadow-md border-slate-200/85'
        }`}
    >
      {/* Banner Preview Area (fill width) - acts as the drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="relative overflow-hidden bg-slate-50 flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: '16/9', width: '100%', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="App Banner"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="text-slate-400 flex flex-col items-center gap-2">
            <ImageIcon size={32} strokeWidth={1.5} className="text-slate-300" />
            <span className="text-xs font-medium">No preview</span>
          </div>
        )}
      </div>

      {/* Footer / Actions (Date on left corner, Delete button on right) */}
      <div className="p-4 bg-white flex justify-between items-center border-t border-slate-100">
        <div>
          {dateRangeStr && (
            <span className="text-slate-500 font-semibold" style={{ fontSize: '13px' }}>
              {dateRangeStr}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('Banners', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(banner);
              }}
              className="btn gap-1.5 rounded-lg flex items-center transition-all duration-200"
              style={{
                padding: '8px 16px',
                fontSize: '13.5px',
                height: '36px',
                background: '#093a6c',
                color: '#fff',
                border: 'none',
                fontWeight: '600'
              }}
            >
              <Trash2 size={14} style={{ marginRight: '6px' }} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Banners() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'add'
  const [activeDragId, setActiveDragId] = useState(null);

  // Toast notifications state
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
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerImageObj, setBannerImageObj] = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [link, setLink] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(1);
  const [errors, setErrors] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getBannersApi();
      const rawData = res?.data || res || [];
      const bannersList = Array.isArray(rawData) ? rawData : (rawData?.list || []);
      const sorted = [...bannersList].sort((a, b) => (a.order || 0) - (b.order || 0));
      setBanners(sorted);
    } catch (err) {
      console.error('Failed to load banners:', err);
      triggerToast(err.message || 'Failed to load banners', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast('Please upload a valid image file', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setBannerPreview(previewUrl);
    setBannerUploading(true);
    setBannerImageObj(null);

    try {
      const result = await uploadImageApi(file, 'banners');
      const serverPath = result?.path || result?.data?.path || '';
      const serverName = result?.fileName || result?.data?.fileName || file.name;
      setBannerImageObj({
        fileName: serverName,
        path: serverPath,
        originalName: file.name
      });
      setBannerPreview(`${IMAGE_BASE_URL}/${serverPath}`);
    } catch (err) {
      console.error('Image upload failed:', err);
      triggerToast(err.message || 'Image upload failed', 'error');
      setBannerPreview(null);
    } finally {
      setBannerUploading(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex(b => (b.id || b._id) === active.id);
    const newIndex = banners.findIndex(b => (b.id || b._id) === over.id);

    const reordered = arrayMove(banners, oldIndex, newIndex);

    const updatedWithOrder = reordered.map((banner, index) => ({
      ...banner,
      order: index + 1
    }));
    setBanners(updatedWithOrder);

    try {
      const payload = updatedWithOrder.map((item) => ({
        id: item.id || item._id,
        order: item.order
      }));
      await updateBannerOrderApi(payload);
      triggerToast('Banner order updated successfully', 'success');
    } catch (err) {
      console.error('Failed to update order:', err);
      triggerToast(err.message || 'Failed to update order', 'error');
      fetchBanners();
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!bannerImageObj) {
      newErrors.image = 'Banner image is required';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (startDate && new Date(startDate) < now) {
      newErrors.startDate = 'Start date cannot be in the past';
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date cannot be before start date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      bannerImage: bannerImageObj,
      link: link.trim() || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      isActive: Number(isActive)
    };

    try {
      await createBannerApi(payload);
      triggerToast('Banner added successfully', 'success');
      setView('list');
      setBannerPreview(null);
      setBannerImageObj(null);
      setLink('');
      setStartDate('');
      setEndDate('');
      setIsActive(1);
      fetchBanners();
    } catch (err) {
      console.error('Failed to create banner:', err);
      triggerToast(err.message || 'Failed to add banner', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deletePopup, setDeletePopup] = useState({ show: false, banner: null });

  const confirmDelete = async () => {
    const bannerId = deletePopup.banner?.id || deletePopup.banner?._id;
    if (!bannerId) return;

    try {
      await deleteBannerApi(bannerId);
      triggerToast('Banner deleted successfully', 'success');
      setDeletePopup({ show: false, banner: null });
      fetchBanners();
    } catch (err) {
      console.error('Failed to delete banner:', err);
      triggerToast(err.message || 'Failed to delete banner', 'error');
    }
  };

  const activeDraggingBanner = useMemo(() => {
    if (!activeDragId) return null;
    return banners.find(b => (b.id || b._id) === activeDragId);
  }, [activeDragId, banners]);

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/activities')}
                className="btn btn-secondary"
                style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Back to Activities"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-outfit text-slate-800">Banners List</h2>
              </div>
            </div>
            {hasPermission('Banners', 'add') && (
              <button
                onClick={() => setView('add')}
                className="btn btn-primary flex items-center justify-center transition-all duration-200"
                style={{
                  fontSize: '14px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <Plus size={16} style={{ marginRight: '6px' }} /> Add Banner
              </button>
            )}
          </div>

          {/* Grid layout with Drag and Drop */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <Loader2 className="animate-spin text-primary" size={36} strokeWidth={2} />
              <span className="text-sm font-medium text-slate-500">Retrieving banner content...</span>
            </div>
          ) : banners.length === 0 ? (
            <div className="glass-panel text-center flex flex-col items-center justify-center" style={{ padding: '60px 40px', borderRadius: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <ImageIcon size={28} className="text-slate-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-outfit" style={{ marginBottom: '8px' }}>No banners found</h3>
              <p className="text-sm text-slate-500 max-w-sm" style={{ marginBottom: '24px', lineHeight: '1.5' }}>
                Create promotional banners to display on the mobile app home screen.
              </p>
              {hasPermission('Banners', 'add') && (
                <button
                  onClick={() => setView('add')}
                  className="btn btn-primary flex items-center justify-center transition-all duration-200"
                  style={{
                    fontSize: '14px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: '600'
                  }}
                >
                  <Plus size={15} style={{ marginRight: '6px' }} /> Upload Banner
                </button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={banners.map(b => b.id || b._id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-3-cols gap-6">
                  {banners.map((banner) => (
                    <SortableBannerItem
                      key={banner.id || banner._id}
                      banner={banner}
                      onDelete={(b) => setDeletePopup({ show: true, banner: b })}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay adjustScale={true}>
                {activeDraggingBanner ? (
                  <SortableBannerItem
                    banner={activeDraggingBanner}
                    onDelete={() => { }}
                    isOverlay={true}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      ) : (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>

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
                  Create New Banner
                </h3>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="form-group flex flex-col">
              <label className="form-label">Banner Image *</label>
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
                  <div className="flex flex-col items-center text-center gap-3">
                    <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Uploading banner image...</p>
                    </div>
                  </div>
                ) : bannerPreview ? (
                  <div className="banner-preview-wrapper">
                    <img src={bannerPreview} alt="Banner Preview" className="banner-preview-img" style={{ objectFit: 'cover' }} />
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
                        className="btn text-xs px-3 py-1.5"
                        style={{ fontWeight: 'bold', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBannerPreview(null);
                          setBannerImageObj(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center gap-2">
                    <UploadCloud size={32} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Upload Banner Image</p>
                      <p className="text-xs text-slate-400 mt-1">Recommended dimension: 1200 x 675 px (16:9 ratio)</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="banner-upload"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={bannerUploading}
              />
              {errors.image && <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12} /> {errors.image}</p>}
            </div>

            {/* Redirect Link & Status (Two inputs per row) */}
            <div className="grid grid-2-cols gap-4">
              <div className="form-group">
                <label className="form-label">Redirect Link (Hyperlink)</label>
                <input
                  type="url"
                  placeholder="https://example.com/promotion"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <Select
                  value={isActive}
                  onChange={(val) => setIsActive(val)}
                  style={{ height: '40px', width: '100%' }}
                  options={[
                    { value: 1, label: 'Active' },
                    { value: 0, label: 'Inactive' }
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-2-cols gap-4">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <AppDatePicker
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  placeholder="Immediate start"
                  minDate={todayStr}
                  style={{ height: '40px' }}
                />
                {errors.startDate && <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12} /> {errors.startDate}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">End Date (Expiry)</label>
                <AppDatePicker
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  placeholder="Indefinite duration"
                  minDate={startDate || todayStr}
                  style={{ height: '40px' }}
                />
                {errors.endDate && <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12} /> {errors.endDate}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => { setView('list'); setErrors({}); }}
                className="btn btn-secondary"
                disabled={isSubmitting}
                style={{ minWidth: '100px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || bannerUploading}
                style={{ minWidth: '100px' }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Popup Portal (matches Events.jsx perfectly) */}
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
              Delete Banner
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to delete this banner? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletePopup({ show: false, banner: null })}
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
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast notifications */}
      {showToast && createPortal(
        <div className="toast-container" style={{ zIndex: 10005 }}>
          <div className={`custom-toast ${toastType}`}>
            <div className="toast-icon-wrapper">
              {toastType === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </div>
            <span className="toast-message font-medium">{toastMsg}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
