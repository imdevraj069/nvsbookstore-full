import ProductPageClient from './ProductPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nvsbookstore.in';
// For server-side metadata generation, use internal docker service URL
// For client-side, use NEXT_PUBLIC_API_URL which is /api (proxied through nginx)
const INTERNAL_API_URL = 'http://read-service:3001';

// Fetch product for metadata generation (server-side)
async function getProductForMetadata(slug) {
  try {
    const response = await fetch(`${INTERNAL_API_URL}/api/products/slug/${slug}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      console.warn(`[Metadata] Product API ${response.status} for slug: ${slug}`);
      return null;
    }
    
    const data = await response.json();
    return data?.data || data;
  } catch (error) {
    console.error(`[Metadata] Fetch error for ${slug}:`, error.message);
    return null;
  }
}

// Generate static params for better performance
export async function generateStaticParams() {
  try {
    const response = await fetch(`${INTERNAL_API_URL}/api/products`, {
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      console.warn(`[StaticParams] API returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const products = Array.isArray(data) ? data : (data?.data || []);
    
    console.log(`[StaticParams] Generated params for ${products.length} products`);
    return products.slice(0, 100).map(p => ({ slug: p.slug }));
  } catch (error) {
    console.warn('[StaticParams] Error:', error.message);
    console.warn('[StaticParams] Continuing with dynamic params only...');
    return [];
  }
}

export const dynamicParams = true;

// Viewport configuration (moved from metadata)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Generate metadata for the page
export async function generateMetadata({ params }) {
  const param = await params;
  const slug = param.slug;
  
  console.log(`[Metadata] Generating metadata for slug: ${slug}`);
  const product = await getProductForMetadata(slug);
  
  // Build image URL - use public SITE_URL for sharing
  let imageUrl = `${SITE_URL}/logo.png`;
  
  if (product?.thumbnail?.url) {
    imageUrl = product.thumbnail.url.startsWith('http')
      ? product.thumbnail.url
      : `${SITE_URL}${product.thumbnail.url}`;
  } else if (product?.thumbnail?.key) {
    // Use SITE_URL instead of INTERNAL_API_URL for public accessibility
    imageUrl = `${SITE_URL}/api/files/serve/${encodeURIComponent(product.thumbnail.key)}?type=image`;
    console.log(`[Metadata] Image URL for sharing: ${imageUrl}`);
  }
  
  // If no product found, return basic metadata
  if (!product?.title) {
    return {
      title: 'Product | NVS BookStore',
      description: 'Discover our collection of competitive exam books.',
      openGraph: {
        title: 'Product | NVS BookStore',
        description: 'Discover our collection of competitive exam books.',
        url: `${SITE_URL}/product/${slug}`,
        type: 'website',
        siteName: 'NVS BookStore',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: 'NVS BookStore' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Product | NVS BookStore',
        description: 'Discover our collection of competitive exam books.',
        image: imageUrl,
        creator: '@nvsbookstore',
      },
    };
  }
  
  // Return product-specific metadata
  return {
    title: `${product.title} | NVS BookStore`,
    description: product.description || `Buy ${product.title} from NVS BookStore`,
    keywords: [product.title, product.author, 'exam books'].filter(Boolean),
    openGraph: {
      title: product.title,
      description: product.description || `Buy ${product.title} from NVS BookStore`,
      url: `${SITE_URL}/product/${slug}`,
      type: 'website',
      siteName: 'NVS BookStore',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description || `Buy ${product.title}`,
      image: imageUrl,
      creator: '@nvsbookstore',
    },
  };
}

export default function Page({ params }) {
  return <ProductPageClient params={params} />;
}
