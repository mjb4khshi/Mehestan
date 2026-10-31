import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Download,
  ExternalLink,
  X,
  CheckCircle2,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { toFaDigits } from '../utils/persianUtils';
import { CURRENT_VERSION, FALLBACK_APK_URL } from '../services/updater';

export default function UpdateModal({ release, onClose }) {
  if (!release) return null;

  const tagName = release.tagName || 'نسخه جدید';
  const releaseTitle = release.name || release.tagName || 'به‌روزرسانی جدید';
  const isPrerelease = Boolean(release.isPrerelease);
  const downloadUrl = release.apkUrl || FALLBACK_APK_URL;

  let sizeText = '';
  if (release.apkSize && release.apkSize > 0) {
    const mb = (release.apkSize / (1024 * 1024)).toFixed(1);
    sizeText = `${toFaDigits(mb)} مگابایت`;
  }

  let dateText = '';
  if (release.publishedAt) {
    try {
      const d = new Date(release.publishedAt);
      dateText = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
    } catch {}
  }

  const modalNode = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg rounded-3xl shadow-2xl border border-base-500/40 bg-base text-base-content flex flex-col overflow-hidden z-10"
        >
          {/* هدر مدال */}
          <div className="p-4 sm:p-5 border-b border-base-500/20 bg-primary/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-content grid place-items-center shrink-0 shadow-sm">
                <Rocket className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-base-content truncate">
                    به‌روزرسانی جدید مهستان
                  </h3>
                  {isPrerelease && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      نسخه آزمایشی
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral mt-0.5">
                  نسخه فعال شما: {toFaDigits(CURRENT_VERSION)} • جدیدترین نسخه: {toFaDigits(tagName)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-base-500/20 text-neutral hover:text-base-content transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* محتوا و تغییرات نسخه */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto text-xs leading-relaxed">
            <div className="p-3.5 rounded-2xl bg-base-500/15 border border-base-500/25 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>عنوان انتشار: {releaseTitle}</span>
                </span>
                {dateText && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dateText}</span>
                  </span>
                )}
              </div>
              {sizeText && (
                <p className="text-[11px] text-neutral">
                  حجم فایل نصبی اندروید: <span className="font-bold text-base-content font-mono">{sizeText}</span>
                </p>
              )}
            </div>

            {release.body && (
              <div className="space-y-1.5">
                <h4 className="font-black text-xs text-base-content">تغییرات و قابلیت‌های جدید:</h4>
                <div className="p-3.5 rounded-2xl bg-base-500/10 border border-base-500/20 text-[11.5px] leading-relaxed text-base-content font-sans whitespace-pre-wrap select-text">
                  {release.body}
                </div>
              </div>
            )}
          </div>

          {/* فوتر دکمه‌های دانلود */}
          <div className="p-4 border-t border-base-500/20 bg-base-100 flex items-center justify-between gap-2 flex-wrap shrink-0">
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-2xl border border-base-500/30 hover:bg-base-500/20 text-xs font-bold text-neutral hover:text-base-content transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>مشاهده در گیت‌هاب</span>
            </a>

            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-2xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل نصبی (APK)</span>
            </a>
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
