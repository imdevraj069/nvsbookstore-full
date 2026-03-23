"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, X, Youtube, Instagram } from "lucide-react";

const WHATSAPP_LINK = "https://wa.me/message/SXYG2DK6NQ3ZH1";
const CALL_NUMBER = "tel:+916203662259";
const YOUTUBE_LINK = "https://www.youtube.com/@moryatutorial507?sub_confirmation=1";
const INSTAGRAM_LINK = "https://www.instagram.com/nvs_online_center";

export default function FloatingSupport() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Popup menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-64 mb-2"
          >
            <h3 className="text-sm font-bold text-gray-800 mb-3 px-1">💬 Chat with Us</h3>
            <div className="space-y-2">
              {/* Call */}
              <a
                href={CALL_NUMBER}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700 group-hover:text-blue-800">Call Now</p>
                  <p className="text-xs text-blue-500">+91 6203 662 259</p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700 group-hover:text-green-800">WhatsApp</p>
                  <p className="text-xs text-green-500">Chat with us</p>
                </div>
              </a>

              {/* YouTube */}
              <a
                href={YOUTUBE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <Youtube className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700 group-hover:text-red-800">YouTube</p>
                  <p className="text-xs text-red-500">@moryatutorial507</p>
                </div>
              </a>

              {/* Instagram */}
              <a
                href={INSTAGRAM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-pink-700 group-hover:text-pink-800">Instagram</p>
                  <p className="text-xs text-pink-500">@nvsbooks</p>
                </div>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB trigger */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
        aria-label="Chat with Us"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
