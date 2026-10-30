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
} from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import {
  getAssignmentSubmissionStatus,
  uploadMoodleFile,
  saveAssignmentSubmission,
  submitAssignmentForGrading,
  getMoodleFileUrl,
  formatFileSize,
} from '../services/moodle/api';
import { exportAssignmentToSarvestan } from '../services/sarvestanBridge';

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

  const nowSec = Math.floor(Date.now() / 1000);
  const isDuePast = assignment.duedate && assignment.duedate < nowSec;
  const remainingSec = assignment.duedate ? assignment.duedate - nowSec : null;

  // دریافت وضعیت دقیق تحویل تکلیف از مودل
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
        // ۱. آپلود فایل در پوشه پیش‌نویس مودل (webservice/upload.php)
        const uploadRes = await uploadMoodleFile(session.siteUrl, session.token, selectedFile);
        fileItemId = uploadRes.itemid;
      }

      // ۲. ذخیره پاسخ تکلیف در مودل (mod_assign_save_submission)
      await saveAssignmentSubmission(session.siteUrl, session.token, assignment.id, {
        fileItemId,
        onlineText: onlineText.trim() ? onlineText.trim() : undefined,
      });

      setActionSuccess('تکلیف با موفقیت در سامانه مودل بارگذاری و ذخیره شد.');
      setSelectedFile(null);

      // به‌روزرسانی مجدد وضعیت تحویل
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
    if (!window.confirm('آیا از ارسال نهایی این تکلیف اطمینان دارید؟ پس از این مرحله ممکن است امکان ویرایش وجود نداشته باشد.')) {
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      await submitAssignmentForGrading(session.siteUrl, session.token, assignment.id);
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

  const formatDueDate = (timestamp) => {
    if (!timestamp) return 'بدون موعد مشخص';
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString('fa-IR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRemainingTime = (sec) => {
    if (sec <= 0) return 'مهلت به پایان رسیده است';
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    if (days > 0) return `${days} روز و ${hours} ساعت باقی‌مانده`;
    const mins = Math.floor((sec % 3600) / 60);
    return `${hours} ساعت و ${mins} دقیقه باقی‌مانده`;
  };

  const lastAttempt = submissionStatus?.lastattempt;
  const currentSubmission = lastAttempt?.submission;
  const isSubmitted = currentSubmission?.status === 'submitted';
  const isDraft = currentSubmission?.status === 'draft';
  const gradeInfo = lastAttempt?.feedback?.grade;
  const feedbackPlugins = lastAttempt?.feedback?.plugins || [];
  const instructorComment = feedbackPlugins.find((p) => p.type === 'comments')?.editorfields?.[0]?.text;

  // فایل‌های پیوست‌شده فعلی دانشجو
  const submissionPlugins = currentSubmission?.plugins || [];
  const filePlugin = submissionPlugins.find((p) => p.type === 'file');
  const existingFiles = filePlugin?.fileareas?.[0]?.files || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="sarv-card w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-base-500/30">
        {/* سربرگ پنجره */}
        <div className="p-4 border-b border-base-500/20 flex items-center justify-between gap-3 bg-base-500/10">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {assignment.courseName || assignment.courseShortName}
            </span>
            <h3 className="text-sm font-black text-base-content truncate mt-1">{assignment.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-base-500/25 text-neutral hover:text-base-content transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه اسکرول‌شونده */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* کارت وضعیت موعد و تحویل */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-base-500/15 border border-base-500/25 space-y-1">
              <span className="text-[10px] font-bold text-neutral flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>مهلت تحویل:</span>
              </span>
              <p className="font-bold text-base-content text-[11px]">{formatDueDate(assignment.duedate)}</p>
              {remainingSec !== null && (
                <span className={`text-[10px] font-bold block ${isDuePast ? 'text-error' : 'text-amber-500'}`}>
                  {formatRemainingTime(remainingSec)}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-base-500/15 border border-base-500/25 space-y-1">
              <span className="text-[10px] font-bold text-neutral flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span>وضعیت تحویل:</span>
              </span>
              <div>
                {loading ? (
                  <span className="text-neutral flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>استعلام...</span>
                  </span>
                ) : isSubmitted ? (
                  <span className="px-2 py-0.5 rounded-md bg-success/20 text-success font-black text-[11px]">
                    ارسال شده برای تصحیح
                  </span>
                ) : isDraft ? (
                  <span className="px-2 py-0.5 rounded-md bg-warning/20 text-warning font-black text-[11px]">
                    پیش‌نویس (ارسال نشده)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-base-500/30 text-neutral font-bold text-[11px]">
                    تحویل داده نشده
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* نمره و نظر استاد در صورت ثبت */}
          {gradeInfo && (
            <div className="p-3.5 rounded-xl bg-success-soft border border-success/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-success flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>نمره ثبت‌شده: {gradeInfo.gradefordisplay || gradeInfo.grade}</span>
                </span>
              </div>
              {instructorComment && (
                <div className="pt-2 border-t border-success/20 text-[11px] text-base-content space-y-1">
                  <span className="font-bold text-neutral flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>نظر و بازخورد استاد:</span>
                  </span>
                  <div
                    className="leading-relaxed bg-base-500/20 p-2 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: instructorComment }}
                  />
                </div>
              )}
            </div>
          )}

          {/* شرح و سوال تکلیف */}
          {assignment.intro && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-neutral text-[11px]">صورت تکلیف و توضیحات استاد:</h4>
              <div
                className="p-3.5 rounded-xl bg-base-500/15 border border-base-500/25 leading-relaxed text-base-content space-y-2 prose prose-sm max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: assignment.intro }}
              />
            </div>
          )}

          {/* فایل‌های صورت سوال ضمیمه‌شده توسط استاد */}
          {assignment.introattachments && assignment.introattachments.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-neutral text-[11px]">فایل‌های ضمیمه صورت سوال:</h4>
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
                      <span className="truncate">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral shrink-0">
                      <span>{formatFileSize(file.filesize)}</span>
                      <Download className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* فایل‌های ارسالی قبلی توسط دانشجو */}
          {existingFiles.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-neutral text-[11px]">فایل‌های ارسال‌شده توسط شما:</h4>
              <div className="space-y-1.5">
                {existingFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-base-500/20 border border-base-500/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-success shrink-0" />
                      <span className="font-bold text-base-content truncate">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-neutral">{formatFileSize(file.filesize)}</span>
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

          {/* اعلان پیام‌های عملیات */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-success-soft border border-success/30 text-success font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* فرم تعاملی ارسال تکلیف (Two-Way Submission) */}
          <div className="pt-2 border-t border-base-500/25 space-y-3">
            <h4 className="font-black text-base-content text-xs flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-primary" />
              <span>ارسال و ویرایش پاسخ تکلیف:</span>
            </h4>

            {/* بخش انتخاب فایل */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral">بارگذاری فایل پاسخ (PDF, ZIP, Word):</label>
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
                      <p className="font-bold text-base-content truncate max-w-xs">{selectedFile.name}</p>
                      <p className="text-[10px] text-neutral">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="font-bold text-base-content">برای انتخاب فایل اینجا کلیک کنید</p>
                      <p className="text-[10px] text-neutral">یا فایل را به این بخش بکشید</p>
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
              <label className="text-[11px] font-bold text-neutral">توضیحات متنی یا پیوند پروژه (اختیاری):</label>
              <textarea
                value={onlineText}
                onChange={(e) => setOnlineText(e.target.value)}
                placeholder="متن پاسخ، نکات اجرایی یا لینک گیت‌هاب پروژه..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-sans text-right focus:outline-none focus:border-primary transition leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* پاورقی دکمه‌های عملیاتی */}
        <div className="p-3.5 border-t border-base-500/20 bg-base-500/10 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportSarv}
            className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer"
            title="انتقال به برنامه روزانه سروستان"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>افزودن به سروستان</span>
          </button>

          <div className="flex items-center gap-2">
            {/* دکمه ذخیره پیش‌نویس / بارگذاری در مودل */}
            <button
              type="button"
              onClick={handleSaveSubmission}
              disabled={actionLoading || (!selectedFile && !onlineText.trim())}
              className="px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
            </button>

            {/* دکمه ارسال نهایی برای نمره‌دهی */}
            {isDraft && (
              <button
                type="button"
                onClick={handleSubmitForGrading}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="تایید نهایی جهت تصحیح توسط استاد"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال نهایی</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
