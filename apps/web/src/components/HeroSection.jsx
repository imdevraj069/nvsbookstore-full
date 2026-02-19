"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Send,
  MessageCircle,
  Youtube,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { siteConfig, quickLinks } from "@/data/siteConfig";
import { Button } from "@/components/ui/button";

const iconMap = {
  Phone,
  Send,
  MessageCircle,
  Youtube,
};

const slides = [
  {
    tag: "📚 Mega Book Sale 2026",
    heading: "Flat 30% OFF on All Competitive Exam Books",
    sub: "UPSC, SSC, Banking, Railways & more",
    cta: "Shop Now",
    gradient: "from-indigo-600 via-violet-600 to-purple-700",
  },
  {
    tag: "🎯 New Arrivals",
    heading: "Laxmikanth 7th Ed. & Spectrum Modern History",
    sub: "Just restocked — grab your copy today!",
    cta: "Browse Books",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
  },
  {
    tag: "📝 Results Alert",
    heading: "UPSC CSE Prelims 2025 Result Declared",
    sub: "Check your result & download scorecard",
    cta: "Check Now",
    gradient: "from-orange-600 via-red-600 to-rose-700",
  },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <section className="max-w-7xl mx-auto px-4 pt-4 pb-3 space-y-3">
      {/* Combined Banner with Branding overlay */}
      <div className="relative rounded-xl overflow-hidden shadow-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`bg-gradient-to-br ${slide.gradient} relative`}
          >
            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 px-5 py-6 sm:py-8 sm:px-8 flex flex-col gap-3">
              {/* Brand name on top */}
              <div className="flex items-center justify-between">
                <span className="text-white/90 text-xs sm:text-sm font-bold uppercase tracking-widest">
                  {siteConfig.name}
                </span>
                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[11px] font-semibold text-white">
                  {slide.tag}
                </span>
              </div>

              {/* Slide content */}
              <motion.h2
                key={`h-${current}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight max-w-lg"
              >
                {slide.heading}
              </motion.h2>
              <p className="text-white/75 text-sm max-w-md">{slide.sub}</p>

              <div className="flex items-center gap-3 mt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full px-5 font-semibold shadow-lg text-sm"
                >
                  {slide.cta}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                {/* Slide indicators */}
                <div className="flex gap-1.5 ml-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === current
                          ? "w-6 bg-white"
                          : "w-1.5 bg-white/40 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Decorative blurs */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Links Row */}
      <div className="flex items-center gap-2 flex-wrap">
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
      </div>
    </section>
  );
}
