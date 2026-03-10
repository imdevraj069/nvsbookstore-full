import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

export const metadata = {
  title: "NVS BookStore — Competitive Exam Books, Results & Notifications",
  description:
    "Your one-stop destination for competitive exam books, latest results, admit cards, and job notifications. UPSC, SSC, Banking, Railways & more.",
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
