import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Share2,
  CheckCircle2,
  ChevronLeft,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { getAssignmentSubmissionStatus } from '../services/moodle/api';
import {
  exportAssignmentToSarvestan,
  exportAllAssignmentsToSarvestan,
  getToneForCourse,
  TONE_STYLES,
} from '../services/sarvestanBridge';
import AssignmentDetailModal from '../components/AssignmentDetailModal';
import QuizDetailModal from '../components/QuizDetailModal';
import {
  cleanCourseName,
  cleanPersianText,
  toFaDigits,
  formatPersianDate,
  formatAssignmentTiming,
} from '../utils/persianUtils';

export default function AssignmentsScreen() {
  const { session, siteInfo, assignments, quizzes = [], courses = [] } = useMoodleAuth();
  const [activityType, setActivityType] = useState('assign'); // 'assign' | 'quiz'
  const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'past'
  const [exportedMsg, setExportedMsg] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [, setTick] = useState(0);

  // بررسی وضعیت واقعی تحویل تکالیف در پس‌زمینه
  useEffect(() => {
    if (!session || session.isDemo) return;
    const missing = assignments.filter((a) => !a.submissionStatus);
    if (missing.length === 0) return;

    let active = true;
    Promise.allSettled(
      missing.map(async (a) => {
        try {
          const res = await getAssignmentSubmissionStatus(session.siteUrl, session.token, a.id, siteInfo?.userid);
          if (res?.lastattempt?.submission && active) {
            a.submissionStatus = res.lastattempt.submission;
            a.lastattempt = res.lastattempt;
            if (res.lastattempt.feedback) a.gradeInfo = res.lastattempt.feedback;
          }
        } catch {}
      })
    ).then(() => {
      if (active) setTick((t) => t + 1);
    });

    return () => {
      active = false;
    };
  }, [assignments, session, siteInfo]);

  const nowSec = Math.floor(Date.now() / 1000);

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'pending') {
      return a.duedate && a.duedate > nowSec;
    }
    if (filter === 'past') {
      return a.duedate && a.duedate <= nowSec;
    }
    return true;
  });

  const pendingCount = assignments.filter((a) => a.duedate && a.duedate > nowSec).length;
  const pastCount = assignments.filter((a) => a.duedate && a.duedate <= nowSec).length;

  const handleExport = (e, assignment) => {
    e.stopPropagation();
    exportAssignmentToSarvestan(assignment, assignment.courseName);
    setExportedMsg(`تکلیف «${cleanPersianText(assignment.name)}» به سروستان منتقل شد.`);
    setTimeout(() => setExportedMsg(''), 3000);
  };

  return (
    <div className="p-3.5 sm:p-4 space-y-3.5 max-w-2xl mx-auto min-w-0">
      {/* ۱. سوییچ سراسری بین تکالیف و آزمون‌ها (عرض کامل و متوازن) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-base-500/20 border border-base-500/30">
        <button
          type="button"
          onClick={() => setActivityType('assign')}
          className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            activityType === 'assign'
              ? 'bg-primary text-primary-content shadow-xs'
              : 'text-neutral hover:text-base-content'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>تکالیف درسی ({toFaDigits(assignments.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivityType('quiz')}
          className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            activityType === 'quiz'
              ? 'bg-primary text-primary-content shadow-xs'
              : 'text-neutral hover:text-base-content'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>آزمون‌ها ({toFaDigits(quizzes.length)})</span>
        </button>
      </div>

      {activityType === 'assign' ? (
        <>
          {/* ۲. فیلتر وضعیت تکالیف (سه‌تایی متقارن و تمام‌عرض) */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-base-500/15 border border-base-500/25 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                filter === 'pending'
                  ? 'bg-primary text-primary-content font-black shadow-xs'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              <span>در انتظار ({toFaDigits(pendingCount)})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                filter === 'all'
                  ? 'bg-primary text-primary-content font-black shadow-xs'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              <span>همه ({toFaDigits(assignments.length)})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('past')}
              className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                filter === 'past'
                  ? 'bg-primary text-primary-content font-black shadow-xs'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              <span>گذشته ({toFaDigits(pastCount)})</span>
            </button>
          </div>

          {/* دکمه انتقال سراسری به سروستان (متعادل و تمیز) */}
          {assignments.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => exportAllAssignmentsToSarvestan(filteredAssignments)}
              className="w-full py-2 px-3 rounded-xl bg-success-soft border border-success/30 text-success text-xs font-bold hover:bg-success/20 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>انتقال تکالیف به تقویم سروستان</span>
            </motion.button>
          )}

          <AnimatePresence>
            {exportedMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 rounded-xl bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{exportedMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* لیست تکالیف */}
          {filteredAssignments.length === 0 ? (
            <div className="sarv-card p-12 text-center space-y-2">
              <CheckSquare className="w-8 h-8 text-neutral/40 mx-auto" />
              <p className="text-xs font-bold text-neutral">تکلیفی در این بخش یافت نشد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((a, idx) => {
                const timing = formatAssignmentTiming(a.duedate);
                const tone = getToneForCourse(a.courseName || a.courseShortName || a.course, courses);
                const toneStyle = TONE_STYLES[tone] || TONE_STYLES.primary;

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedAssignment(a)}
                    className="sarv-card p-4 space-y-3 hover:border-primary/50 transition cursor-pointer group shadow-sm relative overflow-hidden"
                  >
                    {/* خط ظریف رنگی نشانگر درس در سمت راست کارت */}
                    <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${toneStyle.borderRight.replace('border-r-', 'bg-')}`} />

                    {/* سطر اول: نام درس + وضعیت تحویل و اشتراک */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block ${toneStyle.bgSoft} ${toneStyle.text}`}>
                          {cleanCourseName(a.courseName || a.courseShortName)}
                        </span>
                        <h3 className="text-xs font-black text-base-content group-hover:text-primary transition leading-relaxed pt-0.5">
                          {cleanPersianText(a.name)}
                        </h3>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {(() => {
                          const status = a.submissionStatus?.status;
                          const isGraded = Boolean(a.gradeInfo?.grade || a.lastattempt?.graded);
                          if (isGraded) {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>نمره ثبت شد</span>
                              </span>
                            );
                          }
                          if (status === 'submitted') {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-success/15 text-success border border-success/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span>تحویل داده شده</span>
                              </span>
                            );
                          }
                          if (status === 'draft') {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-amber-500/15 text-amber-600 border border-amber-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>پیش‌نویس</span>
                              </span>
                            );
                          }
                          if (timing.isOverdue) {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-base-500/20 text-neutral border border-base-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral" />
                                <span>مهلت پایان یافت</span>
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-primary/10 text-primary border border-primary/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <span>در انتظار انجام</span>
                            </span>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={(e) => handleExport(e, a)}
                          className="p-1.5 rounded-lg text-neutral hover:text-emerald-500 hover:bg-emerald-500/10 transition"
                          title="انتقال به سروستان"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* سطر پایانی: تاریخ مهلت، وضعیت زمانی و لینک مشاهده بدون بیرون‌زدگی */}
                    <div className="pt-2 border-t border-base-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${toneStyle.bgSoft} ${toneStyle.text} ${toneStyle.border}`}>
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{formatPersianDate(a.duedate)}</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${timing.badgeBg}`}>
                          {timing.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 text-primary font-bold text-[11px] group-hover:-translate-x-1 transition-transform shrink-0 mr-auto">
                        <span>مشاهده و جزئیات</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* لیست آزمون‌ها و کوییزها */
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <div className="sarv-card p-12 text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-neutral/40 mx-auto" />
              <p className="text-xs font-bold text-neutral">آزمونی در سامانه یافت نشد.</p>
            </div>
          ) : (
            quizzes.map((q, idx) => {
              const attemptCount = q.attempts?.length || 0;
              const hasAttempt = attemptCount > 0;
              const lastAttempt = hasAttempt ? q.attempts[attemptCount - 1] : null;
              const qTone = getToneForCourse(q.courseName || q.course, courses);
              const qToneStyle = TONE_STYLES[qTone] || TONE_STYLES.secondary;

              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedQuiz(q)}
                  className="sarv-card p-4 space-y-3 hover:border-primary/50 transition cursor-pointer group shadow-sm relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${qToneStyle.borderRight.replace('border-r-', 'bg-')}`} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block ${qToneStyle.bgSoft} ${qToneStyle.text}`}>
                        {cleanPersianText(q.courseName || 'آزمون آنلاین')}
                      </span>
                      <h3 className="text-xs font-black text-base-content group-hover:text-primary transition leading-relaxed pt-0.5">
                        {cleanPersianText(q.name)}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        hasAttempt ? 'bg-success/15 text-success' : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {hasAttempt ? 'شرکت کرده‌اید' : 'در انتظار شرکت'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-neutral pt-2 border-t border-base-500/20 gap-2">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-neutral" />
                      <span>مدت: {toFaDigits(Math.floor((q.timelimit || 1200) / 60))} دقیقه</span>
                    </span>

                    <div className="flex items-center gap-2 shrink-0 mr-auto">
                      {lastAttempt && (
                        <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded-full">
                          نمره: {lastAttempt.gradeFormatted || `${toFaDigits(lastAttempt.sumgrades || 0)} / ۲۰`}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-primary font-bold text-[11px] group-hover:-translate-x-1 transition-transform">
                        <span>مشاهده آزمون</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* پنجره تعاملی جزئیات و ارسال تکلیف */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onSubmitted={() => {}}
        />
      )}

      {/* پنجره تعاملی مشخصات کوییز */}
      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          courseName={selectedQuiz.courseName}
          onClose={() => setSelectedQuiz(null)}
        />
      )}
    </div>
  );
}
