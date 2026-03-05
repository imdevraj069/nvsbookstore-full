"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, ChevronLeft, ChevronRight, Upload, X, Plus } from "lucide-react";
import { adminAPI } from "@/lib/api";
import dynamic from "next/dynamic";
import TagInput from "@/components/admin/TagInput";

const RichEditor = dynamic(() => import("@/components/admin/RichEditor"), { ssr: false });

const tabs = ["Basic Info", "Details", "Content", "Links", "Dates", "Settings"];

export default function NotificationForm({ item, onClose }) {
  const isEditing = !!item;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({
    title: item?.title || "",
    slug: item?.slug || "",
    description: item?.description || "",
    content: item?.content || "",
    tags: item?.tags || [],
    department: item?.department || "",
    location: item?.location || "",
    applyUrl: item?.applyUrl || "",
    websiteUrl: item?.websiteUrl || "",
    loginUrl: item?.loginUrl || "",
    resultUrl: item?.resultUrl || "",
    admitCardUrl: item?.admitCardUrl || "",
    pdfUrl: item?.pdfUrl || "",
    lastDate: item?.lastDate ? new Date(item.lastDate).toISOString().split("T")[0] : "",
    date: item?.date ? new Date(item.date).toISOString().split("T")[0] : "",
    isFeatured: item?.isFeatured || false,
    isVisible: item?.isVisible !== false,
    priority: item?.priority || "normal",
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // Load server images on mount
  useEffect(() => {
    loadServerImages();
  }, []);

  const loadServerImages = async () => {
    try {
      const response = await adminAPI.getServerImages();
      setServerImages(response.data || []);
    } catch (err) {
      // Silently fail if images can't be loaded
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const response = await adminAPI.uploadServerImage(fd);
      // Insert image into content using markdown
      const markdown = `![${file.name}](${response.data.path})`;
      setForm((f) => ({
        ...f,
        content: f.content + (f.content ? "\n\n" : "") + markdown,
      }));
      await loadServerImages();
    } catch (err) {
      setError("Failed to upload image");
    } finally {
      setImageUploadLoading(false);
    }
  };

  const insertImageToContent = (imagePath) => {
    setForm((f) => ({
      ...f,
      content: f.content + (f.content ? "\n\n" : "") + `![Image](${imagePath})`,
    }));
    setShowImagePicker(false);
  };
  const [serverImages, setServerImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  const update = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (field === "title" && !isEditing) {
      setForm((f) => ({ ...f, title: val, slug: String(val).toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-") }));
    } else {
      setForm((f) => ({ ...f, [field]: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); setActiveTab(0); return; }
    if (!form.description.trim()) { setError("Description is required"); setActiveTab(0); return; }

    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      // Backend expects req.body.data as JSON string
      fd.append("data", JSON.stringify(form));
      if (pdfFile) fd.append("pdfFile", pdfFile);

      if (isEditing) {
        await adminAPI.updateNotification(item._id, fd);
      } else {
        await adminAPI.createNotification(fd);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Basic Info
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
                <input value={form.title} onChange={update("title")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required placeholder="Notification title" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug</label>
                <input value={form.slug} onChange={update("slug")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description *</label>
              <textarea value={form.description} onChange={update("description")} rows={3} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required placeholder="Brief description" />
            </div>
          </div>
        );

      case 1: // Details
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department</label>
                <input value={form.department} onChange={update("department")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="e.g. Railway Board" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
                <input value={form.location} onChange={update("location")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="e.g. All India" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                <select value={form.priority} onChange={update("priority")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2: // Content
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Content (Rich Editor)</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <RichEditor
                content={form.content}
                onChange={(html) => setForm((f) => ({ ...f, content: html }))}
              />
            </div>
          </div>
        );

      case 3: // Links
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "applyUrl", label: "Apply URL", placeholder: "https://example.com/apply", icon: "🔗" },
                { key: "websiteUrl", label: "Official Website", placeholder: "https://example.com", icon: "🌐" },
                { key: "loginUrl", label: "Login URL", placeholder: "https://example.com/login", icon: "🔑" },
                { key: "resultUrl", label: "Result URL", placeholder: "https://example.com/result", icon: "📊" },
                { key: "admitCardUrl", label: "Admit Card URL", placeholder: "https://example.com/admit-card", icon: "🎫" },
                { key: "pdfUrl", label: "PDF / Drive URL", placeholder: "https://example.com/file.pdf", icon: "📄" },
              ].map(({ key, label, placeholder, icon }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{icon} {label}</label>
                  <input value={form[key]} onChange={update(key)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {/* PDF Upload */}
              <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">📎 Upload PDF (MinIO)</label>
                <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} className="text-sm" />
                <p className="text-xs text-gray-400 mt-2">Upload a PDF to be stored and served from MinIO</p>
              </div>

              {/* Image Management */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 space-y-3">
                <h4 className="text-sm font-semibold text-green-800">🖼️ Manage Images for Content</h4>
                <button
                  type="button"
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {showImagePicker ? "Close Image Picker" : "Insert Image"}
                </button>

                {/* Image Picker Modal */}
                {showImagePicker && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[70vh] overflow-hidden flex flex-col">
                      <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Select Image for Content</h3>
                        <button
                          onClick={() => setShowImagePicker(false)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto p-4">
                        {/* Upload new image */}
                        <div className="mb-6">
                          <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 bg-blue-50/50">
                            <Upload className="w-5 h-5 text-blue-600 mb-2" />
                            <span className="text-sm text-blue-700 font-medium">Upload new image</span>
                            <span className="text-xs text-blue-600 mt-1">Max 5MB, PNG/JPG/WebP</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={imageUploadLoading}
                              className="hidden"
                            />
                          </label>
                          {imageUploadLoading && <p className="text-xs text-center text-gray-500 mt-2">Uploading...</p>}
                        </div>

                        {/* Image Grid */}
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-3">Available Images</p>
                          {serverImages.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No images available yet</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              {serverImages.map((img) => (
                                <button
                                  key={img.fileName}
                                  type="button"
                                  onClick={() => insertImageToContent(img.path)}
                                  className="relative group"
                                >
                                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-colors">
                                    <img src={img.path} alt={img.fileName} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="absolute inset-0 bg-green-600/0 hover:bg-green-600/20 transition-colors rounded-lg flex items-end justify-center opacity-0 hover:opacity-100">
                                    <p className="text-white text-xs font-medium mb-2 bg-black/50 px-2 py-1 rounded">Insert</p>
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
              </div>
            </div>
          </div>
        );

      case 4: // Dates
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">📅 Notification Date</label>
              <input type="date" value={form.date} onChange={update("date")} className="w-full max-w-xs px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>
            <div className="p-5 bg-white rounded-xl border border-gray-200 space-y-3">
              <label className={`flex items-center gap-2.5 cursor-pointer px-4 py-3 rounded-lg border transition-all ${enableLastDate ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                <input
                  type="checkbox"
                  checked={enableLastDate}
                  onChange={(e) => {
                    setEnableLastDate(e.target.checked);
                    if (!e.target.checked) setForm((f) => ({ ...f, lastDate: "" }));
                    else setForm((f) => ({ ...f, lastDate: new Date().toISOString().split("T")[0] }));
                  }}
                  className="rounded accent-red-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">⏰ Enable Last Date</span>
                  <p className="text-xs text-gray-400">Set a deadline for this notification</p>
                </div>
              </label>
              {enableLastDate && (
                <input
                  type="date"
                  value={form.lastDate}
                  onChange={update("lastDate")}
                  className="w-full max-w-xs px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              )}
            </div>
          </div>
        );

      case 5: // Settings
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Visibility & Flags</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "isFeatured", label: "Featured", desc: "Highlight on homepage" },
                  { key: "isVisible", label: "Visible", desc: "Show to users" },
                ].map(({ key, label, desc }) => (
                  <label key={key} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${form[key] ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={form[key]} onChange={update(key)} className="mt-0.5 rounded accent-blue-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-800 block">{label}</span>
                      <span className="text-xs text-gray-400">{desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <TagInput
              value={form.tags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
              label="Tags"
              placeholder="Type a tag and press Enter or comma (e.g. results, admit-card)"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col bg-white border-r border-gray-200 p-4 w-56 min-w-[200px] shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1 px-2">{isEditing ? "Edit" : "New"} Notification</h2>
        <p className="text-xs text-gray-400 mb-4 px-2">Fill out each section</p>
        <nav className="space-y-0.5">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`w-full px-3 py-2.5 text-sm text-left rounded-lg transition-all ${
                activeTab === index
                  ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25"
                  : "text-gray-600 hover:bg-gray-100 font-medium"
              }`}
            >
              <span className={`inline-block w-5 h-5 text-center text-xs leading-5 rounded-full mr-2 ${activeTab === index ? "bg-white/20" : "bg-gray-200/60"}`}>{index + 1}</span>
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{tabs[activeTab]}</h1>
              <p className="text-xs text-gray-400">Step {activeTab + 1} of {tabs.length}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              form="notification-form"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg shadow-blue-500/25 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? "Update" : "Create"}
            </button>
          </div>
        </header>

        {/* Mobile tabs */}
        <div className="md:hidden bg-white border-b px-4 py-2">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition font-medium ${
                  activeTab === index
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="p-3 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
              ⚠ {error}
            </div>
          )}

          <form id="notification-form" onSubmit={handleSubmit} className="max-w-3xl">
            {renderTabContent()}
          </form>

          {/* Navigation */}
          <div className="mt-8 flex justify-between max-w-3xl pb-4">
            <button
              type="button"
              onClick={() => setActiveTab((prev) => Math.max(prev - 1, 0))}
              disabled={activeTab === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setActiveTab((prev) => Math.min(prev + 1, tabs.length - 1))}
              disabled={activeTab === tabs.length - 1}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-800 transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
