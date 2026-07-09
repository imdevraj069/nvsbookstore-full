// Metadata generation for notification pages

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nvsbookstore.in";
// For server-side metadata generation, use internal docker service URL
const INTERNAL_API_URL = "http://read-service:3001";

async function getNotificationMetadata(slug) {
  try {
    const response = await fetch(
      `${INTERNAL_API_URL}/api/notifications/slug/${slug}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      console.warn(
        `[Metadata] Notification API ${response.status} for slug: ${slug}`
      );
      return null;
    }
    const data = await response.json();
    return data?.data || data || null;
  } catch (error) {
    console.warn(
      `[Metadata] Notification fetch error for ${slug}:`,
      error.message
    );
    return null;
  }
}

export async function generateMetadata({ params }) {
  const param = await Promise.resolve(params);
  const slug = param.slug;

  console.log(`[Metadata] Generating metadata for notification slug: ${slug}`);
  const notification = await getNotificationMetadata(slug);

  const defaultMetadata = {
    title: "Notification | NVS BookStore",
    description: "View important notifications and updates from NVS BookStore",
    openGraph: {
      title: "Notification | NVS BookStore",
      description: "View important notifications and updates from NVS BookStore",
      url: `${SITE_URL}/notification/${slug}`,
      type: "website",
      siteName: "NVS BookStore",
      images: [
        {
          url: `${SITE_URL}/logo.png`,
          width: 1200,
          height: 630,
          alt: "NVS BookStore",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Notification | NVS BookStore",
      description: "View important notifications and updates from NVS BookStore",
      image: `${SITE_URL}/logo.png`,
      creator: "@nvsbookstore",
    },
  };

  if (!notification?.title) return defaultMetadata;

  return {
    title: `${notification.title} | NVS BookStore`,
    description: notification.description || "View this notification",
    keywords: [
      notification.title,
      ...(notification.tags || []),
      "notification",
      "announcement",
    ],
    openGraph: {
      title: notification.title,
      description: notification.description || "View this notification",
      type: "article",
      publishedTime: notification.createdAt,
      url: `${SITE_URL}/notification/${slug}`,
      siteName: "NVS BookStore",
      images: [
        {
          url: `${SITE_URL}/logo.png`,
          width: 1200,
          height: 630,
          alt: notification.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: notification.title,
      description: notification.description || "View this notification",
      image: `${SITE_URL}/logo.png`,
      creator: "@nvsbookstore",
    },
  };
}

export async function generateStaticParams() {
  try {
    const response = await fetch(`${INTERNAL_API_URL}/api/notifications`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.warn(
        `[StaticParams] Notifications API returned ${response.status}`
      );
      return [];
    }
    const notifications = await response.json();
    const items = notifications.data || [];
    console.log(
      `[StaticParams] Generated params for ${items.length} notifications`
    );
    return items.slice(0, 100).map((n) => ({ slug: n.slug }));
  } catch (error) {
    console.warn(
      "[StaticParams] Notification error:",
      error.message
    );
    console.warn("[StaticParams] Continuing with dynamic params only...");
    return [];
  }
}

export const dynamicParams = true;
export const revalidate = 3600;

export default function NotificationLayout({ children }) {
  return children;
}
