"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, ExternalLink, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notificationsAPI } from "@/lib/api";

const colorMap = {
  results: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", hover: "hover:bg-emerald-50", dot: "bg-emerald-400" },
  "admit-card": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", hover: "hover:bg-blue-50", dot: "bg-blue-400" },
  "latest-jobs": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", hover: "hover:bg-amber-50", dot: "bg-amber-400" },
  others: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", hover: "hover:bg-purple-50", dot: "bg-purple-400" },
};

export default function NotificationsByTagPage({ params }) {
  const param = React.use(params);
  const tagId = param.tag;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.getByTag(tagId)
      .then((r) => setNotifications(r.data || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [tagId]);

  const colors = colorMap[tagId] || colorMap.others;
  const tagTitle = tagId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const isNew = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    return diff <= 5;
  };

  const sorted = [...notifications].sort((a, b) => {
    const aNew = isNew(a.publishDate) ? 1 : 0;
    const bNew = isNew(b.publishDate) ? 1 : 0;
    return bNew - aNew;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href="/">
            <Button variant="ghost" className="mb-6 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${colors.text}`}>{tagTitle}</h1>
            <p className="text-gray-600 mt-2">Showing {notifications.length} {tagTitle.toLowerCase()} items</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications found for this category</p>
            </div>
          ) : (
            <Card className={`border-2 ${colors.border} overflow-hidden`}>
              <CardHeader className={`${colors.bg} py-4 px-6`}>
                <CardTitle className={`text-xl font-bold ${colors.text}`}>{tagTitle}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {sorted.map((item, idx) => (
                    <motion.li
                      key={item._id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <Link href={`/notification/${item.slug}`}>
                        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 ${colors.hover} transition-colors group cursor-pointer`}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                            <span className="flex-1 truncate">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isNew(item.publishDate) && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full whitespace-nowrap">NEW</span>
                            )}
                            {item.publishDate && (
                              <span className="text-xs text-gray-400 hidden sm:block">
                                {new Date(item.publishDate).toLocaleDateString()}
                              </span>
                            )}
                            <ExternalLink className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
