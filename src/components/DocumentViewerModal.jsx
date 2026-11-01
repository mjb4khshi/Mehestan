import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronRight,
  ChevronLeft,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { getMoodleFileUrl, downloadMoodleFile, shouldUseDevProxy } from '../services/moodle/api';
import { getCachedFileBlob, cacheFileBlob } from '../services/offlineCache';
import { cleanPersianText, formatFileSizeFa, toFaDigits } from '../utils/persianUtils';

// تنظیم ورکر محلی آفلاین pdf.js
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
} catch {}

function PdfCanvasViewer({ blob, filename, onOpenExternal }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.15);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function loadPdf() {
      try {
        setRendering(true);
        setRenderError(null);
        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        const doc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch (err) {
        if (!active) return;
        console.warn('PDF load error:', err);
        setRenderError('امکان پردازش داخلی این سند PDF وجود ندارد.');
      } finally {
        if (active) setRendering(false);
      }
    }
    if (blob) loadPdf();
    return () => {
      active = false;
    };
  }, [blob]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let active = true;

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        const page = await pdfDoc.getPage(pageNum);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext('2d');
        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render error:', err);
        }
      }
    }

    renderPage();
    return () => {
      active = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNum, scale]);

  if (rendering) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-base-100 text-neutral text-xs shadow-md">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="font-bold text-base-content">در حال رندر صفحات PDF...</span>
      </div>
    );
  }

  if (renderError || !pdfDoc) {
    return (
      <div className="max-w-md p-6 rounded-2xl bg-base-500/15 border border-base-500/25 text-center space-y-3">
        <p className="text-xs text-neutral leading-relaxed">
          {renderError || 'پیش‌نمایش داخلی PDF در دسترس نیست.'}
        </p>
        {onOpenExternal && (
          <button
            type="button"
            onClick={onOpenExternal}
            className="px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>باز کردن با برنامه‌های گوشی</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center select-none overflow-hidden">
      {/* نوار ابزار کنترل صفحات و بزرگ‌نمایی */}
      <div className="shrink-0 w-full max-w-md mb-2 p-1.5 rounded-2xl bg-base-500/20 border border-base-500/30 flex items-center justify-between text-xs gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((p) => Math.min(p + 1, numPages))}
            className="p-1.5 rounded-lg bg-base-500/30 hover:bg-base-500/50 disabled:opacity-30 cursor-pointer"
            title="صفحه بعد"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold px-1 text-base-content">
            {toFaDigits(pageNum)} از {toFaDigits(numPages)}
          </span>
          <button
            type="button"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => Math.max(p - 1, 1))}
            className="p-1.5 rounded-lg bg-base-500/30 hover:bg-base-500/50 disabled:opacity-30 cursor-pointer"
            title="صفحه قبل"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s + 0.2, 2.5))}
            className="p-1.5 rounded-lg bg-base-500/30 hover:bg-base-500/50 cursor-pointer"
            title="بزرگ‌نمایی"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s - 0.2, 0.6))}
            className="p-1.5 rounded-lg bg-base-500/30 hover:bg-base-500/50 cursor-pointer"
            title="کوچک‌نمایی"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {onOpenExternal && (
            <button
              type="button"
              onClick={onOpenExternal}
              className="p-1.5 rounded-lg bg-base-500/30 hover:bg-base-500/50 cursor-pointer text-primary"
              title="باز کردن در برنامه گوشی"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* بوم نمایش صفحه جاری PDF */}
      <div className="flex-1 w-full overflow-auto flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-xl border border-base-500/30 bg-white max-w-full"
        />
      </div>
    </div>
  );
}

