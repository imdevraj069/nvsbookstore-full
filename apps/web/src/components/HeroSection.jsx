"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Send,
  MessageCircle,
  Youtube,
  ArrowRight,
  Briefcase,
  Image as ImageIcon,
  ShoppingCart,
  Trophy,
} from "lucide-react";
import { siteConfig, quickLinks } from "@/data/siteConfig";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const iconMap = {
  Phone,
  Send,
  MessageCircle,
  Youtube,
};

const resolveImageUrl = (img) => {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/")) {
    return img;
  }
  return `/files/serve/${encodeURIComponent(img)}?type=image`;
};

export default function HeroSection({ banners }) {
  const slides = banners && banners.length > 0 ? banners : [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current];
  const hasText = !!(slide?.title || slide?.heading || slide?.subtitle || slide?.sub || slide?.tag || slide?.ctaText || slide?.cta);

  return (
    <section className="max-w-7xl mx-auto px-4 pt-4 pb-3 space-y-3">
      {/* Banner carousel — only if admin banners exist */}
      {slides.length > 0 && slide && (
      <div className="relative rounded-xl overflow-hidden shadow-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`bg-gradient-to-br ${slide.gradient || 'from-indigo-600 via-violet-600 to-purple-700'} relative overflow-hidden w-full aspect-[2/1] md:aspect-[5/1]`}
          >
            {/* Banner image background — responsive desktop/mobile */}
            {(slide.desktopImageUrl || slide.mobileImageUrl || slide.imageUrl) && (
              <div className="absolute inset-0">
                {/* Desktop image */}
                {(slide.desktopImageUrl || slide.imageUrl) && (
                  <img
                    src={resolveImageUrl(slide.desktopImageUrl || slide.imageUrl)}
                    alt={slide.title || "Banner"}
                    className={`w-full h-full object-cover ${slide.mobileImageUrl ? 'hidden md:block' : 'block'}`}
                  />
                )}
                {/* Mobile image (shown only if a separate mobile image exists) */}
                {slide.mobileImageUrl && (
                  <img
                    src={resolveImageUrl(slide.mobileImageUrl)}
                    alt={slide.title || "Banner"}
                    className="w-full h-full object-cover md:hidden"
                  />
                )}
                {hasText && (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/75 md:from-black/60 md:via-black/20 md:to-black/60 z-0"></div>
                )}
              </div>
            )}

            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-10 z-0">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
            </div>

            {/* Entire banner clickable if there's no text overlay but a link is present */}
            {!hasText && slide.ctaLink && (
              <Link href={slide.ctaLink} className="absolute inset-0 z-20 cursor-pointer">
                <span className="sr-only">{slide.title || "Go to link"}</span>
              </Link>
            )}

            {/* Slide indicators absolute positioned if there's no text overlay */}
            {!hasText && slides.length > 1 && (
              <div className="absolute bottom-4 right-4 z-20 flex gap-1 sm:gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                      i === current
                        ? "w-4 sm:w-6 bg-white"
                        : "w-1 sm:w-1.5 bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Content overlay */}
            {hasText && (
              <div className="absolute inset-0 z-10 p-3 sm:p-5 md:p-8 lg:p-10 flex flex-col justify-between text-white select-none">
                {/* Top row: Brand & Tag */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-white/90 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest">
                    {siteConfig.name}
                  </span>
                  {slide.tag && (
                    <span className="px-2 sm:px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[9px] sm:text-[11px] font-semibold text-white">
                      {slide.tag}
                    </span>
                  )}
                </div>

                {/* Middle row: Title & Subtitle */}
                <div className="flex-1 flex flex-col justify-center max-w-xl md:max-w-2xl lg:max-w-3xl my-1 sm:my-0">
                  <motion.h2
                    key={`h-${current}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="text-xs sm:text-lg md:text-2xl lg:text-3xl font-extrabold text-white leading-tight line-clamp-2"
                  >
                    {slide.title || slide.heading}
                  </motion.h2>
                  {(slide.subtitle || slide.sub) && (
                    <p className="text-white/80 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 max-w-md sm:max-w-xl line-clamp-1 sm:line-clamp-2">
                      {slide.subtitle || slide.sub}
                    </p>
                  )}
                </div>

                {/* Bottom row: Button & Indicators */}
                <div className="flex items-center justify-between w-full">
                  {(slide.ctaText || slide.cta) && slide.ctaLink ? (
                    <Link href={slide.ctaLink}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full px-3 py-1 sm:px-5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-semibold shadow-lg bg-white hover:bg-gray-100 text-black border-0 h-auto"
                      >
                        {slide.ctaText || slide.cta}
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                      </Button>
                    </Link>
                  ) : <div />}

                  {/* Slide indicators */}
                  {slides.length > 1 && (
                    <div className="flex gap-1 sm:gap-1.5">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrent(i)}
                          className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                            i === current
                              ? "w-4 sm:w-6 bg-white"
                              : "w-1 sm:w-1.5 bg-white/40 hover:bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Decorative blurs */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl z-0" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10 blur-xl z-0" />
          </motion.div>
        </AnimatePresence>
      </div>
      )}

      {/* Quick Navigation Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jobs", icon: Briefcase, href: "/notifications/jobs", color: "from-blue-500 to-cyan-500" },
          { label: "Photoframes", icon: ImageIcon, href: "/store?tag=photo-frame", color: "from-purple-500 to-pink-500" },
          { label: "Store", icon: ShoppingCart, href: "/store", color: "from-emerald-500 to-teal-500" },
          { label: "Results", icon: Trophy, href: "/notifications/result", color: "from-orange-500 to-amber-500" },
        ].map((item) => (
          <Link key={item.label} href={item.href}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-gradient-to-br ${item.color} rounded-xl p-4 sm:p-5 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-2.5 text-white group`}
            >
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-sm font-semibold text-center">{item.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Contact Quick Links */}
        {quickLinks.map((link, idx) => {
          const Icon = iconMap[link.icon];
          const colors = [
            { bg: "bg-gradient-to-r from-indigo-500 to-blue-500", border: "border-indigo-400", text: "text-white", glow: "shadow-lg shadow-indigo-400/50" },
            { bg: "bg-gradient-to-r from-purple-500 to-pink-500", border: "border-purple-400", text: "text-white", glow: "shadow-lg shadow-purple-400/50" },
            { bg: "bg-gradient-to-r from-amber-500 to-orange-500", border: "border-amber-400", text: "text-white", glow: "shadow-lg shadow-amber-400/50" },
            { bg: "bg-gradient-to-r from-emerald-500 to-teal-500", border: "border-emerald-400", text: "text-white", glow: "shadow-lg shadow-emerald-400/50" },
          ];
          const color = colors[idx % colors.length];
          
          return (
            <a
              key={link.label}
              href={link.href}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full ${color.bg} border ${color.border} ${color.text} font-semibold text-sm transition-all duration-300 hover:scale-105 hover:shadow-xl ${color.glow} backdrop-blur-sm`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {link.label}
            </a>
          );
        })}
    </section>
  );
}
