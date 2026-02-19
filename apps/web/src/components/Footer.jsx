"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Send,
  Mail,
  Phone,
  MapPin,
  Heart,
  ArrowUp,
} from "lucide-react";
import { footerLinks, siteConfig } from "@/data/siteConfig";

const socialIconMap = {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Send,
};

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">NVS</span>
                <span className="text-xs font-semibold text-indigo-400 ml-0.5">
                  BookStore
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              {footerLinks.about.description}
            </p>
            {/* Social Links */}
            <div className="flex gap-2">
              {footerLinks.social.map((s) => {
                const Icon = socialIconMap[s.icon];
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition-colors"
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                  </a>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-4"
          >
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-indigo-500" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-4"
          >
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm">
                <Mail className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>{footerLinks.contact.email}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm">
                <Phone className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>{footerLinks.contact.phone}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>{footerLinks.contact.address}</span>
              </li>
            </ul>
          </motion.div>

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-4"
          >
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">
              Stay Updated
            </h4>
            <p className="text-sm text-gray-400">
              Get exam notifications and book deals directly in your inbox.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-semibold text-white transition-colors flex-shrink-0">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            © 2026 NVS BookStore. All rights reserved. Made with{" "}
            <Heart className="w-3 h-3 inline text-red-500 fill-red-500" /> in
            India.
          </p>
          <button
            onClick={scrollToTop}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
