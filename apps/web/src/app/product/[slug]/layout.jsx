// Server component to generate dynamic metadata for product pages
import { productsAPI } from "@/lib/api";

async function getProductMetadata(slug) {
  try {
    // Fetch product data on the server
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/products/slug/${slug}`, {
      cache: 'revalidate',
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching product metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = params;
  const result = await getProductMetadata(slug);
  
  if (!result?.data) {
    return {
      title: 'Product Not Found | NVS BookStore',
      description: 'This product could not be found.',
    };
  }
  
  const product = result.data;
  
  // Construct image URL
  let imageUrl = product.thumbnail?.url || product.image || '/logo.png';
  if (product.thumbnail?.key && (!imageUrl || imageUrl.startsWith('/'))) {
    imageUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/files/serve/${encodeURIComponent(product.thumbnail.key)}?type=image`;
  }
  
  // Ensure absolute URL for OG image
  if (imageUrl.startsWith('/')) {
    imageUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nvsbookstore.in'}${imageUrl}`;
  }
  
  return {
    title: `${product.title} | NVS BookStore`,
    description: product.description || `Buy ${product.title} from NVS BookStore - Your destination for competitive exam books and resources.`,
    openGraph: {
      title: product.title,
      description: product.description || `${product.author ? `by ${product.author}` : 'Available at NVS BookStore'}`,
      type: 'product',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nvsbookstore.in'}/product/${product.slug}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.title,
        },
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: product.title,
        },
      ],
      siteName: 'NVS BookStore',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description || `${product.author ? `by ${product.author}` : 'Available at NVS BookStore'}`,
      images: [imageUrl],
    },
  };
}

export default function ProductLayout({ children }) {
  return children;
}
