import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Download, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getCourseContents } from '../services/moodle/api';
import { useMoodleAuth } from '../context/MoodleAuthContext';

export default function CourseDetailScreen({ course, onBack }) {
  const { session } = useMoodleAuth();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    async function loadContents() {
      if (!session || !course) return;
      setLoading(true);
      try {
        const data = await getCourseContents(session.siteUrl, session.token, course.id);
        setContents(data || []);
        // باز کردن پیش‌فرض تمام بخش‌ها
        const initialExpanded = {};
        (data || []).forEach((sec) => {
          initialExpanded[sec.id] = true;
        });
        setExpandedSections(initialExpanded);
      } catch (err) {
        console.error('Failed to load course contents:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContents();
  }, [course, session]);

  const toggleSection = (secId) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      {/* سربرگ درس */}
      <div className="mehestan-card p-4 space-y-2">
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
          {course.shortname}
        </span>
        <h2 className="text-sm font-black text-base-content leading-relaxed">{course.fullname}</h2>
      </div>

      {/* محتوای جلسات و سرفصل‌ها */}
      {loading ? (
        <div className="mehestan-card p-12 text-center text-xs text-neutral flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>در حال دریافت سرفصل‌ها و فایل‌های درسی...</span>
        </div>
      ) : contents.length === 0 ? (
        <div className="mehestan-card p-8 text-center text-xs text-neutral">
          سرفصلی برای این درس ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map((section) => {
            const isExpanded = expandedSections[section.id];
            const modules = section.modules || [];
            if (!section.name && modules.length === 0) return null;

            return (
              <div key={section.id} className="mehestan-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-3.5 flex items-center justify-between text-right bg-base-500/10 hover:bg-base-500/20 transition cursor-pointer"
                >
                  <h3 className="text-xs font-black text-base-content truncate">
                    {section.name || 'بخش عمومی'}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral">{modules.length} مورد</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral" /> : <ChevronDown className="w-4 h-4 text-neutral" />}
                  </div>
                </button>

                {isExpanded && modules.length > 0 && (
                  <div className="divide-y divide-base-500/15 p-2">
                    {modules.map((mod) => (
                      <div key={mod.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-base-content font-bold truncate">{mod.name}</span>
                        </div>

                        {mod.url && (
                          <a
                            href={mod.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-neutral hover:text-primary transition shrink-0"
                            title="مشاهده منبع"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
