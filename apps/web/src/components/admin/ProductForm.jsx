"use client";

import { useState } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { adminAPI } from "@/lib/api";

export default function ProductForm({ item, tags = [], onClose }) {
  const isEditing = !!item;
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
    stock: item?.stock || 0,
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
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [digitalFile, setDigitalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
    if (field === "title" && !isEditing) {
      setForm((f) => ({ ...f, [field]: val, slug: val.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-") }));
    }
  };

  const toggleFormat = (fmt) => {
    setForm((f) => ({
      ...f,
      formats: f.formats.includes(fmt) ? f.formats.filter((s) => s !== fmt) : [...f.formats, fmt],
    }));
  };

  const toggleTag = (tag) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      if (thumbnail) fd.append("thumbnail", thumbnail);
      if (digitalFile) fd.append("digitalFile", digitalFile);

      if (isEditing) {
        await adminAPI.updateProduct(item._id, fd);
      } else {
        await adminAPI.createProduct(fd);
      }
      onClose();
    } catch (err) {
      setError(err.message);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold">{isEditing ? "Edit" : "Create"} Product</h1>
          <div />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {/* Basic Info */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={update("title")} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input value={form.slug} onChange={update("slug")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input type="number" value={form.price} onChange={update("price")} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Price</label>
              <input type="number" value={form.originalPrice} onChange={update("originalPrice")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={update("description")} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Long Description</label>
            <textarea value={form.longDescription} onChange={update("longDescription")} rows={5} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </section>

        {/* Book Details */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Book Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
              <input value={form.author} onChange={update("author")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
              <input value={form.publisher} onChange={update("publisher")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
              <input type="number" value={form.pages} onChange={update("pages")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
              <input value={form.isbn} onChange={update("isbn")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <input value={form.language} onChange={update("language")} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="English, Hindi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={update("stock")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </section>

        {/* Formats & Digital */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Formats & Digital</h2>
          <div className="flex gap-4">
            {["physical", "digital"].map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.formats.includes(fmt)} onChange={() => toggleFormat(fmt)} className="rounded" />
                <span className="text-sm capitalize">{fmt}</span>
              </label>
            ))}
          </div>
          {form.formats.includes("digital") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Digital URL (Drive link)</label>
                <input value={form.digitalUrl} onChange={update("digitalUrl")} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Digital File (MinIO upload)</label>
                <input type="file" onChange={(e) => setDigitalFile(e.target.files[0])} className="w-full text-sm" />
              </div>
            </div>
          )}
          <div className="flex gap-4 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPrintable} onChange={update("isPrintable")} className="rounded" />
              <span className="text-sm">Printable (print-on-demand)</span>
            </label>
          </div>
          {form.isPrintable && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Print Price</label>
              <input type="number" value={form.printPrice} onChange={update("printPrice")} className="w-full max-w-xs px-3 py-2 border rounded-lg text-sm" />
            </div>
          )}
        </section>

        {/* Media */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Media</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image</label>
            <input type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files[0])} className="w-full text-sm" />
            {item?.thumbnail?.url && <img src={item.thumbnail.url} alt="" className="mt-2 w-24 h-24 object-cover rounded-lg" />}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Label</label>
            <input value={form.badge} onChange={update("badge")} className="w-full max-w-xs px-3 py-2 border rounded-lg text-sm" placeholder="Bestseller, New, Popular" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Gradient</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {gradients.map((g) => (
                <button key={g} type="button" onClick={() => setForm((f) => ({ ...f, gradient: g }))} className={`w-12 h-8 rounded-lg bg-gradient-to-r ${g} ${form.gradient === g ? "ring-2 ring-offset-2 ring-blue-500" : ""}`} />
              ))}
            </div>
          </div>
        </section>

        {/* Tags */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.filter((t) => t.type === "product" || t.type === "both").map((t) => (
              <button key={t.slug} type="button" onClick={() => toggleTag(t.slug)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.tags.includes(t.slug) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t.name}
              </button>
            ))}
          </div>
        </section>

        {/* Flags */}
        <section className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="text-lg font-semibold">Visibility</h2>
          <div className="flex flex-wrap gap-6">
            {[
              { key: "isFeatured", label: "Featured" },
              { key: "isEditorPick", label: "Editor's Pick" },
              { key: "isVisible", label: "Visible" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={update(key)} className="rounded" />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/25"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? "Update" : "Create"} Product
          </button>
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
