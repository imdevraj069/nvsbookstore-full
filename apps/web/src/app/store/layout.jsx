export const metadata = {
  title: 'Shop All Books | NVS BookStore',
  description: 'Browse our complete collection of competitive exam books, study materials, and resources. UPSC, SSC, Banking, Railways, and more.',
  openGraph: {
    title: 'Shop All Books | NVS BookStore',
    description: 'Browse our complete collection of competitive exam books, study materials, and resources.',
    type: 'website',
    url: 'https://nvsbookstore.in/store',
    siteName: 'NVS BookStore',
    images: [
      {
        url: 'https://nvsbookstore.in/logo.png',
        width: 1200,
        height: 630,
        alt: 'NVS BookStore Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Books | NVS BookStore',
    description: 'Browse our complete collection of competitive exam books.',
    image: 'https://nvsbookstore.in/logo.png',
  },
};

export default function StoreLayout({ children }) {
  return children;
}
