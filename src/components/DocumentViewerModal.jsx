import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Loader2,
  FileText,
  FileCode,
  Image as ImageIcon,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMoodleFileUrl, downloadMoodleFile } from '../services/moodle/api';
import { cleanPersianText, formatFileSizeFa } from '../utils/persianUtils';

export default function DocumentViewerModal({ file, token, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const filename = file?.filename || 'document';
  const lowerName = filename.toLowerCase();
  const isPdf = lowerName.endsWith('.pdf') || file?.mimetype?.includes('pdf');
  const isImage =
    /\.(png|jpe?g|gif|webp|svg)$/i.test(lowerName) || file?.mimetype?.startsWith('image/');
  const isText =
    /\.(txt|md|py|c|cpp|java|js|jsx|ts|tsx|json|html|css|xml|sql)$/i.test(lowerName) ||
    file?.mimetype?.startsWith('text/');

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    async function loadFile() {
      if (!file?.fileurl) {
        setError('پیوند فایل یافت نشد.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (!token || token.startsWith('demo_') || file.fileurl.includes('/demo/')) {
          // در حالت دمو یا فایل‌های تستی
          if (isText) {
            setTextContent(
              `// محتوای پیش‌نمایش تستی فایل مهستان\n// نام فایل: ${filename}\n\nfunction calculateGrade() {\n  return 20;\n}\n\nconsole.log("پیش‌نمایش موفقیت‌آمیز بود.");`
            );
          } else {
            // ساخت یک بلاب ساختگی
            const dummyBlob = new Blob(
              [
                `پیش‌نمایش درون‌برنامه‌ای مهستان برای فایل: ${filename}\nاین فایل در محیط شبیه‌سازی ایجاد شده است.`,
              ],
              { type: 'text/plain;charset=utf-8' }
            );
            createdUrl = URL.createObjectURL(dummyBlob);
            setBlobUrl(createdUrl);
          }
          setLoading(false);
          return;
        }

        const authenticatedUrl = getMoodleFileUrl(file.fileurl, token);
        const isLocal =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const fetchUrl = isLocal
          ? `/api/moodle-proxy?url=${encodeURIComponent(authenticatedUrl)}`
          : authenticatedUrl;

        const res = await fetch(fetchUrl);
        if (!res.ok) {
          throw new Error(`خطای دریافت پیش‌نمایش (${res.status})`);
        }

        if (isText) {
          const text = await res.text();
          if (active) setTextContent(text);
        } else {
          const blob = await res.blob();
          if (active) {
            createdUrl = URL.createObjectURL(blob);
            setBlobUrl(createdUrl);
          }
        }
      } catch (err) {
        if (active) {
          console.error('Preview load failed:', err);
          setError('امکان بارگذاری پیش‌نمایش آنلاین این فایل وجود ندارد. می‌توانید آن را مستقیماً دانلود نمایید.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFile();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file, token]);

  const handleDownload = async () => {
    if (downloading || !file?.fileurl) return;
    setDownloading(true);
    try {
      await downloadMoodleFile(file.fileurl, filename, token);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* پس‌زمینه نیمه‌شفاف */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* بدنه مودال پیش‌نمایش */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-4xl h-[88vh] max-h-[850px] bg-base-100 rounded-3xl shadow-2xl border border-base-500/25 flex flex-col overflow-hidden z-10"
        >
          {/* هدر پیش‌نمایش */}
          <div className="p-3.5 sm:p-4 border-b border-base-500/20 bg-base-500/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                {isImage ? (
                  <ImageIcon className="w-4 h-4" />
                ) : isText ? (
                  <FileCode className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-xs sm:text-sm text-base-content truncate" title={filename}>
                  {cleanPersianText(filename)}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-neutral">
                  <span>پیش‌نمایش درون‌برنامه‌ای</span>
                  {file?.filesize ? (
                    <>
                      <span>•</span>
                      <span className="font-mono">{formatFileSizeFa(file.filesize)}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isImage && (
                <div className="hidden sm:flex items-center gap-1 bg-base-500/20 p-1 rounded-xl mr-2">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                    className="p-1 rounded text-neutral hover:text-base-content cursor-pointer"
                    title="بزرگ‌نمایی"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                    className="p-1 rounded text-neutral hover:text-base-content cursor-pointer"
                    title="کوچک‌نمایی"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1 rounded text-neutral hover:text-base-content cursor-pointer"
                    title="چرخش تصویر"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-content text-xs font-bold hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">دانلود فایل</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-neutral hover:text-base-content hover:bg-base-500/20 transition cursor-pointer"
                title="بستن پیش‌نمایش"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* بدنه محتوای سند */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-base-500/5 p-2 sm:p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2.5 text-neutral text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span>در حال آماده‌سازی و خواندن سند...</span>
              </div>
            ) : error ? (
              <div className="max-w-md p-6 rounded-2xl bg-base-500/15 border border-base-500/25 text-center space-y-3">
                <p className="text-xs text-neutral leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود مستقیم این فایل</span>
                </button>
              </div>
            ) : isPdf && blobUrl ? (
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full rounded-2xl border border-base-500/20 shadow-inner bg-white"
                title={filename}
              />
            ) : isImage && blobUrl ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                <img
                  src={blobUrl}
                  alt={filename}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease',
                  }}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg select-none"
                />
              </div>
            ) : isText && textContent !== null ? (
              <div className="w-full h-full overflow-auto p-4 rounded-2xl bg-base-500/10 border border-base-500/20 text-left font-mono text-xs leading-relaxed text-base-content select-text whitespace-pre-wrap">
                {textContent}
              </div>
            ) : (
              <div className="max-w-md p-6 rounded-2xl bg-base-500/15 border border-base-500/25 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-base-content">{cleanPersianText(filename)}</h4>
                  <p className="text-[11px] text-neutral mt-1">
                    پیش‌نمایش زنده برای این فرمت پشتیبانی نمی‌شود. می‌توانید فایل را مستقیماً دریافت نمایید.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل ({formatFileSizeFa(file?.filesize)})</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
