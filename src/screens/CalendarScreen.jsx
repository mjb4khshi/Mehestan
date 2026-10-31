import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckSquare, ChevronLeft } from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import {
  cleanCourseName,
  cleanPersianText,
  toFaDigits,
  formatPersianDate,
  formatAssignmentTiming,
} from '../utils/persianUtils';
import AssignmentDetailModal from '../components/AssignmentDetailModal';

export default function CalendarScreen() {
  const { assignments } = useMoodleAuth();
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const sortedEvents = [...assignments]
    .filter((a) => a.duedate)
    .sort((a, b) => a.duedate - b.duedate);

  return (
    <div className="p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto min-w-0">
      <div className="sarv-card p-4 space-y-1 shadow-sm">
        <h2 className="text-sm font-black text-base-content flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span>تقویم موعدهای تحویل و آزمون‌ها</span>
        </h2>
        <p className="text-xs text-neutral">زمان‌بندی تاریخ سررسید تکالیف، پروژه‌ها و کوییزهای درسی</p>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="sarv-card p-12 text-center text-xs text-neutral">
          رویداد یا موعد تحویلی در تقویم ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedEvents.map((evt) => {
            const timing = formatAssignmentTiming(evt.duedate);

            return (
              <div
                key={evt.id}
                onClick={() => setSelectedAssignment(evt)}
                className="sarv-card p-3.5 flex items-center justify-between gap-3 hover:border-primary/50 transition cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/25 grid place-items-center shrink-0">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-base-content truncate group-hover:text-primary transition">
                      {cleanPersianText(evt.name)}
                    </h4>
                    <p className="text-[10px] text-neutral mt-0.5 truncate">
                      {cleanCourseName(evt.courseName || evt.courseShortName)}
                    </p>
                  </div>
                </div>

                <div className="text-left shrink-0 space-y-1">
                  <p className="text-xs font-bold text-base-content">
                    {formatPersianDate(evt.duedate, false)}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block border ${timing.badgeBg}`}>
                    {timing.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
