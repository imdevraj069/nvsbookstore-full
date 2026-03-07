"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import NotificationTicker from "@/components/NotificationTicker";
import HeroSection from "@/components/HeroSection";
import InfoTriageGrid from "@/components/InfoTriageGrid";
import ProductShowcase from "@/components/ProductShowcase";
import Footer from "@/components/Footer";
import { productsAPI, notificationsAPI, settingsAPI } from "@/lib/api";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    productsAPI.getFeatured().then((r) => setFeaturedProducts(r.data || [])).catch(() => {});
    notificationsAPI.getAll().then((r) => setNotifications(r.data || [])).catch(() => {});
    settingsAPI.getBanners().then((r) => setBanners(r.data?.banners || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NotificationTicker items={notifications} />
      <main>
        <HeroSection banners={banners} />
        <ProductShowcase products={featuredProducts} />
        <InfoTriageGrid />
        <ProductShowcase products={featuredProducts} moreOnly />
      </main>
      <Footer />
    </div>
  );
}
