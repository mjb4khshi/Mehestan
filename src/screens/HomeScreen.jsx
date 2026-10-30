import React, { useState } from 'react';
import { BookOpen, CheckSquare, Clock, ArrowLeft, ExternalLink, Calendar, Share2, Sparkles, ChevronLeft } from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { exportAllAssignmentsToSarvestan } from '../services/sarvestanBridge';
import { cleanCourseName, cleanPersianText, toFaDigits, formatAssignmentTiming } from '../utils/persianUtils';
import AssignmentDetailModal from '../components/AssignmentDetailModal';

export default function HomeScreen({ onSelectCourse, onGoToAssignments }) {
  const { siteInfo, courses, assignments, loading } = useMoodleAuth();
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const nowSec = Math.floor(Date.now() / 1000);
  const pendingAssignments = assignments
    .filter((a) => a.duedate && a.duedate > nowSec)
    .sort((a, b) => a.duedate - b.duedate);

  const nearestAssignment = pendingAssignments[0];
  const nearestTiming = nearestAssignment ? formatAssignmentTiming(nearestAssignment.duedate) : null;

  return (
    <div className="p-4 space-y-5 pb-24 max-w-2xl mx-auto">
      {/* بنر خوش‌آمدگویی سبک سروستان */}
      <div className="sarv-card p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-neutral">خوش آمدید،</p>
          <h2 className="text-base font-black text-base-content truncate">
            {cleanPersianText(siteInfo?.fullname) || 'دانشجوی گرامی'}
          </h2>
          <p className="text-[11px] text-neutral flex items-center gap-2">
            <span>{toFaDigits(courses.length)} درس فعال</span>
            <span>•</span>
            <span className="text-amber-500 font-bold">{toFaDigits(pendingAssignments.length)} تکلیف در انتظار</span>
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
        <div
          onClick={() => setSelectedAssignment(nearestAssignment)}
          className="sarv-card p-4 border-amber-500/35 bg-amber-500/5 space-y-2 cursor-pointer hover:border-amber-500/60 transition group shadow-sm"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>نزدیک‌ترین موعد تکلیف:</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-black text-[10px] border border-amber-500/30">
              {nearestTiming?.text}
            </span>
          </div>
          <div className="min-w-0 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-black text-base-content truncate group-hover:text-primary transition">
                {cleanPersianText(nearestAssignment.name)}
              </h3>
              <p className="text-[11px] text-neutral mt-0.5 truncate">
                {cleanCourseName(nearestAssignment.courseName || nearestAssignment.courseShortName)}
              </p>
            </div>
            <ChevronLeft className="w-4 h-4 text-neutral group-hover:text-primary transition shrink-0 mr-2" />
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
          <span className="text-xs text-neutral font-bold">{toFaDigits(courses.length)} عنوان</span>
        </div>

        {courses.length === 0 ? (
          <div className="sarv-card p-8 text-center text-xs text-neutral">
            درسی در سامانه مودل یافت نشد یا در حال بارگذاری است.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => onSelectCourse && onSelectCourse(course)}
                className="sarv-card p-4 hover:border-primary/50 transition cursor-pointer space-y-3 group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                    {cleanPersianText(course.shortname)}
                  </span>
                  {course.progress !== undefined && (
                    <span className="text-[10px] font-mono text-neutral">
                      {toFaDigits(course.progress)}٪
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-black text-base-content leading-relaxed group-hover:text-primary transition line-clamp-2">
                    {cleanCourseName(course.fullname)}
                  </h4>
                  {course.categoryname && (
                    <p className="text-[10px] text-neutral truncate">
                      {cleanPersianText(course.categoryname)}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-base-500/20 flex items-center justify-between text-[11px] text-primary font-bold">
                  <span>مشاهده سرفصل‌ها و فایل‌ها</span>
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
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
