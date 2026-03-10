import BlogDashboard from '@/components/blog/BlogDashboard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Blog Dashboard | NVS Bookstore',
  description: 'Manage your blog posts and writings',
};

export default function BlogDashboardPage() {
  return (
    <>
      <Header />
      <BlogDashboard />
      <Footer />
    </>
  );
}
