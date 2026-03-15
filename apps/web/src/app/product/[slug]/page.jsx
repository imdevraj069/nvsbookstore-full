import ProductPage from "./productPage";

export async function generateMetadata({ params }) {
  const slug = params.slug;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${slug}`, {
      cache: "no-store",
    });

    const product = await res.json();

    const image =
      product?.thumbnail?.url ||
      product?.image ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/default-product.jpg`;

    return {
      title: product.title,
      description: product.description || "View this product",
      openGraph: {
        title: product.title,
        description: product.description,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${slug}`,
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: product.title,
        description: product.description,
        images: [image],
      },
    };
  } catch (e) {
    return {
      title: "Product",
      description: "View product",
    };
  }
}

export default function Page({ params }) {
  return <ProductPage params={params} />;
}