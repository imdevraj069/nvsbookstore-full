"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  GraduationCap,
  Briefcase,
  ClipboardCheck,
  BookOpen,
  Landmark,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { notificationsAPI } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const iconMap = { CreditCard, GraduationCap, Briefcase, ClipboardCheck, BookOpen, Landmark };

const categoryConfig = [
  { id: "admit-cards", title: "Admit Cards", icon: "CreditCard", color: "blue", tags: ["admit-cards", "admit-card"] },
  { id: "university", title: "University Updates", icon: "GraduationCap", color: "purple", tags: ["university"] },
  { id: "jobs", title: "Latest Jobs", icon: "Briefcase", color: "amber", tags: ["jobs", "job"] },
  { id: "results", title: "Results", icon: "ClipboardCheck", color: "emerald", tags: ["results", "result"] },
  { id: "syllabus", title: "Syllabus/Answer Keys", icon: "BookOpen", color: "rose", tags: ["syllabus", "answer-keys", "answer-key"] },
  { id: "yojna", title: "Sarkari Yojna", icon: "Landmark", color: "teal", tags: ["yojna"] },
];

const colorMap = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "bg-blue-100 text-blue-600", hover: "hover:bg-blue-50", dot: "bg-blue-400", btn: "bg-blue-600 hover:bg-blue-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "bg-purple-100 text-purple-600", hover: "hover:bg-purple-50", dot: "bg-purple-400", btn: "bg-purple-600 hover:bg-purple-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "bg-amber-100 text-amber-600", hover: "hover:bg-amber-50", dot: "bg-amber-400", btn: "bg-amber-600 hover:bg-amber-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "bg-emerald-100 text-emerald-600", hover: "hover:bg-emerald-50", dot: "bg-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: "bg-rose-100 text-rose-600", hover: "hover:bg-rose-50", dot: "bg-rose-400", btn: "bg-rose-600 hover:bg-rose-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", icon: "bg-teal-100 text-teal-600", hover: "hover:bg-teal-50", dot: "bg-teal-400", btn: "bg-teal-600 hover:bg-teal-700" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function InfoTriageGrid() {
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    notificationsAPI.getAll()
      .then((r) => {
        const allNotifs = r.data || [];
        const grouped = categoryConfig.map((cat) => {
          const items = allNotifs
            .filter((n) =>
              (n.tags || []).some((t) =>
                cat.tags.some((ct) => t.toLowerCase().includes(ct))
              )
            )
            .slice(0, 25)
            .map((n) => ({
              title: n.title,
              slug: n.slug,
              publishDate: n.publishDate || n.createdAt,
            }));
          return { ...cat, items };
        });
        setColumns(grouped);
      })
      .catch(() => {
        setColumns(categoryConfig.map((cat) => ({ ...cat, items: [] })));
      });
  }, []);

  if (columns.length === 0) return null;

  const hasAnyItems = columns.some((c) => c.items.length > 0);
  if (!hasAnyItems) return null;

  return (
    <section className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8" id="results">
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-3 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Quick Access</h2>
        <p className="text-gray-500 text-sm mt-1">Latest admit cards, university updates, jobs, results & more — all in one place.</p>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        {columns.map((column) => {
          const Icon = iconMap[column.icon];
          const colors = colorMap[column.color];

          return (
            <motion.div key={column.id} variants={cardVariants}>
              <Card className={`border ${colors.border} overflow-hidden h-full flex flex-col transition-shadow hover:shadow-md`}>
                <CardHeader className={`${colors.bg} py-2 px-3 sm:py-3 sm:px-4`}>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.icon}`}>
                      {Icon && <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`font-bold ${colors.text} text-sm sm:text-base`}>{column.title}</span>
                    <span className="ml-auto text-xs font-medium text-gray-400">{column.items.length}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 px-1.5 sm:px-2 py-1.5 sm:py-2">
                  {column.items.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 py-4 text-center">No items yet</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {column.items.map((item, i) => {
                        const publishDate = new Date(item.publishDate);
                        const today = new Date();
                        const daysOld = Math.floor((today - publishDate) / (24 * 60 * 60 * 1000));
                        const isNew = daysOld <= 5;

                        return (
                          <li key={i}>
                            <Link href={`/notification/${item.slug}`}>
                              <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-sm text-gray-700 ${colors.hover} transition-colors group cursor-pointer relative`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0 mt-1`} />
                                <span className="flex-1">{item.title}</span>
                                {isNew && (
                                  <span className="relative inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 text-white animate-pulse">✨ NEW</span>
                                )}
                                <ExternalLink className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>

                <div className="px-1.5 sm:px-3 pb-1.5 sm:pb-3 mt-auto">
                  <Link href={`/notifications/${column.tags[0]}`}>
                    <Button variant="ghost" className={`w-full ${colors.text} ${colors.hover} font-semibold text-sm h-9`}>
                      View More
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
