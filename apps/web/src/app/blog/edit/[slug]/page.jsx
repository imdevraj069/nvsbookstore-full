import BlogEditor from '@/components/blog/BlogEditor';
import { connection, models } from '@repo/database';

const { Blog } = models;

export default async function EditBlogPage({ params }) {
  const { slug } = params;

  try {
    await connection();
    const blog = await Blog.findOne({ slug }).populate('author', 'name email _id');

    if (!blog) {
      return <div className="text-center py-8">Blog not found</div>;
    }

    return <BlogEditor initialBlog={JSON.parse(JSON.stringify(blog))} />;
  } catch (error) {
    return <div className="text-center py-8">Error loading blog</div>;
  }
}
