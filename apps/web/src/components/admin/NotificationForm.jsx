"use client";

import { useState } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { adminAPI } from "@/lib/api";
import dynamic from "next/dynamic";

// Import RichEditor dynamically (uses browser-only Tiptap)
const RichEditor = dynamic(() => import("@/components/admin/RichEditor"), { ssr: false });

export default function NotificationForm({ item, tags = [], onClose }) {
  const isEditing = !!item;
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
    isFeatured: item?.isFeatured || false,
    isVisible: item?.isVisible !== false,
    priority: item?.priority || "normal",
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
    if (field === "title" && !isEditing) {
      setForm((f) => ({ ...f, [field]: val, slug: val.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-") }));
    }
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
      if (pdfFile) fd.append("pdfFile", pdfFile);

      if (isEditing) {
        await adminAPI.updateNotification(item._id, fd);
      } else {
        await adminAPI.createNotification(fd);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold">{isEditing ? "Edit" : "Create"} Notification</h1>
          <div />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={update("description")} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
        </section>

        {/* Rich Content Editor */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Content (Rich Editor)</h2>
          <RichEditor
            content={form.content}
            onChange={(html) => setForm((f) => ({ ...f, content: html }))}
          />
        </section>

        {/* Details */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input value={form.department} onChange={update("department")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={form.location} onChange={update("location")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Date</label>
              <input type="date" value={form.lastDate} onChange={update("lastDate")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={update("priority")} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </section>

        {/* URLs */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "applyUrl", label: "Apply URL" },
              { key: "websiteUrl", label: "Official Website" },
              { key: "loginUrl", label: "Login URL" },
              { key: "resultUrl", label: "Result URL" },
              { key: "admitCardUrl", label: "Admit Card URL" },
              { key: "pdfUrl", label: "PDF / Drive URL" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input value={form[key]} onChange={update(key)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF (MinIO)</label>
            <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} className="text-sm" />
          </div>
        </section>

        {/* Tags */}
        <section className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.filter((t) => t.type === "notification" || t.type === "both").map((t) => (
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={update("isFeatured")} className="rounded" />
              <span className="text-sm">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isVisible} onChange={update("isVisible")} className="rounded" />
              <span className="text-sm">Visible</span>
            </label>
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
            {isEditing ? "Update" : "Create"} Notification
          </button>
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
