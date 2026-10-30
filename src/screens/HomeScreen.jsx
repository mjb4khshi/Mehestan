import React from 'react';
import { BookOpen, CheckSquare, Clock, ArrowLeft, ExternalLink, Calendar, Share2 } from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { exportAllAssignmentsToSarvestan } from '../services/sarvestanBridge';

export default function HomeScreen({ onSelectCourse, onGoToAssignments }) {
  const { siteInfo, courses, assignments, loading } = useMoodleAuth();

  const nowMs = Date.now();
  const pendingAssignments = assignments
    .filter((a) => a.duedate && a.duedate * 1000 > nowMs)
    .sort((a, b) => a.duedate - b.duedate);

  const nearestAssignment = pendingAssignments[0];

  const formatDueTime = (timestamp) => {
    if (!timestamp) return 'بدون موعد';
    const d = new Date(timestamp * 1000);
    const diffHours = Math.round((d.getTime() - nowMs) / (1000 * 60 * 60));
    if (diffHours < 24 && diffHours > 0) {
      return `${diffHours} ساعت مانده`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays > 0) {
      return `${diffDays} روز مانده`;
    }
    return 'موعد گذشته';
  };

  return (
    <div className="p-4 space-y-5 pb-24 max-w-2xl mx-auto">
      {/* بنر خوش‌آمدگویی */}
      <div className="mehestan-card p-4 flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-neutral">خوش آمدید،</p>
          <h2 className="text-base font-black text-base-content truncate">
            {siteInfo?.fullname || 'دانشجوی گرامی'}
          </h2>
          <p className="text-[11px] text-neutral flex items-center gap-2">
            <span>{courses.length} درس فعال</span>
            <span>•</span>
            <span className="text-amber-500 font-bold">{pendingAssignments.length} تکلیف در انتظار</span>
          </p>
        </div>

        {pendingAssignments.length > 0 && (
          <button
            type="button"
            onClick={() => exportAllAssignmentsToSarvestan(pendingAssignments)}
            className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer"
            title="انتقال تمام تکالیف به سروستان"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">انتقال به سروستان</span>
          </button>
        )}
      </div>

      {/* کارت نزدیک‌ترین موعد تکلیف */}
      {nearestAssignment && (
        <div className="mehestan-card p-4 border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>نزدیک‌ترین موعد تکلیف:</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px]">
              {formatDueTime(nearestAssignment.duedate)}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-base-content truncate">{nearestAssignment.name}</h3>
            <p className="text-xs text-neutral mt-0.5 truncate">{nearestAssignment.courseName}</p>
          </div>
        </div>
      )}

      {/* لیست دروس */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-base-content flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>دروس ترم جاری</span>
          </h3>
          <span className="text-xs text-neutral">{courses.length} عنوان</span>
        </div>

        {courses.length === 0 ? (
          <div className="mehestan-card p-8 text-center text-xs text-neutral">
            درسی در سامانه مودل یافت نشد یا در حال بارگذاری است.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => onSelectCourse && onSelectCourse(course)}
                className="mehestan-card p-4 hover:border-primary/50 transition cursor-pointer space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <ArrowLeft className="w-4 h-4 text-neutral group-hover:text-primary transition shrink-0" />
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-black text-base-content line-clamp-2 leading-relaxed">
                    {course.fullname}
                  </h4>
                  <p className="text-[10px] text-neutral mt-1 truncate">{course.shortname}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
