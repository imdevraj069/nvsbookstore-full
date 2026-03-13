// Metadata generation for notification pages

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nvsbookstore.in";

async function getNotificationMetadata(slug) {
  try {
    const response = await fetch(`${SITE_URL}/api/notifications/slug/${slug}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`[Metadata] Notification API error for slug: ${slug}`);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const param = await Promise.resolve(params);
  const slug = param.slug;
  const notification = await getNotificationMetadata(slug);

  const defaultMetadata = {
    title: "Notification - NVS Bookstore",
    description: "View important notifications and updates",
    openGraph: {
      title: "Notification - NVS Bookstore",
      description: "View important notifications and updates",
      url: `${SITE_URL}/notification/${slug}`,
      images: [
        {
          url: `${SITE_URL}/og-default.jpg`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };

  if (!notification) return defaultMetadata;

  return {
    title: `${notification.title} - NVS Bookstore`,
    description: notification.description || "View this notification",
    keywords: [
      notification.title,
      ...(notification.tags || []),
      "notification",
      "announcement",
    ],
    openGraph: {
      title: notification.title,
      description: notification.description,
      type: "article",
      publishedTime: notification.createdAt,
      url: `${SITE_URL}/notification/${slug}`,
      images: [
        {
          url: `${SITE_URL}/og-default.jpg`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export async function generateStaticParams() {
  try {
    const response = await fetch(`${SITE_URL}/api/notifications`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) return [];
    const notifications = await response.json();
    return (notifications.data || []).slice(0, 100).map((n) => ({ slug: n.slug }));
  } catch (error) {
    console.error("[Metadata] Failed to generate static params for notifications");
    return [];
  }
}

export const revalidate = 3600; // ISR: revalidate every hour

export default function NotificationLayout({ children }) {
  return children;
}
