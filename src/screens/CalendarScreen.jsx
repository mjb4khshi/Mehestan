import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckSquare } from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';

export default function CalendarScreen() {
  const { assignments } = useMoodleAuth();

  const sortedEvents = [...assignments]
    .filter((a) => a.duedate)
    .sort((a, b) => a.duedate - b.duedate);

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      <div className="mehestan-card p-4 space-y-1">
        <h2 className="text-sm font-black text-base-content flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span>تقویم موعدهای تحویل و آزمون‌ها</span>
        </h2>
        <p className="text-xs text-neutral">زمان‌بندی تاریخ سررسید تکالیف و کوییزهای کلاسی</p>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="mehestan-card p-12 text-center text-xs text-neutral">
          رویداد یا موعد تحویلی در تقویم ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((evt) => {
            const date = new Date(evt.duedate * 1000);
            const faDateStr = date.toLocaleDateString('fa-IR', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });
            const faTimeStr = date.toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={evt.id} className="mehestan-card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-base-content truncate">{evt.name}</h4>
                    <p className="text-[10px] text-neutral mt-0.5 truncate">{evt.courseName}</p>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <p className="text-xs font-bold text-base-content">{faDateStr}</p>
                  <p className="text-[10px] text-neutral mt-0.5 font-mono">{faTimeStr}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
