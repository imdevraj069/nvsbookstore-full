import BlogEditor from '@/components/blog/BlogEditor';
import { connection } from '@/lib/db';
import Blog from '@sarkari/database/src/models/Blog';

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
