'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Upload, X } from 'lucide-react';

const BlogEditor = ({ initialBlog = null }) => {
  const router = useRouter();
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    title: initialBlog?.title || '',
    slug: initialBlog?.slug || '',
    authorName: initialBlog?.authorName || session?.user?.name || '',
    content: initialBlog?.content || '',
    tags: initialBlog?.tags || [],
    category: initialBlog?.category || '',
    metaTitle: initialBlog?.metaTitle || '',
    metaDescription: initialBlog?.metaDescription || '',
    isPublished: initialBlog?.isPublished || false,
    coverImage: initialBlog?.coverImage || null,
    headerImage: initialBlog?.headerImage || null,
  });

  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const coverImageInputRef = useRef(null);
  const headerImageInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleImageUpload = (e, imageType) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for demo - in production, upload to cloud storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          [imageType]: {
            url: reader.result,
            key: `${Date.now()}-${file.name}`,
            bucket: 'blog-images',
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (imageType) => {
    setFormData((prev) => ({
      ...prev,
      [imageType]: null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.title || !formData.slug || !formData.content) {
        throw new Error('Title, slug, and content are required');
      }

      const url = initialBlog
        ? `/api/blog/${initialBlog.slug}`
        : '/api/blog';

      const method = initialBlog ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save blog');
      }

      router.push('/blog-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {initialBlog ? 'Edit Blog' : 'Create New Blog'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-2">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Blog title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-semibold mb-2">URL Slug *</label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="url-friendly-slug"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Author Name */}
        <div>
          <label className="block text-sm font-semibold mb-2">Author Name</label>
          <input
            type="text"
            name="authorName"
            value={formData.authorName}
            onChange={handleInputChange}
            placeholder="Author name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold mb-2">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            placeholder="e.g., Photography, Design, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-semibold mb-2">Cover Image</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            {formData.coverImage ? (
              <div className="relative w-full">
                <img
                  src={formData.coverImage.url}
                  alt="Cover"
                  className="max-h-48 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage('coverImage')}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                className="w-full text-center py-8"
              >
                <Upload className="mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-600">Click to upload cover image</p>
              </button>
            )}
            <input
              ref={coverImageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'coverImage')}
              hidden
            />
          </div>
        </div>

        {/* Header Image */}
        <div>
          <label className="block text-sm font-semibold mb-2">Header Image</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            {formData.headerImage ? (
              <div className="relative w-full">
                <img
                  src={formData.headerImage.url}
                  alt="Header"
                  className="max-h-48 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage('headerImage')}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => headerImageInputRef.current?.click()}
                className="w-full text-center py-8"
              >
                <Upload className="mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-600">Click to upload header image</p>
              </button>
            )}
            <input
              ref={headerImageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'headerImage')}
              hidden
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold mb-2">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <div
                key={tag}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Fields */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Meta Title</label>
            <input
              type="text"
              name="metaTitle"
              value={formData.metaTitle}
              onChange={handleInputChange}
              placeholder="SEO meta title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Meta Description
            </label>
            <textarea
              name="metaDescription"
              value={formData.metaDescription}
              onChange={handleInputChange}
              placeholder="SEO meta description"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Editor */}
        <div className="border-t pt-6">
          <label className="block text-sm font-semibold mb-2">Content *</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="Write your blog content here..."
            rows="15"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            required
          />
          <p className="text-xs text-gray-500 mt-2">
            Tip: You can use HTML tags for formatting (b, i, strong, em, p, br, etc.)
          </p>
        </div>

        {/* Publish Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isPublished"
            id="isPublished"
            checked={formData.isPublished}
            onChange={handleInputChange}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="isPublished" className="ml-2 text-sm font-medium">
            Publish immediately
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : initialBlog ? 'Update Blog' : 'Create Blog'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogEditor;
