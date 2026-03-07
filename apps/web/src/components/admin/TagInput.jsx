"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TagInput({
  value = [],
  onChange,
  label = "Tags",
  placeholder = "Type tag and press Enter or comma",
  suggestions = [],
}) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInputValue("");
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  // Filter suggestions: only show ones not already selected
  const availableSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Tag chips + input container */}
      <div className="flex flex-wrap gap-2 p-2.5 min-h-[44px] rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        <AnimatePresence>
          {value.map((tag) => (
            <motion.span
              key={tag}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>

      {/* Suggestion chips */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide self-center mr-1">Quick add:</span>
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 text-xs font-medium rounded-full border border-gray-200 hover:border-blue-300 transition-all"
            >
              <span className="text-[10px]">+</span> {s}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">,</kbd> to add a tag. <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Backspace</kbd> to remove last.
      </p>
    </div>
  );
}
