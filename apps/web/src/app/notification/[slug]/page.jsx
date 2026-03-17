"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Share2,
  Loader2,
  Bell,
  Calendar,
  Tag,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationsAPI } from "@/lib/api";
import "./notification-content.css";

export default function NotificationPage({ params }) {
  const param = React.use(params);
  const slug = param.slug;
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedNotifications, setRelatedNotifications] = useState([]);

  useEffect(() => {
    notificationsAPI
      .getBySlug(slug)
      .then((r) => {
        setNotification(r.data);
        // Load related notifications by tag
        if (r.data?.tags && r.data.tags.length > 0) {
          notificationsAPI
            .getByTag(r.data.tags[0])
            .then((tagRes) => {
              setRelatedNotifications(
                (tagRes.data || []).filter((n) => n.slug !== slug).slice(0, 3)
              );
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = async () => {
    if (!notification) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: notification.title,
          text: notification.description,
          url: window.location.href,
        });
      } catch (error) {
        if (error.name !== "AbortError") console.error("Share error:", error);
      }
    } else {
      // Fallback: copy to clipboard
      const text = `${notification.title}\n\n${notification.description}\n\n${window.location.href}`;
      navigator.clipboard.writeText(text).then(() => {
        alert("Notification copied to clipboard!");
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">
            Notification Not Found
          </h1>
          <Link href="/notifications">
            <Button className="mt-4">Browse Notifications</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-purple-50/20 to-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Decorative gradient blob */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-100/20 rounded-full blur-3xl -z-0" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Back Button */}
          <Link href="/notifications">
            <Button
              variant="ghost"
              className="mb-6 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Notifications
            </Button>
          </Link>

          {/* Main Content */}
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="p-8">
              {/* Meta Information */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-200"
              >
                <div className="flex items-center gap-4">
                  {/* Icon Circle */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-white" />
                  </div>

                  {/* Date and Category */}
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      {notification.createdAt
                        ? new Date(notification.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Recently"}
                    </div>
                    {notification.tags && notification.tags[0] && (
                      <Badge className="bg-blue-100 text-blue-700">
                        {notification.tags[0]}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Share notification"
                >
                  <Share2 className="w-5 h-5 text-gray-600 hover:text-blue-600" />
                </button>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold text-gray-900 mb-4"
              >
                {notification.title}
              </motion.h1>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="prose prose-blue max-w-none mb-8"
              >
                {notification.description && (
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {notification.description}
                  </div>
                )}
                {notification.content && (
                  <div
                    className="notification-content max-w-none text-gray-700 mt-4"
                    dangerouslySetInnerHTML={{ __html: notification.content }}
                  />
                )}
              </motion.div>

              {/* Tags */}
              {notification.tags && notification.tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-4 pt-6 border-t border-gray-200"
                >
                  <Tag className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-2">
                    {notification.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-sm cursor-pointer hover:bg-blue-50"
                      >
                        <Link href={`/notifications?tag=${encodeURIComponent(tag)}`}>
                          {tag}
                        </Link>
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Related Notifications */}
          {relatedNotifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="w-6 h-6 text-blue-600" />
                Related Notifications
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedNotifications.map((notif, idx) => (
                  <motion.div
                    key={notif._id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    whileHover={{ y: -2 }}
                  >
                    <Link href={`/notification/${notif.slug}`} target="_blank" rel="noopener noreferrer">
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300">
                        <CardContent className="p-5 flex flex-col h-full">
                          <div className="text-xs text-gray-500 mb-2">
                            {notif.createdAt
                              ? new Date(notif.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : "Recently"}
                          </div>

                          <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600">
                            {notif.title}
                          </h3>

                          <p className="text-gray-600 text-sm line-clamp-2 flex-grow">
                            {notif.description}
                          </p>

                          <div className="flex items-center text-blue-600 font-medium text-sm mt-3 group">
                            Read More
                            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 p-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white text-center"
          >
            <h3 className="text-2xl font-bold mb-2">Stay Updated</h3>
            <p className="mb-4 opacity-90">
              Check back regularly for the latest announcements and updates
            </p>
            <Link href="/notifications">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 font-medium">
                View All Notifications
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
