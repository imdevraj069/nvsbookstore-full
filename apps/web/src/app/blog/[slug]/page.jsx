import { connection } from '@/lib/db';
import Blog from '../../../../../packages/database/src/models/Blog';
import { Eye, ThumbsUp } from 'lucide-react';

export default async function BlogPage({ params }) {
  const { slug } = params;

  try {
    await connection();
    const blog = await Blog.findOne({ slug }).populate('author', 'name email _id');

    if (!blog || !blog.isPublished) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-800">Blog not found</h1>
            <p className="text-gray-600 mt-2">This blog is not available.</p>
          </div>
        </div>
      );
    }

    const blogData = JSON.parse(JSON.stringify(blog));

    return (
      <article className="w-full">
        {/* Header Image */}
        {blogData.headerImage?.url && (
          <div className="w-full h-96 overflow-hidden">
            <img
              src={blogData.headerImage.url}
              alt={blogData.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Title and Meta */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{blogData.title}</h1>

            <div className="flex items-center justify-between text-gray-600 border-b pb-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-800">
                    {blogData.author?.name || blogData.authorName}
                  </p>
                  <p className="text-sm">
                    {new Date(blogData.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Eye size={18} />
                  <span>{blogData.views || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsUp size={18} />
                  <span>{blogData.likes || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Description */}
          {blogData.metaDescription && (
            <p className="text-lg text-gray-600 mb-8 italic">
              {blogData.metaDescription}
            </p>
          )}

          {/* Cover Image */}
          {blogData.coverImage?.url && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={blogData.coverImage.url}
                alt={blogData.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: blogData.content }}
          />

          {/* Tags */}
          {blogData.tags && blogData.tags.length > 0 && (
            <div className="border-t pt-6 mt-6">
              <div className="flex flex-wrap gap-2">
                {blogData.tags.map((tag) => (
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
    );
  } catch (error) {
    console.error('Error loading blog:', error);
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold">Error loading blog</h1>
      </div>
    );
  }
}
