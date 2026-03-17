"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminAPI, tagsAPI } from "@/lib/api";
import {
  Package, Bell, Tags, ShoppingCart, Plus, Trash2, Edit,
  LayoutDashboard, ChevronRight, Search, Loader2, X, Save, Truck,
  Image, GripVertical, Eye, EyeOff, Star, Calendar, Users, MessageSquare, Upload, Settings
} from "lucide-react";
import SiteSettingsTab from "./SiteSettingsTab";

// ═══════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("products");
  const [items, setItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUpdating, setTrackingUpdating] = useState(false);
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [bannersSaving, setBannersSaving] = useState(false);
  const [bannerImageUploading, setBannerImageUploading] = useState(null);
  const [serverBannerImages, setServerBannerImages] = useState([]);
  const [showBannerImagePicker, setShowBannerImagePicker] = useState(null);
  const [bannerImagePickerLoading, setBannerImagePickerLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/auth/login");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadTags();
    }
  }, [activeTab, isAdmin]);

  const loadTags = async () => {
    try {
      const res = await tagsAPI.getAll();
      setTags(res.data || []);
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let res;
      switch (activeTab) {
        case "products":
          res = await adminAPI.getProducts();
          break;
        case "notifications":
          res = await adminAPI.getNotifications();
          break;
        case "tags":
          res = await adminAPI.getTags();
          break;
        case "orders":
          res = await adminAPI.getOrders();
          break;
        case "banners":
          setBannersLoading(true);
          try {
            const settingsRes = await adminAPI.getSettings();
            setBanners(settingsRes.data?.banners || []);
          } catch {} finally { setBannersLoading(false); }
          setLoading(false);
          return;
      }
      setItems(res?.data || []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      switch (activeTab) {
        case "products":
          await adminAPI.deleteProduct(id);
          break;
        case "notifications":
          await adminAPI.deleteNotification(id);
          break;
        case "tags":
          await adminAPI.deleteTag(id);
          break;
      }
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
    loadData();
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setOrderStatus(order.status);
    setTrackingNumber(order.trackingNumber || "");
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || orderStatus === selectedOrder.status) return;
    setStatusUpdating(true);
    try {
      await adminAPI.updateOrderStatus(selectedOrder._id, orderStatus);
      setSelectedOrder({ ...selectedOrder, status: orderStatus });
      loadData();
    } catch (err) {
      alert("Status update failed: " + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleTrackingUpdate = async () => {
    if (!selectedOrder) return;
    setTrackingUpdating(true);
    try {
      await adminAPI.updateOrderTracking(selectedOrder._id, trackingNumber);
      setSelectedOrder({ ...selectedOrder, trackingNumber });
      loadData();
    } catch (err) {
      alert("Tracking update failed: " + err.message);
    } finally {
      setTrackingUpdating(false);
    }
  };

  const toggleField = async (item, field) => {
    const toggleKey = `${item._id}-${field}`;
    if (togglingIds.has(toggleKey)) return;
    setTogglingIds(prev => new Set(prev).add(toggleKey));
    // Optimistic update
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, [field]: !i[field] } : i));
    try {
      if (activeTab === "products") {
        await adminAPI.toggleProductField(item._id, field);
      } else if (activeTab === "notifications") {
        await adminAPI.toggleNotificationField(item._id, field);
      }
    } catch (err) {
      // Revert on failure
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, [field]: item[field] } : i));
      alert("Toggle failed: " + err.message);
    } finally {
      setTogglingIds(prev => { const s = new Set(prev); s.delete(toggleKey); return s; });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabConfig = [
    { id: "products", label: "Products", icon: Package },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "tags", label: "Tags", icon: Tags },
     { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "banners", label: "Banners", icon: Image },
    { id: "blog-access", label: "Blog Access", icon: Users },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "site-settings", label: "Site Settings", icon: Settings },
  ];

  // ── Banner helpers ──
  const gradientOptions = [
    { label: "Indigo-Purple", value: "from-indigo-600 via-violet-600 to-purple-700" },
    { label: "Emerald-Cyan", value: "from-emerald-600 via-teal-600 to-cyan-700" },
    { label: "Orange-Rose", value: "from-orange-600 via-red-600 to-rose-700" },
    { label: "Blue-Sky", value: "from-blue-600 via-blue-500 to-sky-500" },
    { label: "Pink-Fuchsia", value: "from-pink-600 via-fuchsia-600 to-purple-600" },
    { label: "Amber-Yellow", value: "from-amber-600 via-yellow-500 to-orange-500" },
  ];

  const addBanner = () => {
    setBanners(prev => [...prev, {
      title: "", subtitle: "", tag: "", ctaText: "Learn More", ctaLink: "/",
      gradient: gradientOptions[0].value, isActive: true, sortOrder: prev.length,
      imageUrl: "", desktopImageUrl: "", mobileImageUrl: "",
      dimensionNote: "Desktop: 1200x400px, Mobile: 600x300px",
    }]);
  };

  const updateBanner = (idx, field, value) => {
    setBanners(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const removeBanner = (idx) => {
    setBanners(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBannerImageUpload = async (e, bannerIdx, fieldName = 'desktopImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 500MB.`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Invalid file type. Please upload an image file (JPEG, PNG, WebP, etc).');
      return;
    }

    const uploadKey = `${bannerIdx}-${fieldName}`;
    setBannerImageUploading(uploadKey);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const response = await adminAPI.uploadServerImage(fd);
      // Store the filename, not the full URL
      const fileName = response.data?.fileName || response.data?.url;
      if (response.success && fileName) {
        updateBanner(bannerIdx, fieldName, fileName);
        // Also update legacy imageUrl for backwards compatibility
        if (fieldName === 'desktopImageUrl') {
          updateBanner(bannerIdx, 'imageUrl', fileName);
        }
      } else {
        alert(`Upload failed: ${response.error || 'Unknown error from server'}`);
      }
    } catch (err) {
      console.error("Banner image upload failed:", err);
      alert(`Failed to upload banner image: ${err.message || 'Network error'}`);
    } finally {
      setBannerImageUploading(null);
    }
  };

  const saveBanners = async () => {
    setBannersSaving(true);
    try {
      await adminAPI.updateBanners(banners);
      alert("Banners saved!");
    } catch (err) {
      alert("Failed to save banners: " + err.message);
    } finally { setBannersSaving(false); }
  };

  const loadServerBannerImages = async () => {
    try {
      setBannerImagePickerLoading(true);
      const data = await adminAPI.getServerImages();
      setServerBannerImages(data.data?.images || []);
    } catch (err) {
      console.error("Failed to load server images:", err);
      setServerBannerImages([]);
    } finally {
      setBannerImagePickerLoading(false);
    }
  };

  const openBannerImagePicker = async (bannerIdx, fieldName) => {
    setShowBannerImagePicker({ bannerIdx, fieldName });
    await loadServerBannerImages();
  };

  const selectBannerImageFromDirectory = (imagePath, bannerIdx, fieldName) => {
    updateBanner(bannerIdx, fieldName, imagePath);
    setShowBannerImagePicker(null);
  };


  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q) ||
      item.customerName?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q)
    );
  });

  // ▸ Show form view
  if (showForm && activeTab !== "orders" && activeTab !== "banners") {
    return (
      <FormView
        tab={activeTab}
        item={editingItem}
        tags={tags}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Site
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabConfig.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSearchQuery(""); setSelectedOrder(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
           {activeTab !== "orders" && activeTab !== "banners" && activeTab !== "blog-access" && activeTab !== "feedback" && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4" />
              Add {activeTab.slice(0, -1)}
            </button>
          )}
        </div>

        {/* ── Banners Tab ── */}
        {activeTab === "banners" ? (
          bannersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{banners.length} banner{banners.length !== 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                  <button onClick={addBanner} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> Add Banner
                  </button>
                  <button onClick={saveBanners} disabled={bannersSaving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                    {bannersSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save All
                  </button>
                </div>
              </div>

              {banners.length === 0 && (
                <div className="text-center py-12 text-gray-400">No banners yet. Click "Add Banner" to create one.</div>
              )}

              {banners.map((banner, idx) => (
                <div key={idx} className={`bg-white border rounded-xl p-4 space-y-3 ${!banner.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase">Banner #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateBanner(idx, 'isActive', !banner.isActive)} className="p-1.5 rounded hover:bg-gray-100" title={banner.isActive ? 'Disable' : 'Enable'}>
                        {banner.isActive ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                      </button>
                      <button onClick={() => removeBanner(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className={`bg-gradient-to-br ${banner.gradient || gradientOptions[0].value} rounded-lg p-4 text-white relative overflow-hidden h-32 flex items-end justify-between`}>
                    {(banner.desktopImageUrl || banner.imageUrl) && (
                      <img src={banner.desktopImageUrl || banner.imageUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="relative z-10">
                      <p className="text-xs font-semibold opacity-70">{banner.tag || 'Tag'}</p>
                      <p className="text-lg font-bold">{banner.title || 'Banner Title'}</p>
                      <p className="text-sm opacity-75">{banner.subtitle || 'Subtitle text'}</p>
                      <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">{banner.ctaText || 'CTA'}</span>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Desktop Image */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">🖥️ Desktop Banner Image</label>
                      {(banner.desktopImageUrl || (!banner.mobileImageUrl && banner.imageUrl)) && (
                        <div className="mb-2 w-full h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img src={banner.desktopImageUrl || banner.imageUrl} alt="Desktop preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="flex items-center justify-center w-full px-3 py-2 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 bg-blue-50/50 transition-colors">
                          <span className="text-xs text-blue-700 font-medium">
                            {bannerImageUploading === `${idx}-desktopImageUrl` ? "Uploading..." : "Upload desktop image"}
                          </span>
                          <input type="file" accept="image/*" onChange={(e) => handleBannerImageUpload(e, idx, 'desktopImageUrl')} disabled={bannerImageUploading === `${idx}-desktopImageUrl`} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => openBannerImagePicker(idx, 'desktopImageUrl')}
                          className="w-full px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Choose from directory
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 1200×400px (3:1 ratio)</p>
                    </div>
                    {/* Mobile Image */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">📱 Mobile Banner Image</label>
                      {banner.mobileImageUrl && (
                        <div className="mb-2 w-full h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img src={banner.mobileImageUrl} alt="Mobile preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="flex items-center justify-center w-full px-3 py-2 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-400 bg-purple-50/50 transition-colors">
                          <span className="text-xs text-purple-700 font-medium">
                            {bannerImageUploading === `${idx}-mobileImageUrl` ? "Uploading..." : "Upload mobile image"}
                          </span>
                          <input type="file" accept="image/*" onChange={(e) => handleBannerImageUpload(e, idx, 'mobileImageUrl')} disabled={bannerImageUploading === `${idx}-mobileImageUrl`} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => openBannerImagePicker(idx, 'mobileImageUrl')}
                          className="w-full px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Choose from directory
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 600×300px (2:1 ratio)</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                      <input value={banner.title} onChange={(e) => updateBanner(idx, 'title', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Banner headline" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle</label>
                      <input value={banner.subtitle} onChange={(e) => updateBanner(idx, 'subtitle', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Supporting text" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tag Label</label>
                      <input value={banner.tag} onChange={(e) => updateBanner(idx, 'tag', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 📚 Sale" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">CTA Text</label>
                      <input value={banner.ctaText} onChange={(e) => updateBanner(idx, 'ctaText', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Button text" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">CTA Link</label>
                      <input value={banner.ctaLink} onChange={(e) => updateBanner(idx, 'ctaLink', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="/store or https://..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Gradient</label>
                      <select value={banner.gradient} onChange={(e) => updateBanner(idx, 'gradient', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        {gradientOptions.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Sort Order</label>
                      <input type="number" value={banner.sortOrder} onChange={(e) => updateBanner(idx, 'sortOrder', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showBannerImagePicker && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-gray-900">Select Banner Image</h3>
                    <button
                      onClick={() => setShowBannerImagePicker(null)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    {/* Upload new image */}
                    <div className="mb-6">
                      <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 bg-blue-50/50">
                        <span className="text-sm text-blue-700 font-medium">Upload new image to directory</span>
                        <span className="text-xs text-blue-600 mt-1">Max 5MB, PNG/JPG/WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleBannerImageUpload(e, showBannerImagePicker.bannerIdx, showBannerImagePicker.fieldName)}
                          disabled={bannerImageUploading === `${showBannerImagePicker.bannerIdx}-${showBannerImagePicker.fieldName}`}
                          className="hidden"
                        />
                      </label>
                      {bannerImageUploading === `${showBannerImagePicker.bannerIdx}-${showBannerImagePicker.fieldName}` && (
                        <p className="text-xs text-center text-gray-500 mt-2">Uploading...</p>
                      )}
                    </div>

                    {/* Image Grid */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-3">Available Images</p>
                      {bannerImagePickerLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : serverBannerImages.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No images in directory yet</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {serverBannerImages.map((img) => (
                            <button
                              key={img.fileName}
                              type="button"
                              onClick={() => selectBannerImageFromDirectory(img.fileName, showBannerImagePicker.bannerIdx, showBannerImagePicker.fieldName)}
                              className="relative group"
                            >
                              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
                                <img src={img.path} alt={img.fileName} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute inset-0 bg-blue-600/0 hover:bg-blue-600/20 transition-colors rounded-lg flex items-end justify-center opacity-0 hover:opacity-100">
                                <p className="text-white text-xs font-medium mb-2 bg-black/50 px-2 py-1 rounded">Select</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 truncate">{img.fileName}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </>
          )
        ) : activeTab === "blog-access" ? (
          <BlogAccessManagement />
        ) : activeTab === "feedback" ? (
          <FeedbackDashboard />
        ) : activeTab === "site-settings" ? (
          <SiteSettingsTab />
        ) : (
        /* ── Standard Items List ── */
        loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {activeTab} found
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-gray-50 transition-colors gap-3"
                >
                  {/* ─── Products row ─── */}
                  {activeTab === "products" && (
                    <>
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.thumbnail?.url ? (
                          <img src={item.thumbnail.url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title || "—"}</h3>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs font-medium text-green-600">₹{item.price ?? "—"}</span>
                          <span className="text-xs text-gray-400">Stock: {item.stock ?? 0}</span>
                          {item.publishingDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.publishingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Toggles */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => toggleField(item, "isFeatured")}
                          title={item.isFeatured ? "Unfeature" : "Feature"}
                          className={`p-1.5 rounded-lg transition-colors ${item.isFeatured ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400 hover:text-amber-500"}`}
                        >
                          <Star className="w-4 h-4" fill={item.isFeatured ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => toggleField(item, "isVisible")}
                          title={item.isVisible !== false ? "Hide" : "Show"}
                          className={`p-1.5 rounded-lg transition-colors ${item.isVisible !== false ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400 hover:text-emerald-500"}`}
                        >
                          {item.isVisible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem(item._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* ─── Notifications row ─── */}
                  {activeTab === "notifications" && (
                    <>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title || "—"}</h3>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {item.publishDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.publishDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {item.slug && <span className="text-xs text-gray-400">/{item.slug}</span>}
                        </div>
                      </div>
                      {/* Toggles */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => toggleField(item, "isFeatured")}
                          title={item.isFeatured ? "Unfeature" : "Feature"}
                          className={`p-1.5 rounded-lg transition-colors ${item.isFeatured ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400 hover:text-amber-500"}`}
                        >
                          <Star className="w-4 h-4" fill={item.isFeatured ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => toggleField(item, "isVisible")}
                          title={item.isVisible !== false ? "Hide" : "Show"}
                          className={`p-1.5 rounded-lg transition-colors ${item.isVisible !== false ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400 hover:text-emerald-500"}`}
                        >
                          {item.isVisible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem(item._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* ─── Tags row (unchanged) ─── */}
                  {activeTab === "tags" && (
                    <>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name || "—"}</h3>
                        {item.type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 mt-1 inline-block">{item.type}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem(item._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* ─── Orders row (unchanged) ─── */}
                  {activeTab === "orders" && (
                    <>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {item.customerName || "—"}
                        </h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          {item.price !== undefined && (
                            <span className="text-xs font-medium text-green-600">
                              ₹{typeof item.price === "object" ? item.price?.total : item.price}
                            </span>
                          )}
                          {item.status && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{item.status}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleOrderClick(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold">Order #{selectedOrder._id.slice(-8)}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Customer */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Customer</h4>
                <p className="text-sm font-medium text-gray-900">{selectedOrder.customerName}</p>
                <p className="text-sm text-gray-500">{selectedOrder.customerEmail}</p>
                {selectedOrder.customerPhone && <p className="text-sm text-gray-500">{selectedOrder.customerPhone}</p>}
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Items</h4>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.title} × {item.quantity} <span className="text-gray-400 capitalize">({item.format})</span></span>
                      <span className="font-medium">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium capitalize">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">₹{selectedOrder.price?.total?.toLocaleString("en-IN")}</span>
              </div>

              {/* Status Update */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Update Status</h4>
                <div className="flex gap-2">
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={statusUpdating || orderStatus === selectedOrder.status}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all"
                  >
                    {statusUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Tracking ID — only for orders with physical/POD items */}
              {(() => {
                const hasPhysical = (selectedOrder.items || []).some(
                  (i) => i.format === "physical" || i.subFormat === "print-on-demand"
                );
                if (!hasPhysical) return null;
                return (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Tracking ID
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. IND123456789"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={handleTrackingUpdate}
                        disabled={trackingUpdating || trackingNumber === (selectedOrder.trackingNumber || "")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all"
                      >
                        {trackingUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <p className="text-xs text-gray-400 mt-1.5">Current: {selectedOrder.trackingNumber}</p>
                    )}
                  </div>
                );
              })()}

              {/* Shipping Address */}
              {(() => {
                const addr = selectedOrder.shippingAddress;
                const hasAddr = addr && (addr.village || addr.gali || addr.city || addr.state || addr.address);
                if (!hasAddr) return null;
                return (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Shipping Address</h4>
                    <div className="text-sm text-gray-700 space-y-0.5">
                      {/* New fields */}
                      {addr.village && <p><span className="text-gray-400 text-xs">Village/Area:</span> {addr.village}</p>}
                      {addr.gali && <p><span className="text-gray-400 text-xs">Gali/Street:</span> {addr.gali}</p>}
                      {addr.landmark && <p><span className="text-gray-400 text-xs">Landmark:</span> {addr.landmark}</p>}
                      {addr.city && <p><span className="text-gray-400 text-xs">City:</span> {addr.city}</p>}
                      {addr.district && <p><span className="text-gray-400 text-xs">District:</span> {addr.district}</p>}
                      {addr.pincode && <p><span className="text-gray-400 text-xs">Pincode:</span> {addr.pincode}</p>}
                      {addr.postOffice && <p><span className="text-gray-400 text-xs">Post Office:</span> {addr.postOffice}</p>}
                      {addr.mobile && <p><span className="text-gray-400 text-xs">Mobile:</span> {addr.mobile}</p>}
                      {addr.state && <p><span className="text-gray-400 text-xs">State:</span> {addr.state}</p>}
                      {/* Legacy fallback for old orders */}
                      {addr.address && !addr.village && (
                        <p>{addr.address}{addr.city ? `, ${addr.city}` : ''}{addr.state ? `, ${addr.state}` : ''}{addr.pincode ? ` — ${addr.pincode}` : ''}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// FORM VIEW (routes to the right form component)
// ═══════════════════════════════════════════

import dynamic from "next/dynamic";

const ProductForm = dynamic(() => import("@/components/admin/ProductForm"), { ssr: false });
const NotificationForm = dynamic(() => import("@/components/admin/NotificationForm"), { ssr: false });
const TagForm = dynamic(() => import("@/components/admin/TagForm"), { ssr: false });

const BlogAccessManagement = dynamic(() => import("@/components/admin/BlogAccessManagement"), { ssr: false });
const FeedbackDashboard = dynamic(() => import("@/components/admin/FeedbackDashboard"), { ssr: false });

function FormView({ tab, item, tags, onClose }) {
  switch (tab) {
    case "products":
      return <ProductForm item={item} tags={tags} onClose={onClose} />;
    case "notifications":
      return <NotificationForm item={item} tags={tags} onClose={onClose} />;
    case "tags":
      return <TagForm item={item} onClose={onClose} />;
    default:
      return null;
  }
}
