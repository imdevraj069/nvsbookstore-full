// Server component to generate dynamic metadata for product pages

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nvsbookstore.in';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getProductMetadata(slug) {
  try {
    const response = await fetch(`${API_URL}/api/products/slug/${slug}`, {
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

export async function generateStaticParams() {
  try {
    const response = await fetch(`${API_URL}/api/products`, {
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

export async function generateMetadata({ params }) {
  const { slug } = params;
  const product = await getProductMetadata(slug);
  
  // Build image URL first (used in both cases)
  let imageUrl = `${SITE_URL}/logo.png`;
  
  // If product found, use product image
  if (product?.thumbnail?.url) {
    imageUrl = product.thumbnail.url.startsWith('http')
      ? product.thumbnail.url
      : `${SITE_URL}${product.thumbnail.url}`;
  } else if (product?.thumbnail?.key) {
    imageUrl = `${API_URL}/files/serve/${encodeURIComponent(product.thumbnail.key)}?type=image`;
  }
  
  // If no product found, return a basic metadata (don't inherit from parent)
  if (!product?.title) {
    return {
      title: `Product | NVS BookStore`,
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

export default function ProductLayout({ children }) {
  return children;
}
