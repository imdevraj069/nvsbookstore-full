"use client";

import { useState } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { adminAPI } from "@/lib/api";

export default function TagForm({ item, onClose }) {
  const isEditing = !!item;
  const [form, setForm] = useState({
    name: item?.name || "",
    slug: item?.slug || "",
    description: item?.description || "",
    type: item?.type || "both",
    color: item?.color || "",
    icon: item?.icon || "",
    isActive: item?.isActive !== false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
    if (field === "name" && !isEditing) {
      setForm((f) => ({ ...f, [field]: val, slug: val.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-") }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isEditing) {
        await adminAPI.updateTag(item._id, form);
      } else {
        await adminAPI.createTag(form);
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
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold">{isEditing ? "Edit" : "Create"} Tag</h1>
          <div />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <section className="bg-white rounded-xl border p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={update("name")} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input value={form.slug} onChange={update("slug")} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={update("type")} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="product">Product</option>
                <option value="notification">Notification</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input value={form.color} onChange={update("color")} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="#3B82F6" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={update("description")} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={update("isActive")} className="rounded" />
            <span className="text-sm">Active</span>
          </label>
        </section>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/25"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? "Update" : "Create"} Tag
          </button>
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
