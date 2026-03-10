'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Plus, LogOut } from 'lucide-react';
import Link from 'next/link';

const BlogDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, published
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchBlogs();
    }
  }, [status]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      // Fetch user's blogs (would need a separate endpoint)
      const response = await fetch('/api/blog?limit=100');
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      // Filter for current user's blogs
      const userBlogs = data.data.filter(
        (blog) => blog.author._id === session.user.id
      );
      setBlogs(userBlogs);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug) => {
    try {
      const response = await fetch(`/api/blog/${slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setBlogs(blogs.filter((b) => b.slug !== slug));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting blog:', error);
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    if (filter === 'draft') return !blog.isPublished;
    if (filter === 'published') return blog.isPublished;
    return true;
  });

  if (status === 'loading' || loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Blog Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome, {session?.user?.name}</p>
        </div>
        <Link
          href="/blog/new"
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} /> New Blog
        </Link>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-4 mb-6">
        {['all', 'draft', 'published'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({
              blogs.filter((b) =>
                f === 'draft'
                  ? !b.isPublished
                  : f === 'published'
                    ? b.isPublished
                    : true
              ).length
            })
          </button>
        ))}
      </div>

      {/* Blogs List */}
      {filteredBlogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No blogs yet</p>
          <Link
            href="/blog/new"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first blog →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBlogs.map((blog) => (
            <div
              key={blog._id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{blog.title}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        blog.isPublished
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {blog.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{blog.slug}</p>
                  <p className="text-gray-600 line-clamp-2">
                    {blog.metaDescription || 'No description'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/blog/edit/${blog.slug}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={20} />
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm(blog.slug)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span>👁️ {blog.views || 0} views</span>
                <span>👍 {blog.likes || 0} likes</span>
                <span>
                  {new Date(blog.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === blog.slug && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                  <p className="text-red-700 font-medium">
                    Are you sure you want to delete this blog?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(blog.slug)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogDashboard;
