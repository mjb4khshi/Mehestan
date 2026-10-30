import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckSquare,
  Folder,
  Link as LinkIcon,
  HelpCircle,
  MessageSquare,
  FileArchive,
  FileCode,
  Video,
  Music,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCourseContents, getMoodleFileUrl } from '../services/moodle/api';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import AssignmentDetailModal from '../components/AssignmentDetailModal';
import { cleanCourseName, cleanPersianText, toFaDigits, formatFileSizeFa } from '../utils/persianUtils';

export default function CourseDetailScreen({ course, onBack }) {
  const { session, assignments } = useMoodleAuth();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    async function loadContents() {
      if (!session || !course) return;
      setLoading(true);
      try {
        const data = await getCourseContents(session.siteUrl, session.token, course.id);
        setContents(data || []);
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

  const handleOpenAssign = (mod) => {
    const found = (assignments || []).find(
      (a) => a.id === mod.instance || a.id === mod.id || a.name === mod.name
    );

    const assignObj = found || {
      id: mod.instance || mod.id,
      name: mod.name,
      course: course.id,
      courseName: course.fullname,
      courseShortName: course.shortname,
      intro: mod.description || '<p>برای مشاهده و ارسال پاسخ تکلیف، جزئیات زیر را بررسی فرمایید.</p>',
      duedate: null,
    };

    setSelectedAssignment(assignObj);
  };

  const getFileIcon = (filename = '', mimetype = '') => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf') || mimetype.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
    }
    if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z') || mimetype.includes('zip') || mimetype.includes('compressed')) {
      return <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    if (lower.endsWith('.py') || lower.endsWith('.cpp') || lower.endsWith('.c') || lower.endsWith('.java') || lower.endsWith('.js') || lower.endsWith('.html')) {
      return <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || mimetype.includes('video')) {
      return <Video className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    if (lower.endsWith('.mp3') || mimetype.includes('audio')) {
      return <Music className="w-4 h-4 text-blue-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-primary shrink-0" />;
  };

  const getModuleTypeIcon = (modname) => {
    switch (modname) {
      case 'assign':
        return <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'folder':
        return <Folder className="w-4 h-4 text-primary shrink-0" />;
      case 'url':
        return <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-purple-500 shrink-0" />;
      case 'forum':
        return <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'resource':
      default:
        return <FileText className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      {/* دکمه بازگشت و سربرگ درس */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sarv-card p-4 space-y-2.5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={onBack}
            className="text-xs text-neutral hover:text-primary transition flex items-center gap-1 font-bold cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به فهرست دروس</span>
          </motion.button>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
            {cleanPersianText(course.shortname)}
          </span>
        </div>
        <h2 className="text-sm font-black text-base-content leading-relaxed">{cleanCourseName(course.fullname)}</h2>
      </motion.div>

      {/* محتوای جلسات و سرفصل‌ها */}
      {loading ? (
        <div className="sarv-card p-12 text-center text-xs text-neutral flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>در حال دریافت سرفصل‌ها، فایل‌ها و تکالیف درسی از مودل...</span>
        </div>
      ) : contents.length === 0 ? (
        <div className="sarv-card p-8 text-center text-xs text-neutral">
          سرفصلی برای این درس ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map((section, sIdx) => {
            const isExpanded = expandedSections[section.id];
            const modules = section.modules || [];
            if (!section.name && modules.length === 0) return null;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sIdx * 0.04 }}
                className="sarv-card overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-3.5 flex items-center justify-between text-right bg-base-500/10 hover:bg-base-500/20 transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-base-content truncate">
                      {cleanPersianText(section.name || 'بخش عمومی')}
                    </h3>
                    {section.summary && (
                      <div
                        className="text-[10px] text-neutral mt-0.5 truncate"
                        dangerouslySetInnerHTML={{ __html: cleanPersianText(section.summary) }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-[10px] text-neutral font-bold">{toFaDigits(modules.length)} مورد</span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-neutral" />
                    </motion.div>
                  </div>
                </button>

                {/* انیمیشن باز و بسته شدن سرفصل سبک سروستان */}
                <AnimatePresence initial={false}>
                  {isExpanded && modules.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden divide-y divide-base-500/15 p-2"
                    >
                      {modules.map((mod) => {
                        const isAssign = mod.modname === 'assign';
                        const isResource = mod.modname === 'resource';
                        const isFolder = mod.modname === 'folder';
                        const isUrl = mod.modname === 'url';
                        const contentsList = mod.contents || [];

                        return (
                          <div key={mod.id} className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-3 text-xs">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                {getModuleTypeIcon(mod.modname)}
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <span className="text-base-content font-bold leading-relaxed block">
                                    {cleanPersianText(mod.name)}
                                  </span>
                                  {mod.description && (
                                    <div
                                      className="text-[11px] text-neutral leading-relaxed line-clamp-2"
                                      dangerouslySetInnerHTML={{ __html: cleanPersianText(mod.description) }}
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {isAssign ? (
                                  <motion.button
                                    whileTap={{ scale: 0.94 }}
                                    type="button"
                                    onClick={() => handleOpenAssign(mod)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-500 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>مشاهده و ارسال تکلیف</span>
                                  </motion.button>
                                ) : isUrl && mod.url ? (
                                  <a
                                    href={mod.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg text-neutral hover:text-primary hover:bg-base-500/20 transition"
                                    title="باز کردن پیوند خارجی"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                ) : null}
                              </div>
                            </div>

                            {/* لیست فایل‌های داخل ماژول */}
                            {(isResource || isFolder) && contentsList.length > 0 && (
                              <div className="mr-6 space-y-1.5 pt-1">
                                {contentsList.map((file, fIdx) => {
                                  const downloadUrl = getMoodleFileUrl(file.fileurl, session.token);
                                  return (
                                    <div
                                      key={fIdx}
                                      className="p-2 rounded-lg bg-base-500/15 border border-base-500/25 flex items-center justify-between text-[11px] hover:border-primary/40 transition"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {getFileIcon(file.filename, file.mimetype)}
                                        <span className="font-bold text-base-content truncate" title={file.filename}>
                                          {cleanPersianText(file.filename)}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 mr-2">
                                        <span className="text-[10px] text-neutral font-mono">
                                          {formatFileSizeFa(file.filesize)}
                                        </span>
                                        <a
                                          href={downloadUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          download={file.filename}
                                          className="p-1 rounded text-primary hover:bg-primary/10 transition flex items-center gap-1 font-bold"
                                          title="دریافت فایل"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">دانلود</span>
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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
