import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  FileQuestion,
  Play,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanPersianText, toFaDigits } from '../utils/persianUtils';
import { getUserQuizAttempts } from '../services/moodle/api';
import { useMoodleAuth } from '../context/MoodleAuthContext';

export default function QuizDetailModal({ quiz, courseName, onClose }) {
  const { session } = useMoodleAuth();
  const [attempts, setAttempts] = useState(quiz?.attempts || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAttempts() {
      if (!session || !quiz || (quiz.attempts && quiz.attempts.length > 0)) return;
      setLoading(true);
      try {
        const res = await getUserQuizAttempts(session.siteUrl, session.token, quiz.id);
        if (res && Array.isArray(res.attempts)) {
          setAttempts(res.attempts);
        }
      } catch (err) {
        console.error('Failed to load quiz attempts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempts();
  }, [quiz, session]);

  if (!quiz) return null;

  const formatSec = (seconds) => {
    if (!seconds) return 'بدون محدودیت زمان';
    const m = Math.floor(seconds / 60);
    return `${toFaDigits(m)} دقیقه`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'نامشخص';
    try {
      const d = new Date(timestamp * 1000);
      return toFaDigits(
        d.toLocaleDateString('fa-IR', {
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return 'نامشخص';
    }
  };

  const getGradingMethod = (method) => {
    switch (Number(method)) {
      case 1:
        return 'بالاترین نمره تلاش‌ها';
      case 2:
        return 'میانگین نمرات تلاش‌ها';
      case 3:
        return 'نمره اولین تلاش';
      case 4:
        return 'نمره آخرین تلاش';
      default:
        return 'بالاترین نمره';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-base text-base-content rounded-t-3xl sm:rounded-3xl border border-base-500/40 shadow-2xl overflow-hidden"
      >
        {/* نوار سربرگ */}
        <div className="p-4 sm:p-5 border-b border-base-500/30 flex items-center justify-between gap-3 bg-base-500/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/25 grid place-items-center shrink-0">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full inline-block mb-0.5">
                آزمون آنلاین (کوییز)
              </span>
              <h2 className="text-sm font-black text-base-content truncate">
                {cleanPersianText(quiz.name)}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral hover:text-base-content hover:bg-base-500/20 transition cursor-pointer shrink-0"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه اسکرول‌شونده */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* کارت مشخصات زمان‌بندی و محدودیت آزمون */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-base-500/15 border border-base-500/30 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>مدت زمان آزمون:</span>
              </div>
              <p className="text-xs font-black text-base-content">
                {formatSec(quiz.timelimit)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-base-500/15 border border-base-500/30 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral text-[11px] font-bold">
                <Award className="w-3.5 h-3.5 text-accent" />
                <span>شیوه ارزیابی:</span>
              </div>
              <p className="text-xs font-black text-base-content truncate" title={getGradingMethod(quiz.grademethod)}>
                {getGradingMethod(quiz.grademethod)}
              </p>
            </div>

            {Boolean(quiz.timeopen && quiz.timeopen > 0) && (
              <div className="p-3 rounded-2xl bg-base-500/15 border border-base-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral text-[11px] font-bold">
                  <Calendar className="w-3.5 h-3.5 text-success" />
                  <span>آغاز آزمون:</span>
                </div>
                <p className="text-xs font-bold text-base-content">
                  {formatDate(quiz.timeopen)}
                </p>
              </div>
            )}

            {Boolean(quiz.timeclose && quiz.timeclose > 0) && (
              <div className="p-3 rounded-2xl bg-base-500/15 border border-base-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral text-[11px] font-bold">
                  <Calendar className="w-3.5 h-3.5 text-error" />
                  <span>پایان و بسته شدن:</span>
                </div>
                <p className="text-xs font-bold text-base-content">
                  {formatDate(quiz.timeclose)}
                </p>
              </div>
            )}
          </div>

          {/* توضیحات و راهنمای آزمون */}
          {quiz.intro && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-neutral">راهنما و ضوابط آزمون:</h3>
              <div
                className="p-3.5 rounded-2xl bg-base-500/10 border border-base-500/25 text-xs text-base-content leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: quiz.intro }}
              />
            </div>
          )}

          {/* تاریخچه تلاش‌های کاربر (Attempts) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-base-content flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>خلاصه تلاش‌های پیشین شما:</span>
              </h3>
              <span className="text-[10px] text-neutral">
                {attempts.length > 0 ? `${toFaDigits(attempts.length)} بار شرکت کرده‌اید` : 'تلاشی ثبت نشده است'}
              </span>
            </div>

            {attempts.length > 0 ? (
              <div className="space-y-2">
                {attempts.map((att, idx) => {
                  const isFinished = att.state === 'finished';
                  return (
                    <div
                      key={att.id || idx}
                      className="p-3.5 rounded-2xl bg-base-500/15 border border-base-500/30 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-base-content">
                            تلاش شماره {toFaDigits(att.attempt || idx + 1)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFinished ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                            }`}
                          >
                            {isFinished ? 'پایان‌یافته' : 'در حال انجام'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral">
                          {att.timefinish ? formatDate(att.timefinish) : 'بدون تاریخ ثبت'}
                        </p>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-[10px] text-neutral block font-medium">نمره کسب‌شده:</span>
                        <span className="text-xs font-black text-primary">
                          {att.gradeFormatted || `${toFaDigits(att.sumgrades ?? 0)} از ${toFaDigits(quiz.grade || 20)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-base-500/10 border border-base-500/20 text-center text-xs text-neutral">
                شما هنوز در این آزمون شرکت نکرده‌اید.
              </div>
            )}
          </div>
        </div>

        {/* دکمه‌های اقدام انتهای مودال */}
        <div className="p-4 border-t border-base-500/30 bg-base-500/10 flex items-center gap-2.5">
          <a
            href={quiz.url || `${session?.siteUrl}/mod/quiz/view.php?id=${quiz.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3 px-4 rounded-2xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition shadow-md flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{attempts.length > 0 ? 'شرکت مجدد یا مرور در مودل' : 'شروع آزمون در سامانه'}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 mr-auto" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-base-500/25 hover:bg-base-500/40 text-xs font-bold text-base-content transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </motion.div>
    </div>
  );
}