// Server component to generate dynamic metadata for product pages

async function getProductMetadata(slug) {
  try {
    // Fetch product data on the server
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/products/slug/${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Prevent stale cache during development
    });
    
    if (!response.ok) {
      console.warn(`[Product Metadata] API returned ${response.status} for slug: ${slug}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[Product Metadata] Error fetching product for slug ${slug}:`, error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = params;
  const result = await getProductMetadata(slug);
  
  // Handle response structure - API might return data directly or wrapped in data object
  const product = result?.data || result;
  
  if (!product || !product.title) {
    console.warn(`[Product Metadata] No valid product data for slug: ${slug}`);
    return {
      title: 'NVS BookStore',
      description: 'Explore our collection of competitive exam books and resources.',
    };
  }
  
  // Construct image URL
  let imageUrl = '/logo.png'; // Default fallback
  
  if (product.thumbnail?.url) {
    imageUrl = product.thumbnail.url;
  } else if (product.thumbnail?.key) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    imageUrl = `${apiUrl}/files/serve/${encodeURIComponent(product.thumbnail.key)}?type=image`;
  } else if (product.image) {
    imageUrl = product.image;
  }
  
  // Ensure absolute URL for OG image
  if (imageUrl.startsWith('/')) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nvsbookstore.in';
    imageUrl = `${siteUrl}${imageUrl}`;
  }
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nvsbookstore.in';
  const productDescription = product.description || `Buy ${product.title} from NVS BookStore - Your destination for competitive exam books and resources.`;
  const authorText = product.author ? `by ${product.author}` : 'Available at NVS BookStore';
  
  return {
    title: `${product.title} | NVS BookStore`,
    description: productDescription,
    keywords: [product.title, product.author, 'competitive exam', 'books'].filter(Boolean),
    openGraph: {
      title: product.title,
      description: productDescription,
      type: 'product',
      url: `${siteUrl}/product/${product.slug}`,
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
      description: productDescription,
      images: [imageUrl],
    },
  };
}

export default function ProductLayout({ children }) {
  return children;
}
