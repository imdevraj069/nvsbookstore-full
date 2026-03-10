'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Eye, ThumbsUp } from 'lucide-react';
import { blogsAPI } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function BlogPage() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        const data = await blogsAPI.getBySlug(slug);
        if (data.success) {
          setBlog(data.data);
        } else {
          setError(data.error || 'Blog not found');
        }
      } catch (err) {
        setError(err.message || 'Error loading blog');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="max-w-4xl mx-auto p-6 text-center py-12">
          <p className="text-gray-600">Loading blog...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !blog) {
    return (
      <>
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-800">Blog not found</h1>
            <p className="text-gray-600 mt-2">This blog is not available.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <article className="w-full">
      {/* Header Image */}
      {blog.headerImage?.url && (
        <div className="w-full h-96 overflow-hidden">
          <img
            src={blog.headerImage.url}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Title and Meta */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{blog.title}</h1>

          <div className="flex items-center justify-between text-gray-600 border-b pb-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold text-gray-800">
                  {blog.author?.name || blog.authorName}
                </p>
                <p className="text-sm">
                  {new Date(blog.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Eye size={18} />
                <span>{blog.views || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsUp size={18} />
                <span>{blog.likes || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Description */}
        {blog.metaDescription && (
          <p className="text-lg text-gray-600 mb-8 italic">
            {blog.metaDescription}
          </p>
        )}

        {/* Cover Image */}
        {blog.coverImage?.url && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={blog.coverImage.url}
              alt={blog.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
      <Footer />
    </>
  );
}
