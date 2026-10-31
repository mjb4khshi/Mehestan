import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  Download,
  Trash2,
  Send,
  MessageSquare,
  Award,
  ExternalLink,
  ShieldAlert,
  Info,
  Layers,
  FileCheck,
  FileArchive,
  FileCode,
  Lock,
  Unlock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import {
  getAssignmentSubmissionStatus,
  uploadMoodleFile,
  saveAssignmentSubmission,
  submitAssignmentForGrading,
  getMoodleFileUrl,
} from '../services/moodle/api';
import { exportAssignmentToSarvestan } from '../services/sarvestanBridge';
import {
  cleanPersianText,
  cleanCourseName,
  toFaDigits,
  toFaNumber,
  formatPersianDate,
  formatAssignmentTiming,
  formatFileSizeFa,
} from '../utils/persianUtils';

export default function AssignmentDetailModal({ assignment, onClose, onSubmitted }) {
  const { session } = useMoodleAuth();
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // فیلدهای فرم ارسال
  const [selectedFile, setSelectedFile] = useState(null);
  const [onlineText, setOnlineText] = useState('');

  // استعلام وضعیت دقیق تحویل و نمره از مودل
  useEffect(() => {
    async function loadStatus() {
      if (!session || !assignment) return;
      setLoading(true);
      setActionError('');
      try {
        const res = await getAssignmentSubmissionStatus(session.siteUrl, session.token, assignment.id);
        setSubmissionStatus(res);

        // استخراج متن آنلاین قبلی در صورت وجود
        const plugins = res?.lastattempt?.submission?.plugins || [];
        const textPlugin = plugins.find((p) => p.type === 'onlinetext');
        if (textPlugin?.editorfields?.[0]?.text) {
          setOnlineText(textPlugin.editorfields[0].text);
        }
      } catch (err) {
        console.error('Failed to load submission status:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, [assignment, session]);

  // پرتاب کاغذ رنگی جشن سبک سروستان
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.7 },
        colors: ['#0077c2', '#fe28a2', '#dda15e', '#10b981', '#00f0ff'],
      });
    } catch {
      // Ignore
    }
  };

  // ارسال تکلیف (آپلود فایل + ذخیره در وب‌سرویس مودل)
  const handleSaveSubmission = async (e) => {
    e?.preventDefault();
    if (!selectedFile && !onlineText.trim()) {
      setActionError('لطفاً حداقل یک فایل یا متن پاسخ را برای ارسال انتخاب فرمایید.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      let fileItemId = null;
      if (selectedFile) {
        const uploadRes = await uploadMoodleFile(session.siteUrl, session.token, selectedFile);
        fileItemId = uploadRes.itemid;
      }

      await saveAssignmentSubmission(session.siteUrl, session.token, assignment.id, {
        fileItemId,
        onlineText: onlineText.trim() ? onlineText.trim() : undefined,
      });

      triggerCelebration();
      setActionSuccess('تکلیف با موفقیت در سامانه مودل بارگذاری و ثبت شد.');
      setSelectedFile(null);

      const updated = await getAssignmentSubmissionStatus(session.siteUrl, session.token, assignment.id);
      setSubmissionStatus(updated);

      if (onSubmitted) onSubmitted();
    } catch (err) {
      setActionError(err.message || 'خطا در ثبت و بارگذاری پاسخ در مودل');
    } finally {
      setActionLoading(false);
    }
  };

  // ارسال نهایی برای نمره‌دهی (Finalize submission)
  const handleSubmitForGrading = async () => {
    if (!window.confirm('آیا از ارسال نهایی این تکلیف اطمینان دارید؟ پس از این مرحله امکان ویرایش فایل‌ها وجود ندارد.')) {
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      await submitAssignmentForGrading(session.siteUrl, session.token, assignment.id);
      triggerCelebration();
      setActionSuccess('تکلیف با موفقیت برای نمره‌دهی استاد نهایی شد.');

      const updated = await getAssignmentSubmissionStatus(session.siteUrl, session.token, assignment.id);
      setSubmissionStatus(updated);

      if (onSubmitted) onSubmitted();
    } catch (err) {
      setActionError(err.message || 'خطا در ارسال نهایی تکلیف به مودل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportSarv = () => {
    exportAssignmentToSarvestan(assignment, assignment.courseName);
    setActionSuccess('تکلیف با موفقیت به برنامه روزانه سروستان اضافه شد.');
    setTimeout(() => setActionSuccess(''), 3000);
  };

  // استخراج تمام جزئیات از ساختار پیچیده مودل
  const lastAttempt = submissionStatus?.lastattempt;
  const currentSubmission = lastAttempt?.submission;
  const isSubmitted = currentSubmission?.status === 'submitted';
  const isDraft = currentSubmission?.status === 'draft';
  const isGraded = lastAttempt?.graded;
  const gradeInfo = lastAttempt?.feedback?.grade;
  const feedbackPlugins = lastAttempt?.feedback?.plugins || [];
  const instructorComment = feedbackPlugins.find((p) => p.type === 'comments')?.editorfields?.[0]?.text;
  const feedbackFiles = feedbackPlugins.find((p) => p.type === 'file')?.fileareas?.[0]?.files || [];

  // فایل‌های تحویل داده شده توسط دانشجو
  const submissionPlugins = currentSubmission?.plugins || [];
  const studentFiles = submissionPlugins.find((p) => p.type === 'file')?.fileareas?.[0]?.files || [];

  // محاسبه وضعیت دقیق زمانی با استفاده از پارسر فارسی
  // توجه: فقط در صورتی که تکلیف واقعاً تحویل شده باشد (isSubmitted)، زمان تحویل به تابع ارسال می‌شود
  const timing = formatAssignmentTiming(
    assignment.duedate,
    isSubmitted ? (currentSubmission?.timemodified || currentSubmission?.timecreated) : null,
    isSubmitted
  );

  // بررسی تنظیمات بارگذاری تعیین‌شده توسط استاد
  const configs = assignment.configs || [];
  const maxFiles = configs.find((c) => c.name === 'maxfilesubmissions')?.value || assignment.maxfilesubmissions;
  const maxSizeBytes = configs.find((c) => c.name === 'maxsubmissionsizebytes')?.value || assignment.maxsubmissionsizebytes;
  const fileTypes = configs.find((c) => c.name === 'filetypeslist')?.value || assignment.filetypeslist;

  const canEdit = lastAttempt ? lastAttempt.canedit : !isSubmitted;
  const attemptNum = lastAttempt?.submission?.attemptnumber !== undefined ? lastAttempt.submission.attemptnumber + 1 : 1;
  const maxAttempts = assignment.maxattempts && assignment.maxattempts > 0 ? assignment.maxattempts : 'نامحدود';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* پس‌زمینه تاریک با انیمیشن فید */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/65 backdrop-blur-md"
        />

        {/* کارت مدال با پاپ‌آپ فنری سبک سروستان */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="sarv-card relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-base-500/40"
        >
          {/* سربرگ پنجره */}
          <div className="p-4 border-b border-base-500/20 flex items-center justify-between gap-3 bg-base-500/10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  {cleanCourseName(assignment.courseName || assignment.courseShortName)}
                </span>
                {Boolean(assignment.id) && (
                  <span className="text-[10px] text-neutral/80 font-mono">
                    شناسه: {toFaDigits(assignment.id)}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black text-base-content truncate mt-1 leading-relaxed">
                {cleanPersianText(assignment.name)}
              </h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-base-500/25 text-neutral hover:text-base-content transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* بدنه اسکرول‌شونده و حاوی تمام متادیتای مودل */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
            {/* کارت وضعیت زمانی و وضعیت تحویل */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* زمان‌بندی و ددلاین */}
              <div className="p-3.5 rounded-xl bg-base-500/15 border border-base-500/25 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>موعد رسمی تحویل:</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${timing.badgeBg}`}>
                    {timing.text}
                  </span>
                </div>
                <p className="font-black text-base-content text-xs">
                  {formatPersianDate(assignment.duedate)}
                </p>
                {Boolean(assignment.cutoffdate && assignment.cutoffdate > 0) && (
                  <p className="text-[10px] text-neutral flex items-center gap-1 pt-1 border-t border-base-500/15">
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                    <span>مهلت قطعی بسته شدن: {formatPersianDate(assignment.cutoffdate)}</span>
                  </p>
                )}
              </div>

              {/* وضعیت تحویل دانشجو */}
              <div className="p-3.5 rounded-xl bg-base-500/15 border border-base-500/25 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-primary" />
                    <span>وضعیت ارسال شما:</span>
                  </span>
                  <span className="text-[10px] font-bold text-neutral">
                    تلاش {toFaDigits(attemptNum)} از {toFaDigits(maxAttempts)}
                  </span>
                </div>
                <div>
                  {loading ? (
                    <span className="text-neutral flex items-center gap-1 text-[11px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>استعلام آنلاین وضعیت از مودل...</span>
                    </span>
                  ) : isSubmitted ? (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-success/20 text-success font-black text-[11px] border border-success/30">
                        تحویل داده شده برای تصحیح
                      </span>
                      {canEdit ? (
                        <span className="text-[10px] text-neutral flex items-center gap-1">
                          <Unlock className="w-3 h-3" /> ویرایش آزاد
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral flex items-center gap-1">
                          <Lock className="w-3 h-3" /> قفل شده
                        </span>
                      )}
                    </div>
                  ) : isDraft ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-warning/20 text-warning font-black text-[11px] border border-warning/30">
                      پیش‌نویس اولیه (نهایی نشده)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md bg-base-500/30 text-neutral font-bold text-[11px]">
                      هیچ پاسخی تحویل داده نشده است
                    </span>
                  )}
                </div>
                {(isSubmitted || isDraft) && currentSubmission?.timemodified && (
                  <p className="text-[10px] text-neutral pt-1 border-t border-base-500/15">
                    زمان ثبت آخرین نسخه: {formatPersianDate(currentSubmission.timemodified)}
                  </p>
                )}
              </div>
            </div>

            {/* بخش نمره و کارنامه و بازخورد استاد */}
            {(isGraded || gradeInfo) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-success-soft border border-success/30 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-success flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>نمره نهایی: {toFaDigits(gradeInfo?.gradefordisplay || gradeInfo?.grade || 'ثبت شده')}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-success/20 text-success font-bold text-[10px]">
                    تصحیح شده
                  </span>
                </div>

                {instructorComment && (
                  <div className="pt-2 border-t border-success/20 text-[11px] text-base-content space-y-1">
                    <span className="font-bold text-neutral flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>نظر و تحلیل استاد:</span>
                    </span>
                    <div
                      className="leading-relaxed bg-base-500/20 p-2.5 rounded-lg border border-base-500/30"
                      dangerouslySetInnerHTML={{ __html: cleanPersianText(instructorComment) }}
                    />
                  </div>
                )}

                {/* فایل‌های بازخورد یا برگه تصحیح‌شده استاد */}
                {feedbackFiles.length > 0 && (
                  <div className="pt-2 border-t border-success/20 space-y-1.5">
                    <span className="font-bold text-neutral text-[11px] block">فایل تصحیح‌شده / پاسخنامه ضمیمه استاد:</span>
                    <div className="space-y-1">
                      {feedbackFiles.map((f, idx) => (
                        <a
                          key={idx}
                          href={getMoodleFileUrl(f.fileurl, session.token)}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="p-2 rounded-lg bg-base-500/20 hover:bg-base-500/30 text-success font-bold flex items-center justify-between transition text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{cleanPersianText(f.filename)}</span>
                          </div>
                          <span className="text-[10px] text-neutral shrink-0 mr-2 flex items-center gap-1">
                            {formatFileSizeFa(f.filesize)} <Download className="w-3 h-3 text-success" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* صورت تکلیف و سوالات مطرح‌شده */}
            {assignment.intro && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-neutral text-[11px] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span>دستورالعمل و متن صورت تکلیف:</span>
                </h4>
                <div
                  className="p-3.5 rounded-xl bg-base-500/15 border border-base-500/25 leading-relaxed text-base-content space-y-2 prose prose-sm max-w-none text-xs"
                  dangerouslySetInnerHTML={{ __html: cleanPersianText(assignment.intro) }}
                />
              </div>
            )}

            {/* فایل‌های صورت سوال ضمیمه‌شده توسط استاد */}
            {assignment.introattachments && assignment.introattachments.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-neutral text-[11px]">فایل‌های ضمیمه صورت سوال (استاد):</h4>
                <div className="space-y-1.5">
                  {assignment.introattachments.map((file, idx) => (
                    <a
                      key={idx}
                      href={getMoodleFileUrl(file.fileurl, session.token)}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary flex items-center justify-between transition cursor-pointer font-bold"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">{cleanPersianText(file.filename)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral shrink-0">
                        <span>{formatFileSizeFa(file.filesize)}</span>
                        <Download className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* فایل‌های ارسالی قبلی توسط دانشجو */}
            {studentFiles.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-neutral text-[11px] flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-success" />
                  <span>فایل‌های پاسخ ثبت‌شده توسط شما:</span>
                </h4>
                <div className="space-y-1.5">
                  {studentFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-base-500/20 border border-base-500/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-success shrink-0" />
                        <span className="font-bold text-base-content truncate">{cleanPersianText(file.filename)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[10px] text-neutral font-mono">{formatFileSizeFa(file.filesize)}</span>
                        <a
                          href={getMoodleFileUrl(file.fileurl, session.token)}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="p-1 rounded text-primary hover:bg-primary/10 transition"
                          title="دانلود فایل ارسالی"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* قوانین و مشخصات بارگذاری */}
            {(maxFiles || maxSizeBytes || fileTypes) && (
              <div className="p-2.5 rounded-xl bg-base-500/10 border border-base-500/20 flex items-center justify-between flex-wrap gap-2 text-[10px] text-neutral">
                {maxFiles && <span>حداکثر تعداد فایل: {toFaDigits(maxFiles)} عدد</span>}
                {maxSizeBytes && <span>حداکثر حجم مجاز: {formatFileSizeFa(maxSizeBytes)}</span>}
                {fileTypes && <span>فرمت‌های مجاز: {cleanPersianText(fileTypes)}</span>}
              </div>
            )}

            {/* اعلان پیام‌های عملیات */}
            {actionSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-success-soft border border-success/30 text-success font-bold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </motion.div>
            )}
            {actionError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-error/15 border border-error/30 text-error font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </motion.div>
            )}

            {/* فرم تعاملی ارسال پاسخ (Interactive Submission) */}
            <div className="pt-2 border-t border-base-500/25 space-y-3">
              <h4 className="font-black text-base-content text-xs flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-primary" />
                <span>ارسال یا به‌روزرسانی پاسخ به این تکلیف:</span>
              </h4>

              {/* بخش انتخاب فایل */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral">انتخاب فایل پاسخ (PDF, ZIP, Word):</label>
                <div className="relative">
                  <input
                    type="file"
                    id="assignment-file-input"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="assignment-file-input"
                    className="p-4 rounded-xl border-2 border-dashed border-base-500/40 hover:border-primary/60 bg-base-500/10 hover:bg-base-500/20 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center"
                  >
                    <Upload className="w-6 h-6 text-primary" />
                    {selectedFile ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-base-content truncate max-w-xs">{cleanPersianText(selectedFile.name)}</p>
                        <p className="text-[10px] text-neutral">{formatFileSizeFa(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="font-bold text-base-content">برای انتخاب فایل اینجا کلیک کنید</p>
                        <p className="text-[10px] text-neutral">یا فایل را به داخل این کادر بکشید</p>
                      </div>
                    )}
                  </label>
                </div>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-[10px] text-error hover:underline flex items-center gap-1 font-bold cursor-pointer mr-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف فایل انتخاب‌شده</span>
                  </button>
                )}
              </div>

              {/* بخش پاسخ متنی */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral">پاسخ متنی یا توضیحات برای استاد (اختیاری):</label>
                <textarea
                  value={onlineText}
                  onChange={(e) => setOnlineText(e.target.value)}
                  placeholder="توضیحات، پاسخ تشریحی یا پیوند پروژه در گیت‌هاب..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-sans text-right focus:outline-none focus:border-primary transition leading-relaxed resize-none"
                />
              </div>
            </div>
          </div>

          {/* پاورقی دکمه‌های عملیاتی سبک سروستان */}
          <div className="p-3.5 border-t border-base-500/20 bg-base-500/10 flex items-center justify-between gap-2 flex-wrap">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleExportSarv}
              className="px-3.5 py-2 rounded-2xl bg-success-soft border border-success/30 text-success text-xs font-bold hover:bg-success/20 transition flex items-center gap-1.5 cursor-pointer"
              title="انتقال به برنامه روزانه سروستان"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>انتقال به سروستان</span>
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleSaveSubmission}
                disabled={actionLoading || (!selectedFile && !onlineText.trim())}
                className="px-4 py-2 rounded-2xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ارسال به مودل...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>بارگذاری در مودل</span>
                  </>
                )}
              </motion.button>

              {isDraft && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleSubmitForGrading}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-2xl bg-success text-success-content text-xs font-black hover:brightness-110 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                  title="تایید نهایی جهت تصحیح توسط استاد"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال نهایی</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
