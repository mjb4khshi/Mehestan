import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckSquare,
  Clock,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Share2,
  Sparkles,
  ChevronLeft,
  GraduationCap,
  User,
} from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import {
  exportAllAssignmentsToSarvestan,
  getSarvestanCourses,
  getToneForCourse,
  getCourseSarvestanInfo,
  TONE_STYLES,
  initSarvestanBridgeListener,
} from '../services/sarvestanBridge';
import { cleanCourseName, cleanCourseCode, cleanPersianText, toFaDigits, formatAssignmentTiming } from '../utils/persianUtils';
import AssignmentDetailModal from '../components/AssignmentDetailModal';

export default function HomeScreen({ onSelectCourse, onGoToAssignments }) {
  const { siteInfo, courses, assignments, loading } = useMoodleAuth();
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [sarvCourses, setSarvCourses] = useState(() => getSarvestanCourses());

  // دریافت بلادرنگ اطلاعات و تغییرات دروس از سروستان
  useEffect(() => {
    const cleanup = initSarvestanBridgeListener(() => {
      setSarvCourses(getSarvestanCourses());
    });
    return cleanup;
  }, []);

  const nowSec = Math.floor(Date.now() / 1000);
  const pendingAssignments = assignments
    .filter((a) => a.duedate && a.duedate > nowSec)
    .sort((a, b) => a.duedate - b.duedate);

  const nearestAssignment = pendingAssignments[0];
  const nearestTiming = nearestAssignment ? formatAssignmentTiming(nearestAssignment.duedate) : null;
  const displayName = cleanPersianText(siteInfo?.fullname) || 'دانشجوی گرامی';

  return (
    <div className="p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto w-full min-w-0">
      {/* هیرو کارت هویت دانشجو — سبک دقیق ردیفی سروستان (PROFILE_CARD_LAYOUT = 'row') */}
      <section className="sarv-card p-4 sm:p-5 border border-base-500/50 relative overflow-hidden shadow-sm">
        <div className="w-full flex items-stretch gap-3.5">
          {/* تصویر آواتار مربعی با گوشه‌های گرد و نشانگر آنلاین */}
          <div className="relative shrink-0 w-[84px] h-[84px] sm:w-[92px] sm:h-[92px]">
            {siteInfo?.userpictureurl ? (
              <img
                src={siteInfo.userpictureurl}
                alt=""
                className="w-full h-full rounded-2xl object-cover shadow-md border-2 border-base"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-primary text-primary-content font-black text-2xl grid place-items-center shadow-md border-2 border-base">
                {displayName ? displayName.slice(0, 1) : 'م'}
              </div>
            )}
            {/* نشانگر آنلاین / متصل بودن به مودل */}
            <span
              className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full ring-2 ring-base bg-success"
              title="متصل به مودل"
            />
          </div>

          {/* مشخصات: نام و شناسه و چیپ‌های وضعیت */}
          <div className="flex-1 min-w-0 text-right flex flex-col justify-between py-0.5">
            <div>
              <h2 className="text-[16px] sm:text-[17px] font-black text-base-content leading-snug truncate">
                {displayName}
              </h2>
              {siteInfo?.username && (
                <p className="text-[11.5px] font-medium mt-0.5 truncate">
                  <span className="font-mono text-base-content font-bold">{toFaDigits(siteInfo.username)}</span>
                </p>
              )}
              <p className="text-[11px] text-neutral font-medium mt-0.5 truncate">
                {siteInfo?.sitename || 'دانشگاه صنعتی خواجه نصیرالدین طوسی'}
              </p>
            </div>

            {/* بج‌های اطلاعاتی — هم‌تراز با لبه پایینی تصویر سبک سروستان */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-secondary-soft text-secondary">
                {toFaDigits(courses.length)} درس فعال
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                  pendingAssignments.length > 0
                    ? 'bg-warn-soft text-warn'
                    : 'bg-success-soft text-success'
                }`}
              >
                {pendingAssignments.length > 0
                  ? `${toFaDigits(pendingAssignments.length)} تکلیف در انتظار`
                  : 'تکالیف به‌روز'}
              </span>

              {pendingAssignments.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportAllAssignmentsToSarvestan(pendingAssignments)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/25 transition inline-flex items-center gap-1 cursor-pointer mr-auto"
                  title="انتقال تمام تکالیف به تقویم سروستان"
                >
                  <Share2 className="w-3 h-3" />
                  <span>انتقال به سروستان</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* کارت نزدیک‌ترین موعد تکلیف — فرمت کارت nextClass سروستان */}
      {nearestAssignment && (
        <section
          onClick={() => setSelectedAssignment(nearestAssignment)}
          className="sarv-card p-3.5 lg:p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-warn active:scale-[0.98] transition-all border-r-4 border-r-warn bg-warn-soft min-w-0 shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-warn text-warn-content grid place-items-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-warn">
                  نزدیک‌ترین موعد تکلیف:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warn text-warn-content font-bold font-mono">
                  {nearestTiming?.text}
                </span>
              </div>
              <h4 className="text-[14px] font-bold text-base-content truncate mt-0.5">
                {cleanPersianText(nearestAssignment.name)}
              </h4>
              <p className="text-[11px] text-neutral truncate">
                {cleanCourseName(nearestAssignment.courseName || nearestAssignment.courseShortName)}
              </p>
            </div>
          </div>
          <ChevronLeft className="w-4.5 h-4.5 text-neutral shrink-0" />
        </section>
      )}

      {/* بخش دروس جاری */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-base-content flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>دروس ترم جاری</span>
          </h3>
          <span className="text-xs text-neutral font-bold">{toFaDigits(courses.length)} عنوان درس</span>
        </div>

        {courses.length === 0 ? (
          <div className="sarv-card p-8 text-center text-xs text-neutral">
            درسی در سامانه مودل یافت نشد یا در حال بارگذاری است.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
            {courses.map((course) => {
              const sarvInfo = getCourseSarvestanInfo(course, sarvCourses);
              const tone = sarvInfo.color || getToneForCourse(course, courses, sarvCourses);
              const toneStyle = TONE_STYLES[tone] || TONE_STYLES.primary;
              const courseCode = cleanCourseCode(course.shortname || course.fullname);

              return (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse && onSelectCourse(course)}
                  className={`sarv-card p-4 hover:border-primary/50 transition cursor-pointer space-y-2.5 group shadow-sm min-w-0 overflow-hidden border-r-4 ${toneStyle.borderRight}`}
                >
                  {/* عنوان درس در راست و بج کد درس در چپ — دقیقا در یک ارتفاع بدون فضای خالی */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <h4 className="text-[13.5px] font-black text-base-content leading-snug group-hover:text-primary transition line-clamp-2 min-w-0 flex-1">
                      {cleanCourseName(course.fullname)}
                    </h4>

                    {courseCode && (
                      <span
                        dir="ltr"
                        className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 font-mono tracking-tight ${toneStyle.bgSoft} ${toneStyle.text}`}
                      >
                        {courseCode}
                      </span>
                    )}
                  </div>

                  {/* نام استاد و مشخصات واحد و زمان برگرفته از سروستان */}
                  {(sarvInfo.professor || sarvInfo.units || sarvInfo.classTime || course.categoryname) && (
                    <div className="flex items-center gap-2 text-[11px] text-neutral font-medium pt-0.5 flex-wrap">
                      {sarvInfo.professor && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-neutral/70 shrink-0" />
                          <span className="truncate">{cleanPersianText(sarvInfo.professor)}</span>
                        </span>
                      )}
                      {sarvInfo.units && (
                        <span className="px-1.5 py-0.5 rounded-md bg-base-500/15 text-[10px] font-bold">
                          {toFaDigits(sarvInfo.units)} واحد
                        </span>
                      )}
                      {sarvInfo.classTime && (
                        <span className="text-[10px] text-neutral/80 truncate">
                          {cleanPersianText(sarvInfo.classTime)}
                        </span>
                      )}
                      {course.categoryname && !sarvInfo.professor && (
                        <span className="text-[10px] text-neutral/70 truncate">
                          {cleanPersianText(course.categoryname)}
                        </span>
                      )}
                      {typeof course.progress === 'number' && !isNaN(course.progress) && course.progress > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary-soft text-secondary font-mono mr-auto">
                          {toFaDigits(Math.round(course.progress))}٪
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-base-500/20 flex items-center justify-between text-[11px] text-primary font-bold">
                    <span>مشاهده محتوا و تکالیف</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* پنجره تعاملی تکلیف در صورت کلیک */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onSubmitted={() => {}}
        />
      )}
    </div>
  );
}