export default function DocumentViewerModal({ file, token, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawBlob, setRawBlob] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const filename = file?.filename || file?.name || 'document';
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
      // ۱. فایل‌های محلی Blob / File
      if (file instanceof File || file?.blob) {
        const targetBlob = file instanceof File ? file : file.blob;
        setRawBlob(targetBlob);
        createdUrl = URL.createObjectURL(targetBlob);
        setBlobUrl(createdUrl);
        setLoading(false);
        return;
      }

      if (file?.fileurl && file.fileurl.startsWith('blob:')) {
        setBlobUrl(file.fileurl);
        setLoading(false);
        return;
      }

      if (!file?.fileurl) {
        setError('پیوند فایل یافت نشد.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // ۲. بررسی وجود فایل در کش آفلاین پایگاه داده دستگاه
        const cached = await getCachedFileBlob(file.fileurl);
        if (cached?.blob && active) {
          setRawBlob(cached.blob);
          createdUrl = URL.createObjectURL(cached.blob);
          setBlobUrl(createdUrl);
          setLoading(false);
          return;
        }

        // ۳. حالت دمو
        if (!token || token.startsWith('demo_') || file.fileurl.includes('/demo/')) {
          if (isText) {
            setTextContent(
              `// محتوای پیش‌نمایش فایل تستی مهستان\n// نام فایل: ${filename}\n\nfunction calculateGrade() {\n  return 20;\n}\n\nconsole.log("پیش‌نمایش با موفقیت انجام شد.");`
            );
          } else {
            const dummyBlob = new Blob(
              [`پیش‌نمایش درون‌برنامه‌ای مهستان برای فایل: ${filename}`],
              { type: 'text/plain;charset=utf-8' }
            );
            setRawBlob(dummyBlob);
            createdUrl = URL.createObjectURL(dummyBlob);
            setBlobUrl(createdUrl);
          }
          setLoading(false);
          return;
        }

        // ۴. دریافت مستقیم با توکن معتبر مودل
        const authenticatedUrl = getMoodleFileUrl(file.fileurl, token);
        const fetchUrl = shouldUseDevProxy()
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
            setRawBlob(blob);
            cacheFileBlob(file.fileurl, filename, blob).catch(() => {});
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

  const handleOpenExternal = () => {
    if (typeof window !== 'undefined' && window.NativeNotifier && typeof window.NativeNotifier.openFileWithApp === 'function' && rawBlob) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = String(reader.result).split(',')[1];
          window.NativeNotifier.openFileWithApp(b64, filename, isPdf ? 'application/pdf' : 'application/octet-stream');
        };
        reader.readAsDataURL(rawBlob);
        return;
      } catch (e) {
        console.warn('Native open failed:', e);
      }
    }
    handleDownload();
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (file?.fileurl) {
        await downloadMoodleFile(file.fileurl, filename, token);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const hasNativeOpener = typeof window !== 'undefined' && Boolean(window.NativeNotifier?.openFileWithApp);

  const modalNode = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
        {/* پس‌زمینه تیره و مات کامل */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* بدنه مودال پیش‌نمایش کاملاً مات و غیرشفاف */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-4xl h-[88vh] max-h-[850px] rounded-3xl shadow-2xl border border-base-500/50 flex flex-col overflow-hidden z-10 bg-base text-base-content"
        >
          {/* هدر پیش‌نمایش */}
          <div className="p-3.5 sm:p-4 border-b border-base-500/30 flex items-center justify-between gap-3 shrink-0 bg-base-100">
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
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-black text-base-content truncate">
                  {cleanPersianText(filename)}
                </h3>
                <span className="text-[10px] text-neutral">
                  {isPdf ? 'سند رسمی PDF' : isImage ? 'تصویر' : isText ? 'متن / کد' : 'فایل پیوست'}
                  {file?.filesize ? ` • ${formatFileSizeFa(file.filesize)}` : ''}
                </span>
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

              {hasNativeOpener && rawBlob && (
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="px-2.5 py-1.5 rounded-xl bg-base-500/20 hover:bg-base-500/35 text-base-content text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-base-500/30"
                  title="باز کردن با برنامه‌های گوشی"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">باز کردن با برنامه</span>
                </button>
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
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-2 sm:p-4 bg-base">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-base-100 border border-base-500/30 text-neutral text-xs shadow-md">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="font-bold text-base-content">در حال آماده‌سازی و خواندن سند...</span>
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
            ) : isPdf && rawBlob ? (
              <PdfCanvasViewer
                blob={rawBlob}
                filename={filename}
                onOpenExternal={hasNativeOpener ? handleOpenExternal : null}
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

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
}
