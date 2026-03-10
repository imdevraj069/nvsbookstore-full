'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, User, Eye, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { blogsAPI } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function BlogListingPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await blogsAPI.getAll(`page=${page}&limit=9`);
        if (data.success) {
          setBlogs(data.data || []);
          setPagination(data.pagination || { pages: 1, total: 0 });
        }
      } catch (err) {
        setError(err.message || 'Failed to load blogs');
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [page]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3">
            Our Blog
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            Stay updated with the latest articles, tips, and insights
          </p>
        </div>
        <div className="absolute -bottom-4 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -top-4 -left-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => setPage(1)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No blogs yet</h2>
            <p className="text-gray-500">Check back soon for new articles!</p>
          </div>
        ) : (
          <>
            {/* Blog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link
                  key={blog._id}
                  href={`/blog/${blog.slug}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Cover Image */}
                  {blog.coverImage?.url ? (
                    <div className="w-full h-48 overflow-hidden bg-gray-100">
                      <img
                        src={blog.coverImage.url}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 flex items-center justify-center">
                      <span className="text-5xl opacity-40">📄</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    {blog.category && (
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-3">
                        {blog.category}
                      </span>
                    )}
                    <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {blog.title}
                    </h2>
                    {blog.metaDescription && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                        {blog.metaDescription}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {blog.author?.name || blog.authorName || 'Author'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {blog.views || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-center text-sm text-gray-400 mt-4">
              {pagination.total} blog{pagination.total !== 1 ? 's' : ''} published
            </p>
          </>
        )}
      </div>
      </div>
      <Footer />
    </>
  );
}
