'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { blogsAPI, blogAccessAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const BlogDashboard = () => {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [accessStatus, setAccessStatus] = useState(null); // null = checking, 'accepted' | 'invited' | 'rejected' | 'none'
  const [accessRecord, setAccessRecord] = useState(null); // full blog access record for accept/reject
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Admins always have access
    if (isAdmin) {
      setAccessStatus('accepted');
      fetchBlogs();
      return;
    }

    // For non-admin users, check blog access status
    const checkAccess = async () => {
      try {
        const data = await blogAccessAPI.getMyAccess();
        if (data.success && data.data) {
          setAccessRecord(data.data);
          setAccessStatus(data.data.status); // 'invited', 'accepted', or 'rejected'
          if (data.data.status === 'accepted') {
            fetchBlogs();
          } else {
            setLoading(false);
          }
        } else {
          setAccessStatus('none');
          setLoading(false);
        }
      } catch (err) {
        setAccessStatus('none');
        setLoading(false);
      }
    };
    checkAccess();
  }, [user, authLoading, isAdmin]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const data = await blogsAPI.getMyBlogs();
      if (data.success) {
        setBlogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptReject = async (status) => {
    if (!accessRecord) return;
    try {
      setActionLoading(true);
      const result = await blogAccessAPI.update(accessRecord._id, { status });
      if (result.success) {
        setAccessStatus(status);
        setAccessRecord({ ...accessRecord, status });
        if (status === 'accepted') {
          fetchBlogs();
        }
      }
    } catch (error) {
      console.error('Error updating invitation:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (slug) => {
    try {
      const data = await blogsAPI.delete(slug);
      if (data.success) {
        setBlogs(blogs.filter((b) => b.slug !== slug));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    if (filter === 'draft') return !blog.isPublished;
    if (filter === 'published') return blog.isPublished;
    return true;
  });

  if (authLoading || accessStatus === null) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!user) return null; // will redirect via useEffect

  // ─── Pending Invitation UI ───
  if (accessStatus === 'invited') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 text-center py-16">
        <div className="text-5xl mb-4">✉️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Blog Writer Invitation</h1>
        <p className="text-gray-600 mb-2">
          You have been invited by <strong>{accessRecord?.invitedBy?.name || 'an admin'}</strong> to become a blog writer on NVS BookStore.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 inline-block text-left">
          <p className="text-blue-800 font-medium mb-2">Your Permissions:</p>
          <ul className="text-blue-700 text-sm space-y-1">
            {accessRecord?.canWrite && <li>✅ Write blog posts</li>}
            {accessRecord?.canPublish ? <li>✅ Publish directly</li> : <li>📝 Submit for review</li>}
            {accessRecord?.canEditOwn && <li>✅ Edit your own posts</li>}
          </ul>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleAcceptReject('accepted')}
            disabled={actionLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Processing...' : '✅ Accept Invitation'}
          </button>
          <button
            onClick={() => handleAcceptReject('rejected')}
            disabled={actionLoading}
            className="px-6 py-3 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 font-medium disabled:opacity-50 transition-colors"
          >
            Decline
          </button>
        </div>
        <Link href="/blog" className="text-blue-600 hover:text-blue-700 font-medium mt-6 inline-block">
          ← Browse published blogs
        </Link>
      </div>
    );
  }

  // ─── No Access / Rejected ───
  if (accessStatus === 'none' || accessStatus === 'rejected') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 text-center py-16">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">No Blog Access</h1>
        <p className="text-gray-500 mb-6">
          You don't have permission to write blogs. Contact an administrator to request access.
        </p>
        <Link href="/blog" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Browse published blogs
        </Link>
      </div>
    );
  }

  // ─── Accepted — Normal Dashboard ───
  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Blog Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome, {user?.name}</p>
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
