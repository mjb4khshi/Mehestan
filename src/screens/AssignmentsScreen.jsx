import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Share2,
  Filter,
  CheckCircle2,
  ChevronLeft,
  Upload,
  HelpCircle,
  FileQuestion,
  Award,
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

  const handleExport = (e, assignment) => {
    e.stopPropagation();
    exportAssignmentToSarvestan(assignment, assignment.courseName);
    setExportedMsg(`تکلیف «${cleanPersianText(assignment.name)}» به سروستان منتقل شد.`);
    setTimeout(() => setExportedMsg(''), 3000);
  };

  return (
    <div className="p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto min-w-0">
      {/* سوییچ نوع فعالیت: تکالیف یا آزمون‌های آنلاین با مستطیل لغزان نرم سبک سروستان */}
      <div className="sarv-seg relative">
        <button
          type="button"
          onClick={() => setActivityType('assign')}
          className={`relative flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer z-10 ${
            activityType === 'assign'
              ? 'text-primary-content'
              : 'text-neutral hover:text-base-content'
          }`}
        >
          {activityType === 'assign' && (
            <motion.div
              layoutId="assignActivityTabIndicator"
              className="absolute inset-0 bg-primary rounded-xl shadow-xs -z-10"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
            />
          )}
          <CheckSquare className="w-4 h-4" />
          <span>تکالیف درسی ({toFaDigits(assignments.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivityType('quiz')}
          className={`relative flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer z-10 ${
            activityType === 'quiz'
              ? 'text-primary-content'
              : 'text-neutral hover:text-base-content'
          }`}
        >
          {activityType === 'quiz' && (
            <motion.div
              layoutId="assignActivityTabIndicator"
              className="absolute inset-0 bg-primary rounded-xl shadow-xs -z-10"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
            />
          )}
          <HelpCircle className="w-4 h-4" />
          <span>آزمون‌ها و کوییزها ({toFaDigits(quizzes.length)})</span>
        </button>
      </div>

      {activityType === 'assign' ? (
        <>
          {/* فیلترها با مستطیل لغزان و دکمه انتقال کلی به سروستان */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="sarv-seg text-xs relative">
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`relative px-3 py-1.5 rounded-xl font-bold transition cursor-pointer z-10 ${
                  filter === 'pending'
                    ? 'text-primary-content'
                    : 'text-neutral hover:text-base-content'
                }`}
              >
                {filter === 'pending' && (
                  <motion.div
                    layoutId="assignFilterTabIndicator"
                    className="absolute inset-0 bg-primary rounded-xl shadow-xs -z-10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
                  />
                )}
                <span>در انتظار انجام ({toFaDigits(assignments.filter((a) => a.duedate && a.duedate > nowSec).length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`relative px-3 py-1.5 rounded-xl font-bold transition cursor-pointer z-10 ${
                  filter === 'all'
                    ? 'text-primary-content'
                    : 'text-neutral hover:text-base-content'
                }`}
              >
                {filter === 'all' && (
                  <motion.div
                    layoutId="assignFilterTabIndicator"
                    className="absolute inset-0 bg-primary rounded-xl shadow-xs -z-10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
                  />
                )}
                <span>همه ({toFaDigits(assignments.length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('past')}
                className={`relative px-3 py-1.5 rounded-xl font-bold transition cursor-pointer z-10 ${
                  filter === 'past'
                    ? 'text-primary-content'
                    : 'text-neutral hover:text-base-content'
                }`}
              >
                {filter === 'past' && (
                  <motion.div
                    layoutId="assignFilterTabIndicator"
                    className="absolute inset-0 bg-primary rounded-xl shadow-xs -z-10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
                  />
                )}
                <span>گذشته</span>
              </button>
            </div>

            {assignments.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => exportAllAssignmentsToSarvestan(filteredAssignments)}
                className="px-3 py-2 rounded-2xl bg-success-soft border border-success/30 text-success text-xs font-bold hover:bg-success/20 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>انتقال به سروستان</span>
              </motion.button>
            )}
          </div>

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
                const isSubmitted = a.submissionStatus?.status === 'submitted';
                const timing = formatAssignmentTiming(a.duedate);

                const tone = getToneForCourse(a.courseName || a.courseShortName || a.course, courses);
                const toneStyle = TONE_STYLES[tone] || TONE_STYLES.primary;

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => setSelectedAssignment(a)}
                    className={`sarv-card p-4 space-y-3 hover:border-primary/50 transition cursor-pointer group shadow-sm border-r-4 ${toneStyle.borderRight}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${toneStyle.bgSoft} ${toneStyle.text}`}>
                          {cleanCourseName(a.courseName || a.courseShortName)}
                        </span>
                        <h3 className="text-xs font-black text-base-content group-hover:text-primary transition leading-relaxed">
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
                                <span>مهلت تحویل پایان یافت</span>
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
                          title="انتقال به برنامه روزانه سروستان"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral pt-2 border-t border-base-500/20">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-neutral" />
                        <span>{formatPersianDate(a.duedate)}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${timing.badgeBg}`}>
                          {timing.text}
                        </span>
                        <div className="flex items-center gap-1 text-primary font-bold text-[11px] group-hover:translate-x-[-2px] transition-transform">
                          <span>مشاهده و ارسال</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </div>
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
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setSelectedQuiz(q)}
                  className={`sarv-card p-4 space-y-3 hover:border-primary/50 transition cursor-pointer group shadow-sm border-r-4 ${qToneStyle.borderRight}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${qToneStyle.bgSoft} ${qToneStyle.text}`}>
                        {cleanPersianText(q.courseName || 'آزمون آنلاین')}
                      </span>
                      <h3 className="text-xs font-black text-base-content group-hover:text-primary transition leading-relaxed">
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

                  <div className="flex items-center justify-between text-xs text-neutral pt-2 border-t border-base-500/20">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-neutral" />
                      <span>مدت: {toFaDigits(Math.floor((q.timelimit || 1200) / 60))} دقیقه</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {lastAttempt && (
                        <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded-full">
                          نمره: {lastAttempt.gradeFormatted || `${toFaDigits(lastAttempt.sumgrades || 0)} / ۲۰`}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-purple-500 font-bold text-[11px] group-hover:translate-x-[-2px] transition-transform">
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