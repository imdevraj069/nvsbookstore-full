"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Filter,
  X,
  ChevronDown,
  Bell,
  Search,
  SlidersHorizontal,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationsAPI, tagsAPI } from "@/lib/api";

// ── Levenshtein distance for fuzzy matching ──
function levenshteinDistance(str1, str2) {
  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();
  const len1 = lower1.length;
  const len2 = lower2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = lower1[i - 1] === lower2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
}

// ── Smart search with fuzzy matching ──
function smartSearch(query, notifications) {
  if (!query.trim()) return notifications;

  const queryLower = query.toLowerCase();
  const scored = notifications.map((notif) => {
    let score = 0;

    // Exact match in title
    if (notif.title.toLowerCase().includes(queryLower)) {
      score += 100;
    }

    // Levenshtein distance for title (handles typos)
    const titleDistance = levenshteinDistance(queryLower, notif.title);
    if (titleDistance <= 3) {
      score += Math.max(0, 50 - titleDistance * 10);
    }

    // Description contains exact match
    if (notif.description?.toLowerCase().includes(queryLower)) {
      score += 40;
    }

    // Tags match
    if (notif.tags?.some((tag) => tag.toLowerCase().includes(queryLower))) {
      score += 35;
    }

    return { ...notif, score };
  });

  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...notif }) => notif);
}

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const tagParam = searchParams.get("tag");

  const [notifications, setNotifications] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(tagParam || "all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const debounceTimerRef = useRef(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update selected tag if URL parameter changes
  useEffect(() => {
    if (tagParam && tagParam !== selectedTag) {
      setSelectedTag(tagParam);
      window.scrollTo(0, 0);
    }
  }, [tagParam]);

  useEffect(() => {
    loadNotifications();
    tagsAPI.getAll().then((r) => setTags((r.data || []).filter((t) => t.type === "notification" || t.type === "both"))).catch(() => {});
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  const handleSearchInput = (value) => {
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!value.trim()) {
        loadNotifications();
      } else {
        const filtered = smartSearch(value, notifications);
        setNotifications(filtered);
      }
    }, 300);
  };

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];
    if (selectedTag !== "all") {
      filtered = filtered.filter((n) => n.tags?.includes(selectedTag));
    }
    return filtered;
  }, [notifications, selectedTag]);

  const groupedByTag = useMemo(() => {
    const groups = {};
    filteredNotifications.forEach((notif) => {
      const tagName = notif.tags?.[0] || "Other";
      if (!groups[tagName]) groups[tagName] = [];
      groups[tagName].push(notif);
    });
    return groups;
  }, [filteredNotifications]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-purple-50/20 to-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Notifications</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl">
            Stay updated with latest announcements, updates, and important information
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`lg:col-span-1 ${showMobileFilters ? "block" : "hidden lg:block"}`}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between lg:hidden mb-4">
                  <h3 className="font-bold text-lg">Filters</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Categories
                  </h3>
                  <div className="space-y-2">
                    {/* All option */}
                    <button
                      onClick={() => setSelectedTag("all")}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedTag === "all"
                          ? "bg-blue-600 text-white font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      All Categories
                    </button>

                    {/* Tag options */}
                    {tags.map((tag) => (
                      <button
                        key={tag._id || tag.name}
                        onClick={() => setSelectedTag(tag.name)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedTag === tag.name
                            ? "bg-blue-600 text-white font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3"
          >
            {loading ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No notifications found
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? "Try a different search query"
                      : "Check back later for updates"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedByTag).map(([category, notifs]) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Category Header */}
                    <div className="mb-4">
                      <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">
                        {category}
                      </Badge>
                      <h2 className="text-2xl font-bold text-gray-900 mt-2">
                        {category}
                      </h2>
                    </div>

                    {/* Notifications Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {notifs.map((notif, idx) => (
                        <motion.div
                          key={notif._id || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          whileHover={{ y: -2 }}
                        >
                          <Link href={`/notification/${notif.slug}`}>
                            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300">
                              <CardContent className="p-6 flex flex-col h-full">
                                {/* Date */}
                                <div className="text-sm text-gray-500 mb-2">
                                  {notif.createdAt
                                    ? new Date(notif.createdAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "Recently"}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600">
                                  {notif.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
                                  {notif.description}
                                </p>

                                {/* Tags */}
                                {notif.tags && notif.tags.length > 0 && (
                                  <div className="flex gap-2 mb-4 flex-wrap">
                                    {notif.tags.slice(0, 2).map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {/* Read More Button */}
                                <div className="flex items-center text-blue-600 font-medium text-sm group">
                                  Read More
                                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Mobile filter toggle */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden fixed bottom-6 left-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Filter className="w-6 h-6" />
            </motion.button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
