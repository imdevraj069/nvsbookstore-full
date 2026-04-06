import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/pdf-viewer.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { PrefetchProvider } from "@/components/PrefetchProvider";
import NotificationTicker from "@/components/NotificationTicker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  title: "NVS BookStore — Competitive Exam Books, Results & Notifications",
  description:
    "Your one-stop destination for competitive exam books, latest results, admit cards, and job notifications. UPSC, SSC, Banking, Railways & more.",
  keywords: "exam books, UPSC books, competitive exams, SSC, Banking, Railways, study materials",
  authors: [{ name: "NVS BookStore" }],
  creator: "NVS BookStore",
  publisher: "NVS BookStore",
  robots: "index, follow",
  openGraph: {
    title: "NVS BookStore — Competitive Exam Books, Results & Notifications",
    description:
      "Your one-stop destination for competitive exam books, latest results, admit cards, and job notifications. UPSC, SSC, Banking, Railways & more.",
    type: "website",
    url: "https://nvsbookstore.in",
    siteName: "NVS BookStore",
    locale: "en_US",
    images: [
      {
        url: "https://nvsbookstore.in/logo.png",
        width: 1200,
        height: 630,
        alt: "NVS BookStore Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NVS BookStore — Competitive Exam Books, Results & Notifications",
    description:
      "Your one-stop destination for competitive exam books, latest results, admit cards, and job notifications.",
    creator: "@nvsbookstore",
    images: ["https://nvsbookstore.in/logo.png"],
  },
  alternates: {
    canonical: "https://nvsbookstore.in",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CartProvider>
            <PrefetchProvider>
              <NotificationTicker />
              {children}
            </PrefetchProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
