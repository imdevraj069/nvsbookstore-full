"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Plus, X, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { adminAPI } from "@/lib/api";
import dynamic from "next/dynamic";
import TagInput from "@/components/admin/TagInput";

const RichEditor = dynamic(() => import("@/components/admin/RichEditor"), { ssr: false });

const tabs = ["Basic Info", "Details", "Digital", "Specifications", "Settings", "Content"];

export default function ProductForm({ item, onClose }) {
  const isEditing = !!item;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({
    title: item?.title || "",
    slug: item?.slug || "",
    description: item?.description || "",
    longDescription: item?.longDescription || "",
    price: item?.price || "",
    originalPrice: item?.originalPrice || "",
    author: item?.author || "",
    publisher: item?.publisher || "",
    pages: item?.pages || "",
    isbn: item?.isbn || "",
    language: item?.language?.join(", ") || "English",
    stock: item?.stock ?? 0,
    formats: item?.formats || ["physical"],
    tags: item?.tags || [],
    badge: item?.badge || "",
    gradient: item?.gradient || "from-blue-600 to-indigo-700",
    isFeatured: item?.isFeatured || false,
    isEditorPick: item?.isEditorPick || false,
    isVisible: item?.isVisible !== false,
    isPrintable: item?.isPrintable || false,
    printPrice: item?.printPrice || "",
    digitalUrl: item?.digitalUrl || "",
    specifications: item?.specifications || {},
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPath, setThumbnailPath] = useState(item?.thumbnail?.url || "");
  const [digitalFile, setDigitalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [serverImages, setServerImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
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
      logger.warn("Failed to load server images:", err);
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
      setThumbnailPath(response.data.path);
      setThumbnail(null); // Clear file upload
      await loadServerImages();
    } catch (err) {
      setError("Failed to upload image");
    } finally {
      setImageUploadLoading(false);
    }
  };

  const selectImageFromDirectory = (imagePath) => {
    setThumbnailPath(imagePath);
    setThumbnail(null); // Clear file upload
    setShowImagePicker(false);
  };

  const update = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (field === "title" && !isEditing) {
      setForm((f) => ({ ...f, title: val, slug: String(val).toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-") }));
    } else {
      setForm((f) => ({ ...f, [field]: val }));
    }
  };

  const toggleFormat = (fmt) => {
    setForm((f) => ({
      ...f,
      formats: f.formats.includes(fmt) ? f.formats.filter((s) => s !== fmt) : [...f.formats, fmt],
    }));
  };

  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;
    setForm((f) => ({
      ...f,
      specifications: { ...f.specifications, [newSpecKey.trim()]: newSpecValue.trim() },
    }));
    setNewSpecKey("");
    setNewSpecValue("");
  };

  const handleRemoveSpec = (key) => {
    setForm((f) => {
      const specs = { ...f.specifications };
      delete specs[key];
      return { ...f, specifications: specs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); setActiveTab(0); return; }
    if (!form.description.trim()) { setError("Description is required"); setActiveTab(0); return; }

    setLoading(true);
    setError("");
    try {
      const fd = new FormData();

      // Backend expects req.body.data as a JSON string
      const dataObj = { ...form };
      // Convert language to array
      if (typeof dataObj.language === "string") {
        dataObj.language = dataObj.language.split(",").map((l) => l.trim()).filter(Boolean);
      }
      
      // Add thumbnail path if selected from directory
      if (thumbnailPath && !thumbnail) {
        dataObj.thumbnailPath = thumbnailPath;
      }
      
      fd.append("data", JSON.stringify(dataObj));

      if (thumbnail) fd.append("thumbnail", thumbnail);
      if (digitalFile) fd.append("digitalFile", digitalFile);

      if (isEditing) {
        await adminAPI.updateProduct(item._id, fd);
      } else {
        await adminAPI.createProduct(fd);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const gradients = [
    "from-blue-600 to-indigo-700", "from-emerald-500 to-teal-600", "from-orange-500 to-red-600",
    "from-purple-500 to-pink-600", "from-cyan-500 to-blue-600", "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600", "from-lime-500 to-green-600", "from-sky-500 to-indigo-600",
    "from-violet-500 to-purple-600",
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Basic Info
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
                <input value={form.title} onChange={update("title")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required placeholder="Product title" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug</label>
                <input value={form.slug} onChange={update("slug")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description *</label>
              <textarea value={form.description} onChange={update("description")} rows={3} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required placeholder="Brief product description" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thumbnail Image</label>
              <div className="flex flex-col gap-3">
                {/* Image Preview & Selector */}
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      {/* Upload from machine */}
                      <label className="flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors bg-gray-50/50">
                        <Upload className="w-4 h-4 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Upload from machine</span>
                        <input type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files[0])} className="hidden" />
                      </label>
                      {/* Pick from directory */}
                      <button
                        type="button"
                        onClick={() => setShowImagePicker(!showImagePicker)}
                        className="flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:border-green-400 transition-colors bg-green-50/50"
                      >
                        <Plus className="w-4 h-4 text-green-600 mb-1" />
                        <span className="text-xs text-green-700 font-medium">Pick from directory</span>
                      </button>
                    </div>
                  </div>
                  {/* Preview */}
                  {(thumbnail || thumbnailPath) && (
                    <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
                      <img
                        src={thumbnail ? URL.createObjectURL(thumbnail) : thumbnailPath}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Image Picker Modal */}
                {showImagePicker && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[70vh] overflow-hidden flex flex-col">
                      <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Select Image from Directory</h3>
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
                            <span className="text-sm text-blue-700 font-medium">Upload new image to directory</span>
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
                            <p className="text-sm text-gray-400 text-center py-8">No images in directory yet</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              {serverImages.map((img) => (
                                <button
                                  key={img.fileName}
                                  type="button"
                                  onClick={() => selectImageFromDirectory(img.path)}
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
              </div>
            </div>
          </div>
        );

      case 1: // Details
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: "price", label: "Price *", type: "number", required: true },
                { key: "originalPrice", label: "Original Price", type: "number" },
                { key: "stock", label: "Stock", type: "number" },
                { key: "pages", label: "Pages", type: "number" },
                { key: "isbn", label: "ISBN" },
                { key: "language", label: "Language", placeholder: "English, Hindi" },
              ].map(({ key, label, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                  <input type={type || "text"} value={form[key]} onChange={update(key)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder={placeholder} required={required} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Author</label>
                <input value={form.author} onChange={update("author")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Publisher</label>
                <input value={form.publisher} onChange={update("publisher")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
            </div>
          </div>
        );

      case 2: // Digital
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Formats</label>
              <div className="flex gap-4">
                {["physical", "digital"].map((fmt) => (
                  <label key={fmt} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${form.formats.includes(fmt) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={form.formats.includes(fmt)} onChange={() => toggleFormat(fmt)} className="rounded accent-blue-600" />
                    <span className="text-sm font-medium capitalize">{fmt}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.formats.includes("digital") && (
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 space-y-4">
                <h4 className="text-sm font-semibold text-blue-800">Digital Content</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Digital URL (Drive link)</label>
                  <input value={form.digitalUrl} onChange={update("digitalUrl")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="https://drive.google.com/..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Digital File (MinIO upload)</label>
                  <input type="file" onChange={(e) => setDigitalFile(e.target.files[0])} className="w-full text-sm" />
                </div>
              </div>
            )}
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all ${form.isPrintable ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
              <input type="checkbox" checked={form.isPrintable} onChange={update("isPrintable")} className="rounded accent-green-600" id="isPrintable" />
              <label htmlFor="isPrintable" className="text-sm font-medium cursor-pointer">Printable (print-on-demand)</label>
            </div>
            {form.isPrintable && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Print Price</label>
                <input type="number" value={form.printPrice} onChange={update("printPrice")} className="w-full max-w-xs px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            )}
          </div>
        );

      case 3: // Specifications
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Specifications</label>
            <div className="flex gap-2">
              <input placeholder="Key (e.g. Weight)" value={newSpecKey} onChange={(e) => setNewSpecKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSpec())} className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <input placeholder="Value (e.g. 200g)" value={newSpecValue} onChange={(e) => setNewSpecValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSpec())} className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <button type="button" onClick={handleAddSpec} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(form.specifications || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-sm"><span className="font-semibold text-gray-800">{key}:</span> <span className="text-gray-600">{value}</span></span>
                  <button type="button" onClick={() => handleRemoveSpec(key)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {Object.keys(form.specifications || {}).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No specifications added yet</p>
                  <p className="text-xs mt-1">Add key-value pairs using the form above</p>
                </div>
              )}
            </div>
          </div>
        );

      case 4: // Settings
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Visibility & Flags</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "isFeatured", label: "Featured", desc: "Show on homepage" },
                  { key: "isEditorPick", label: "Editor's Pick", desc: "Highlight in store" },
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Badge Label</label>
              <input value={form.badge} onChange={update("badge")} className="w-full max-w-sm px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Bestseller, New, Popular" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Card Gradient</label>
              <div className="flex flex-wrap gap-2">
                {gradients.map((g) => (
                  <button key={g} type="button" onClick={() => setForm((f) => ({ ...f, gradient: g }))} className={`w-14 h-9 rounded-lg bg-gradient-to-r ${g} transition-all ${form.gradient === g ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-105"}`} />
                ))}
              </div>
            </div>
            <TagInput
              value={form.tags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
              label="Tags"
              placeholder="Type a tag and press Enter or comma"
            />
          </div>
        );

      case 5: // Content
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Long Description (Rich Editor)</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <RichEditor
                content={form.longDescription}
                onChange={(html) => setForm((f) => ({ ...f, longDescription: html }))}
              />
            </div>
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
        <h2 className="text-lg font-bold text-gray-900 mb-1 px-2">{isEditing ? "Edit" : "New"} Product</h2>
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
              form="product-form"
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

          <form id="product-form" onSubmit={handleSubmit} className="max-w-3xl">
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
