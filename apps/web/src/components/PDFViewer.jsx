"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  FileText,
  AlertCircle,
} from "lucide-react";

// Set the worker source for PDF.js
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export default function PDFViewer({ pdfUrl, fileName = "document.pdf", onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [fileSize, setFileSize] = useState(0);
  const [loadedSize, setLoadedSize] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Fetch file size and download progress
  useEffect(() => {
    const fetchFileWithProgress = async () => {
      try {
        setError(null);
        setLoading(true);
        abortControllerRef.current = new AbortController();

        const response = await fetch(pdfUrl, {
          headers: { Range: "bytes=0-" },
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentLength =
          response.headers.get("content-length") ||
          parseInt(
            response.headers.get("content-range")?.split("/")[1] || 0,
            10
          );

        setFileSize(parseInt(contentLength, 10) || 0);

        if (response.body) {
          const reader = response.body.getReader();
          let loadedBytes = 0;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              loadedBytes += value.length;
              setLoadedSize(loadedBytes);
            }
          } catch (readerErr) {
            console.error("Error reading response body:", readerErr);
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching file:", err);
          setError("Failed to load PDF. Please try again.");
          setLoading(false);
        }
      }
    };

    if (pdfUrl) {
      fetchFileWithProgress();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error("PDF load error:", error);
    setError("Failed to load PDF. The file may be corrupted or in an unsupported format.");
    setLoading(false);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download PDF: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const progressPercent = fileSize > 0 ? (loadedSize / fileSize) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-semibold truncate">{fileName}</h2>
              {fileSize > 0 && (
                <p className="text-xs opacity-90">
                  Size: {formatFileSize(fileSize)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close PDF viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Progress Bar */}
        {loading && !error && (
          <div className="w-full bg-gray-100 p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                Loading PDF...
              </span>
              <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
                {formatFileSize(loadedSize)} / {formatFileSize(fileSize)}
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1 text-right">
              {Math.round(progressPercent)}%
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="w-full bg-red-50 border-b border-red-200 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={onClose}
              className="ml-auto px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-50 flex flex-col items-center justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-gray-600 text-sm">Preparing document...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 font-semibold">Failed to load PDF</p>
              <p className="text-gray-600 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-gray-600 text-sm">Loading page...</p>
                  </div>
                }
                error={
                  <div className="text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600 font-semibold">Failed to load page</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  className="max-w-full"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {!loading && !error && numPages && (
          <div className="bg-gray-100 border-t border-gray-200 p-4 flex items-center justify-between flex-wrap gap-3">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-3 py-2 bg-white rounded-lg border border-gray-300 text-sm font-medium">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={() =>
                  setPageNumber(Math.min(numPages, pageNumber + 1))
                }
                disabled={pageNumber >= numPages}
                className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.2))}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-medium min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(Math.min(2.5, scale + 0.2))}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            {/* Download Button - Bottom Right */}
            <div className="ml-auto">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-lg hover:shadow-xl"
                title="Download PDF"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
