"use client";

import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { notificationsAPI } from "@/lib/api";

export default function NotificationTicker({ items: propItems }) {
  const [isHovered, setIsHovered] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (propItems?.length) {
      setNotifications(propItems.map((n) => ({
        text: n.title || n.text,
        slug: n.slug,
      })));
    } else {
      notificationsAPI.getAll()
        .then((r) => {
          const data = r.data || [];
          setNotifications(data.map((n) => ({ text: n.title, slug: n.slug })));
        })
        .catch(() => setNotifications([]));
    }
  }, [propItems]);

  const doubled = [...notifications, ...notifications];

  if (!notifications.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white overflow-hidden relative"
    >
      <div className="max-w-7xl mx-auto flex items-center">
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-700/90 backdrop-blur-sm text-xs font-bold uppercase tracking-wide z-10">
          <Bell className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">Updates</span>
        </div>

        <div className="flex-1 overflow-hidden" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <div className="flex animate-marquee whitespace-nowrap py-2" style={{ animationPlayState: isHovered ? 'paused' : 'running' }}>
            {doubled.map((notif, i) => (
              <Link key={i} href={`/notification/${notif.slug}`} target="_blank" rel="noopener noreferrer">
                <span className="mx-6 text-sm font-medium inline-flex items-center gap-2 cursor-pointer hover:text-white/80 transition-opacity">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                  {notif.text}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
