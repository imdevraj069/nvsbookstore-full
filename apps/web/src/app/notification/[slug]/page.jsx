"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Share2, Bookmark, ExternalLink, Calendar, MapPin,
  Building, FileText, Loader2, Clock
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notificationsAPI } from "@/lib/api";
import "./notification-content.css";

export default function NotificationPage({ params }) {
  const param = React.use(params);
  const slug = param.slug;
  const [notification, setNotification] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.getBySlug(slug)
      .then((r) => setNotification(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    notificationsAPI.getAll()
      .then((r) => setRelated((r.data || []).filter((n) => n.slug !== slug).slice(0, 5)))
      .catch(() => {});
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        <Footer />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Notification Not Found</h1>
          <Link href="/"><Button className="mt-4">Back to Home</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  const links = [
    { url: notification.applyUrl, label: "Apply Online", color: "bg-green-600 hover:bg-green-700" },
    { url: notification.websiteUrl, label: "Official Website", color: "bg-blue-600 hover:bg-blue-700" },
    { url: notification.loginUrl, label: "Login", color: "bg-indigo-600 hover:bg-indigo-700" },
    { url: notification.resultUrl, label: "Check Result", color: "bg-emerald-600 hover:bg-emerald-700" },
    { url: notification.admitCardUrl, label: "Admit Card", color: "bg-purple-600 hover:bg-purple-700" },
    { url: notification.pdfUrl || notification.pdfFile?.url, label: "Download PDF", color: "bg-red-600 hover:bg-red-700" },
  ].filter((l) => l.url);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-orange-50/20 to-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href="/">
            <Button variant="ghost" className="mb-6 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>

          <Card className="border-gray-200 shadow-lg overflow-hidden">
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl">{notification.title}</CardTitle>
                  {notification.description && (
                    <p className="text-white/80 mt-2 text-sm">{notification.description}</p>
                  )}
                </div>
                {notification.priority === "urgent" && (
                  <span className="px-3 py-1 bg-red-700/50 rounded-full text-xs font-bold uppercase">Urgent</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {notification.publishDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>{new Date(notification.publishDate).toLocaleDateString()}</span>
                  </div>
                )}
                {notification.lastDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-red-50 p-3 rounded-xl">
                    <Clock className="w-4 h-4 text-red-500" />
                    <span>Last: {new Date(notification.lastDate).toLocaleDateString()}</span>
                  </div>
                )}
                {notification.department && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <Building className="w-4 h-4 text-indigo-500" />
                    <span className="truncate">{notification.department}</span>
                  </div>
                )}
                {notification.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="truncate">{notification.location}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {notification.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {notification.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/notifications/${tag}`}
                      className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Action Links */}
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {links.map(({ url, label, color }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-4 py-2 ${color} text-white text-sm font-medium rounded-lg shadow-sm transition-all`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {label}
                    </a>
                  ))}
                </div>
              )}

              {/* Rich Content */}
              {notification.content && (
                <div
                  className="notification-content max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: notification.content }}
                />
              )}

              {/* Share */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
                <Button variant="outline" className="rounded-xl">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
                <Button variant="outline" className="rounded-xl">
                  <Bookmark className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>

              {/* Related */}
              {related.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Notifications</h3>
                  <div className="space-y-2">
                    {related.map((notif) => (
                      <Link
                        key={notif._id}
                        href={`/notification/${notif.slug}`}
                        className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-700 line-clamp-1">{notif.title}</p>
                        {notif.publishDate && (
                          <p className="text-xs text-gray-400 mt-1">{new Date(notif.publishDate).toLocaleDateString()}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
