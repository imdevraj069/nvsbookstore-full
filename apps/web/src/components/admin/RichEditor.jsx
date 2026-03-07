// TiptapEditor.jsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript as SubScript } from "@tiptap/extension-subscript";
import { FontFamily } from "@tiptap/extension-font-family";
import FontSize from 'tiptap-extension-font-size';
import { CharacterCount } from "@tiptap/extension-character-count";
import React, { useCallback, useEffect, useState } from "react";

// Tiptap Core imports needed for custom extensions
import { Node } from '@tiptap/core';
import { mergeAttributes } from '@tiptap/react';

// Import CSS for Tiptap and specific extensions
import "./TiptapEditor.css";

// Import Lucide React Icons
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Eraser,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List as BulletListIcon, ListOrdered as OrderedListIcon,
  Minus, // Horizontal Rule
  Link as LinkIcon, Link2Off,
  Image as ImageIcon,
  Table as TableIcon, Table2,
  Trash2,
  Undo, Redo,
  Maximize, Minimize, Code, // Import Minimize icon for exiting fullscreen
  Palette, Highlighter,
  Font, Type,
  Plus,
  Merge, SplitSquareHorizontal, X,
} from "lucide-react";


// --- EditorButton Component ---
const EditorButton = ({ children, className = "", ...props }) => {
  return (
    <button
      type="button"
      className={`px-3 py-1 rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 flex items-center justify-center gap-1 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
// --- End EditorButton Component ---

// --- Separator Component ---
const Separator = () => (
  <div className="w-px bg-gray-300 dark:bg-zinc-600 mx-1 h-6 self-center"></div>
);
// --- End Separator Component ---

// --- Custom ImageLink Tiptap Extension ---
const ImageLink = Node.create({
  name: 'imageLink',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        renderHTML: ({ src }) => {
          if (!src) return {};
          return { src };
        },
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      href: {
        default: null,
        renderHTML: ({ href }) => {
          if (!href) return {};
          return { href };
        },
      },
      target: {
        default: '_blank',
        renderHTML: ({ target }) => {
          if (!target) return {};
          return { target };
        },
      },
      rel: {
        default: 'noopener noreferrer',
        renderHTML: ({ rel }) => {
          if (!rel) return {};
          return { rel };
        },
      },
      width: {
        default: null,
        renderHTML: ({ width }) => {
          return width ? { width } : {};
        },
      },
      height: {
        default: null,
        renderHTML: ({ height }) => {
          return height ? { height } : {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[href] > img[src]',
        getAttrs: (node) => {
          const img = node.querySelector('img');
          if (!img) return false;

          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            href: node.getAttribute('href'),
            target: node.getAttribute('target'),
            rel: node.getAttribute('rel'),
            width: img.style.width || img.getAttribute('width'),
            height: img.style.height || img.getAttribute('height'),
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          return {
            src: node.getAttribute('src'),
            alt: node.getAttribute('alt'),
            title: node.getAttribute('title'),
            href: null,
            target: null,
            rel: null,
            width: node.style.width || node.getAttribute('width'),
            height: node.style.height || node.getAttribute('height'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const imgAttrs = mergeAttributes({
      src: HTMLAttributes.src,
      alt: HTMLAttributes.alt,
      title: HTMLAttributes.title,
      width: HTMLAttributes.width,
      height: HTMLAttributes.height,
      style: `max-width: 100%; height: auto; ${HTMLAttributes.width ? `width: ${HTMLAttributes.width};` : ''} ${HTMLAttributes.height ? `height: ${HTMLAttributes.height};` : ''}`,
      class: 'tiptap-image-node',
    });

    if (HTMLAttributes.href) {
      return [
        'a',
        mergeAttributes({ href: HTMLAttributes.href, target: HTMLAttributes.target, rel: HTMLAttributes.rel }),
        ['img', imgAttrs]
      ];
    }
    return ['img', imgAttrs];
  },

  addCommands() {
    return {
      setImageLink:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      updateImageLink:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
      unsetImageLink:
        () =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { href: null, target: null, rel: null });
        },
      setImageSize:
        (width, height) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { width, height });
        },
    };
  },
});
// --- End Custom ImageLink Tiptap Extension ---


// --- Custom TableCell Tiptap Extension (for background color) ---
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || null,
        renderHTML: attributes => {
          return attributes.backgroundColor
            ? { style: `background-color: ${attributes.backgroundColor}` }
            : {};
        },
      },
    };
  },
});
// --- End Custom TableCell Tiptap Extension ---


const MenuBar = ({ editor, onContentChange, toggleFullscreen, isFullscreen }) => {
  const [, forceUpdate] = useState(0);

  // Force re-render on every editor transaction/selection change
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => forceUpdate((n) => n + 1);
    editor.on('selectionUpdate', onUpdate);
    editor.on('transaction', onUpdate);
    return () => {
      editor.off('selectionUpdate', onUpdate);
      editor.off('transaction', onUpdate);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');

  const [showImageModal, setShowImageModal] = useState(false);
  const [serverImages, setServerImages] = useState([]);
  const [imgUploading, setImgUploading] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('nvs_token') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  const loadServerImages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/images", { headers: getAuthHeaders() });
      const json = await res.json();
      setServerImages(json.data || []);
    } catch (e) {
      console.error("Failed to load server images:", e);
    }
  }, [getAuthHeaders]);

  const handleImageUpload = useCallback(async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/admin/images/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      const result = await response.json();
      if (result.data?.path || result.data?.fileName) {
        const imgUrl = result.data.path || `/files/serve/${result.data.fileName}?type=image`;
        editor.chain().focus().setImageLink({ src: imgUrl, alt: file.name, href: '' }).run();
        setShowImageModal(false);
        await loadServerImages();
      } else {
        console.error("Image upload failed:", result);
        alert("Upload failed: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Upload error: " + error.message);
    } finally {
      setImgUploading(false);
    }
  }, [editor, getAuthHeaders, loadServerImages]);

  const openImageModal = useCallback(async () => {
    setShowImageModal(true);
    await loadServerImages();
  }, [loadServerImages]);

  const insertServerImage = useCallback((img) => {
    const imgUrl = img.path || `/files/serve/${img.fileName}?type=image`;
    editor.chain().focus().setImageLink({ src: imgUrl, alt: img.fileName, href: '' }).run();
    setShowImageModal(false);
  }, [editor]);

  const setOrUpdateImageLink = useCallback(() => {
    const currentAttrs = editor.getAttributes('imageLink');
    const initialHref = currentAttrs.href || '';
    const url = window.prompt("Enter URL for image:", initialHref);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().unsetImageLink().run();
    } else {
      editor.chain().focus().updateImageLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
    }
  }, [editor]);

  const promptImageSize = useCallback(() => {
    const currentAttrs = editor.getAttributes('imageLink');
    const initialWidth = currentAttrs.width || '';
    const initialHeight = currentAttrs.height || 'auto';

    const newWidth = window.prompt("Enter image width (e.g., 300px, 50%):", initialWidth);
    if (newWidth === null) return;

    const newHeight = window.prompt("Enter image height (e.g., 200px, auto for aspect ratio):", initialHeight);
    if (newHeight === null) return;

    editor.chain().focus().setImageSize(newWidth, newHeight).run();
  }, [editor]);

  const setTableCellBackgroundColor = useCallback((color) => {
    editor.chain().focus().setCellAttribute('backgroundColor', color).run();
  }, [editor]);

  const unsetTableCellBackgroundColor = useCallback(() => {
    editor.chain().focus().setCellAttribute('backgroundColor', null).run();
  }, [editor]);


  return (
    <div className="tiptap-menubar p-2 border-b border-gray-300 dark:border-zinc-700 flex flex-wrap gap-1 sticky top-0 bg-white dark:bg-zinc-900 z-10">

      {/* --- Text Formatting Group --- */}
      <EditorButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "is-active" : ""}
        title="Bold"
      >
        <Bold size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "is-active" : ""}
        title="Italic"
      >
        <Italic size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={editor.isActive("underline") ? "is-active" : ""}
        title="Underline"
      >
        <UnderlineIcon size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={editor.isActive("strike") ? "is-active" : ""}
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        className={editor.isActive("superscript") ? "is-active" : ""}
        title="Superscript"
      >
        <SuperscriptIcon size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        className={editor.isActive("subscript") ? "is-active" : ""}
        title="Subscript"
      >
        <SubscriptIcon size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        title="Clear Formatting"
      >
        <Eraser size={18} />
      </EditorButton>

      <Separator />

      {/* --- Font & Color Group --- */}
      <select
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        value={editor.getAttributes("textStyle").fontFamily || ""}
        title="Font Family"
        className="px-2 py-1 rounded text-sm font-medium text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600"
      >
        <option value="">Font</option>
        <option value="Arial">Arial</option>
        <option value="Helvetica">Helvetica</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
        <option value="Georgia">Georgia</option>
      </select>

      <select
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        value={editor.getAttributes('fontSize').fontSize || ''}
        title="Font Size"
        className="px-2 py-1 rounded text-sm font-medium text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600"
      >
        <option value="">Size</option>
        <option value="12px">12px</option>
        <option value="14px">14px</option>
        <option value="16px">16px</option>
        <option value="18px">18px</option>
        <option value="20px">20px</option>
        <option value="22px">22px</option>
        <option value="24px">24px</option>
        <option value="26px">26px</option>
        <option value="28px">28px</option>
        <option value="32px">32px</option>
        <option value="36px">36px</option>
        <option value="40px">40px</option>
        <option value="48px">48px</option>
        <option value="56px">56px</option>
        <option value="60px">60px</option>
        <option value="72px">72px</option>
      </select>

      <div className="flex items-center gap-1 group relative">
        <EditorButton className="flex items-center gap-1" title="Text Color">
          <Palette size={18} />
          <input
            type="color"
            onInput={event => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
        </EditorButton>
        {editor.getAttributes('textStyle').color && (
          <EditorButton
            onClick={() => editor.chain().focus().unsetColor().run()}
            title="Unset Text Color"
          >
            <Eraser size={18} />
          </EditorButton>
        )}
      </div>

      <div className="flex items-center gap-1 group relative">
        <EditorButton className="flex items-center gap-1" title="Highlight Color">
          <Highlighter size={18} />
          <input
            type="color"
            onInput={event => editor.chain().focus().setHighlight({ color: event.target.value }).run()}
            value={editor.isActive('highlight') ? editor.getAttributes('highlight').color : '#FFFFFF'}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
        </EditorButton>
        {editor.isActive('highlight') && (
          <EditorButton
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            title="Unset Highlight"
          >
            <Eraser size={18} />
          </EditorButton>
        )}
      </div>

      <Separator />

      {/* --- Block & Alignment Group --- */}
      <select
        onChange={(e) => {
          if (e.target.value === "paragraph") editor.chain().focus().setParagraph().run();
          else if (e.target.value === "blockquote") editor.chain().focus().setBlockquote().run();
          else if (e.target.value.startsWith("h")) {
            editor.chain().focus().toggleHeading({ level: parseInt(e.target.value.substring(1)) }).run();
          }
        }}
        value={editor.isActive("paragraph") ? "paragraph" :
               editor.isActive("blockquote") ? "blockquote" :
               editor.isActive("heading", { level: 1 }) ? "h1" :
               editor.isActive("heading", { level: 2 }) ? "h2" :
               editor.isActive("heading", { level: 3 }) ? "h3" :
               editor.isActive("heading", { level: 4 }) ? "h4" :
               editor.isActive("heading", { level: 5 }) ? "h5" :
               editor.isActive("heading", { level: 6 }) ? "h6" : "paragraph"}
        title="Block Format"
        className="px-2 py-1 rounded text-sm font-medium text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="h5">Heading 5</option>
        <option value="h6">Heading 6</option>
        <option value="blockquote">Blockquote</option>
      </select>

      <EditorButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={editor.isActive({ textAlign: "left" }) ? "is-active" : ""}
        title="Align Left"
      >
        <AlignLeft size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={editor.isActive({ textAlign: "center" }) ? "is-active" : ""}
        title="Align Center"
      >
        <AlignCenter size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={editor.isActive({ textAlign: "right" }) ? "is-active" : ""}
        title="Align Right"
      >
        <AlignRight size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        className={editor.isActive({ textAlign: "justify" }) ? "is-active" : ""}
        title="Align Justify"
      >
        <AlignJustify size={18} />
      </EditorButton>

      <Separator />

      {/* --- List & Rule Group --- */}
      <EditorButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? "is-active" : ""}
        title="Bullet List"
      >
        <BulletListIcon size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive("orderedList") ? "is-active" : ""}
        title="Ordered List"
      >
        <OrderedListIcon size={18} />
      </EditorButton>
      <EditorButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus size={18} />
      </EditorButton>

      <Separator />

      {/* --- Link & Image Group --- */}
      <EditorButton
        onClick={() => {
          const existingUrl = editor.getAttributes('link').href || '';
          const url = window.prompt("Enter URL for text link:", existingUrl);
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={editor.isActive("link") ? "is-active" : ""}
        title={editor.isActive("link") ? "Edit Link" : "Insert Text Link"}
      >
        <LinkIcon size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive("link")}
        title="Remove Link"
      >
        <Link2Off size={18} />
      </EditorButton>
      {/* Link info bar — shows current URL when cursor is inside a link */}
      {editor.isActive('link') && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 max-w-xs">
          <LinkIcon size={12} className="flex-shrink-0" />
          <span className="truncate font-mono" title={editor.getAttributes('link').href}>
            {editor.getAttributes('link').href}
          </span>
        </div>
      )}

      <EditorButton onClick={openImageModal} title="Insert Image">
        <ImageIcon size={18} />
      </EditorButton>

      {/* Image Modal — Upload or Pick from Directory */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">🖼️ Insert Image</h3>
              <button type="button" onClick={() => setShowImageModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* Upload from machine */}
              <div className="mb-6">
                <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 bg-blue-50/50 transition-colors">
                  {imgUploading ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <span className="text-sm text-blue-600">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-blue-500 mb-2" />
                      <span className="text-sm text-blue-700 font-medium">Upload from machine</span>
                      <span className="text-xs text-blue-500 mt-1">PNG, JPG, WebP — Max 5MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imgUploading} className="hidden" />
                </label>
              </div>

              {/* Pick from server directory */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3">Or pick from server directory</p>
                {serverImages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No images uploaded yet</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {serverImages.map((img) => (
                      <button
                        key={img.fileName}
                        type="button"
                        onClick={() => insertServerImage(img)}
                        className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors"
                      >
                        <img src={img.path} alt={img.fileName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors flex items-end justify-center">
                          <p className="text-white text-[10px] font-medium mb-1 bg-black/50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Insert</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {editor.isActive('imageLink') && (
        <>
          <EditorButton
            onClick={setOrUpdateImageLink}
            title="Edit Image Link"
          >
            <LinkIcon size={18} />
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().unsetImageLink().run()}
            disabled={!editor.getAttributes('imageLink').href}
            title="Remove Image Link"
          >
            <Link2Off size={18} />
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
            title="Align Image Left"
          >
            <AlignLeft size={18} />
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
            title="Align Image Center"
          >
            <AlignCenter size={18} />
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
            title="Align Image Right"
          >
            <AlignRight size={18} />
          </EditorButton>
          <EditorButton
            onClick={promptImageSize}
            title="Set Image Size"
          >
            <Type size={18} />
          </EditorButton>
        </>
      )}

      <Separator />

      {/* --- Table Group --- */}
      <EditorButton
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insert Table"
      >
        <TableIcon size={18} />
      </EditorButton>
      {editor.isActive('table') && (
        <>
          <EditorButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add Row After"
          >
            <Plus size={18} /> (Row)
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete Row"
          >
            <Table2 size={18} /> (Del Row)
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add Column After"
          >
            <Plus size={18} /> (Col)
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete Column"
          >
            <Table2 size={18} /> (Del Col)
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete Table"
          >
            <Trash2 size={18} /> (Table)
          </EditorButton>
          <div className="flex items-center gap-1 group relative">
            <EditorButton
              className="flex items-center gap-1"
              title="Table Cell Background Color"
            >
              <Palette size={18} /> (Cell)
              <input
                type="color"
                onInput={event => setTableCellBackgroundColor(event.target.value)}
                value={editor.getAttributes('tableCell').backgroundColor || '#FFFFFF'}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </EditorButton>
            {editor.getAttributes('tableCell').backgroundColor && (
              <EditorButton
                onClick={unsetTableCellBackgroundColor}
                title="Unset Table Cell Background Color"
              >
                <Eraser size={18} /> (Cell)
              </EditorButton>
            )}
          </div>
          <EditorButton
            onClick={() => editor.chain().focus().mergeCells().run()}
            title="Merge Selected Cells"
          >
            <Merge size={18} /> Merge
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().splitCell().run()}
            title="Split Cell"
          >
            <SplitSquareHorizontal size={18} /> Split
          </EditorButton>
          <EditorButton
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
            title="Toggle Merge/Split"
          >
            <Merge size={18} /> Toggle
          </EditorButton>
        </>
      )}

      <Separator />

      {/* --- Undo/Redo & Utilities Group --- */}
      <EditorButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Undo"
      >
        <Undo size={18} />
      </EditorButton>
      <EditorButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Redo"
      >
        <Redo size={18} />
      </EditorButton>

      <EditorButton
        onClick={toggleFullscreen} // Call the toggleFullscreen function
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} // Change title based on state
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />} {/* Change icon */}
      </EditorButton>
      <EditorButton
        onClick={() => {
          setHtmlCode(editor.getHTML());
          setShowHtmlEditor(true);
        }}
        title="Edit HTML Code"
      >
        <Code size={18} />
      </EditorButton>

      {/* Editable HTML Code Modal */}
      {showHtmlEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowHtmlEditor(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">✏️ Edit HTML Code</h3>
              <button type="button" onClick={() => setShowHtmlEditor(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="w-full h-[55vh] font-mono text-sm bg-gray-50 border border-gray-300 rounded-lg p-4 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                spellCheck={false}
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowHtmlEditor(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.commands.setContent(htmlCode);
                  if (onContentChange) onContentChange(htmlCode);
                  setShowHtmlEditor(false);
                }}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
              >
                Save HTML
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="char-count mt-2 text-right w-full text-sm text-gray-500">
        Characters: {editor.storage.characterCount.characters()} / Words: {editor.storage.characterCount.words()}
      </div>
    </div>
  );
};

export default function TiptapEditor({ content, onChange }) {
  const [isFullscreen, setIsFullscreen] = useState(false); // State for fullscreen mode

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: true,
        italic: true,
        strike: true,
        blockquote: true,
        bulletList: true,
        orderedList: true,
        horizontalRule: true,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        image: false,
      }),
      Underline,
      Superscript,
      SubScript,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      ImageLink,
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      CustomTableCell,
      TableHeader,
      TableRow,
      TextAlign.configure({
        types: ["heading", "paragraph", "imageLink"],
      }),
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
      CharacterCount,
    ],
    content: content || "<p>Start typing...</p>",
    onUpdate: ({ editor }) => {
      onChange && onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert max-w-none p-4 outline-none min-h-[400px]",
      },
      handleClick: (view, pos, event) => {
        // Prevent link navigation inside the editor
        const link = event.target.closest('a');
        if (link) {
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        click: (view, event) => {
          const link = event.target.closest('a');
          if (link) {
            event.preventDefault();
          }
        },
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  if (!editor) {
    return (
      <div className="border rounded-xl overflow-hidden bg-white dark:bg-zinc-900 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-xl bg-white dark:bg-zinc-900 min-h-[500px] max-h-[700px] flex flex-col overflow-hidden ${
        isFullscreen ? "tiptap-fullscreen" : "" // Apply fullscreen class conditionally
      }`}
    >
      <div className="flex flex-col flex-grow overflow-y-auto relative">
        <MenuBar editor={editor} toggleFullscreen={toggleFullscreen} isFullscreen={isFullscreen} /> {/* Pass props to MenuBar */}
        <EditorContent editor={editor} className="flex-grow" />
      </div>
    </div>
  );
}