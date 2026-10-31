import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  User,
  GraduationCap,
  Users,
  ChevronLeft,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  Sparkles,
  Plus,
  X,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import {
  getMoodleConversations,
  getConversationMessages,
  sendMoodleMessage,
  getEnrolledUsers,
} from '../services/moodle/api';
import { cleanPersianText, toFaDigits, stripHtml } from '../utils/persianUtils';

export default function MessagesScreen() {
  const { session, siteInfo, courses } = useMoodleAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // حالت شروع گفتگوی جدید
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const messagesEndRef = useRef(null);
  const myUserId = siteInfo?.userid || session?.userid;

  // بارگذاری فهرست گفتگوهای مودل
  useEffect(() => {
    async function loadConversations() {
      if (!session) return;
      setLoadingConv(true);
      try {
        const res = await getMoodleConversations(session.siteUrl, session.token, myUserId);
        if (res && Array.isArray(res.conversations)) {
          setConversations(res.conversations);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoadingConv(false);
      }
    }
    loadConversations();
  }, [session, siteInfo, myUserId]);

  // بارگذاری پیام‌های گفتگوی انتخاب‌شده
  useEffect(() => {
    async function loadChat() {
      if (!activeConversation || !session) return;
      setLoadingMessages(true);
      try {
        const res = await getConversationMessages(
          session.siteUrl,
          session.token,
          myUserId,
          activeConversation.id
        );
        if (res && Array.isArray(res.messages)) {
          setMessages(res.messages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }
    loadChat();
  }, [activeConversation, session, myUserId]);

  // بارگذاری مخاطبین جهت گفتگوی جدید
  useEffect(() => {
    if (!showNewChatModal || !session || !courses || courses.length === 0) return;
    async function loadAllContacts() {
      setLoadingContacts(true);
      try {
        const userMap = new Map();
        // دریافت هم‌کلاسی‌ها و اساتید از ۳ درس اول برای سرعت بالا
        const sampleCourses = courses.slice(0, 3);
        const results = await Promise.all(
          sampleCourses.map((c) =>
            getEnrolledUsers(session.siteUrl, session.token, c.id).catch(() => [])
          )
        );
        results.flat().forEach((u) => {
          if (u && u.id && Number(u.id) !== Number(myUserId)) {
            userMap.set(u.id, u);
          }
        });
        setContacts(Array.from(userMap.values()));
      } catch (err) {
        console.warn('Failed to load contacts:', err);
      } finally {
        setLoadingContacts(false);
      }
    }
    loadAllContacts();
  }, [showNewChatModal, session, courses, myUserId]);

  // اسکرول به انتهای چت هنگام اضافه شدن پیام جدید
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // نام نمایش گفتگو حتی در صورت خالی بودن نام پیش‌فرض مودل برای چت‌های فردی
  const getConversationTitle = (conv) => {
    if (!conv) return 'گفتگو';
    if (conv.name && conv.name.trim()) return cleanPersianText(conv.name);
    const other = conv.members?.find((m) => Number(m.id) !== Number(myUserId));
    if (other?.fullname) return cleanPersianText(other.fullname);
    if (conv.members?.[0]?.fullname) return cleanPersianText(conv.members[0].fullname);
    return 'مکالمه دانشگاهی';
  };

  const getConversationSubtitle = (conv) => {
    if (!conv) return '';
    if (conv.subname && conv.subname.trim()) return cleanPersianText(conv.subname);
    const other = conv.members?.find((m) => Number(m.id) !== Number(myUserId));
    if (other?.roleName || other?.department) {
      return cleanPersianText([other.roleName, other.department].filter(Boolean).join(' · '));
    }
    return '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || sending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    const tempMsg = {
      id: Date.now(),
      useridfrom: myUserId || 9999,
      text: textToSend,
      timecreated: Math.floor(Date.now() / 1000),
      isOptimistic: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const other = activeConversation?.members?.find((m) => Number(m.id) !== Number(myUserId));
      const targetUserId = other?.id || activeConversation?.userid || activeConversation?.members?.[0]?.id || 1001;
      await sendMoodleMessage(session.siteUrl, session.token, targetUserId, textToSend, activeConversation?.id);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStartChatWithContact = (contact) => {
    // جستجوی گفتگوی موجود با این فرد
    const existing = conversations.find((c) =>
      c.members?.some((m) => Number(m.id) === Number(contact.id))
    );

    if (existing) {
      setActiveConversation(existing);
    } else {
      // ایجاد گفتگوی موقت با ساختار استاندارد مودل
      const newTempConv = {
        id: `temp_${contact.id}`,
        name: contact.fullname,
        subname: contact.roleName || contact.department || '',
        imageurl: contact.profileimageurl || null,
        unreadcount: 0,
        isread: true,
        lastmessage: '',
        lastmessagedate: Date.now(),
        members: [
          { id: contact.id, fullname: contact.fullname, canmessage: true },
          { id: myUserId, fullname: siteInfo?.fullname || 'شما', canmessage: true },
        ],
      };
      setConversations((prev) => [newTempConv, ...prev]);
      setActiveConversation(newTempConv);
      setMessages([]);
    }
    setShowNewChatModal(false);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = getConversationTitle(c).toLowerCase();
    const subtitle = getConversationSubtitle(c).toLowerCase();
    const lastMsg = (c.lastmessage || '').toLowerCase();
    return title.includes(q) || subtitle.includes(q) || lastMsg.includes(q);
  });

  const filteredContacts = contacts.filter((u) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      (u.fullname && u.fullname.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.roleName && u.roleName.toLowerCase().includes(q))
    );
  });

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp * 1000);
      return toFaDigits(
        d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return '';
    }
  };

  return (
    <div className="p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto min-w-0">
      {/* نمای گفتگوی فعال (صفحه چت تمام صفحه در موبایل) */}
      <AnimatePresence>
        {activeConversation ? (
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="sarv-card p-0 flex flex-col h-[calc(100vh-160px)] min-h-[480px] overflow-hidden shadow-xl border border-base-500/40"
          >
            {/* نوار بالای چت سبک سروستان */}
            <div className="p-3.5 border-b border-base-500/30 bg-base-500/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  className="w-8 h-8 rounded-xl grid place-items-center text-neutral hover:text-base-content bg-base-500/20 hover:bg-base-500/40 active:scale-95 transition-all outline-none cursor-pointer shrink-0"
                  title="بازگشت به فهرست پیام‌ها"
                >
                  <ChevronLeft className="w-4.5 h-4.5 rotate-180" />
                </button>

                <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary border border-primary/25 grid place-items-center font-black text-xs shrink-0 shadow-sm">
                  {getConversationTitle(activeConversation).charAt(0)}
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs font-black text-base-content truncate">
                    {getConversationTitle(activeConversation)}
                  </h3>
                  {getConversationSubtitle(activeConversation) && (
                    <p className="text-[10px] text-neutral truncate">
                      {getConversationSubtitle(activeConversation)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-success font-bold bg-success-soft px-2.5 py-1 rounded-full border border-success/25 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                <span>دایرکت مودل</span>
              </div>
            </div>

            {/* بدنه حباب‌های پیام */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-base-500/5">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">در حال بارگذاری پیام‌ها...</span>
                </div>
              ) : messages.length > 0 ? (
                messages.map((m) => {
                  const isMine = Number(m.useridfrom) === Number(myUserId);
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          isMine
                            ? 'bg-primary text-primary-content rounded-bl-sm'
                            : 'bg-base-500/25 text-base-content rounded-br-sm border border-base-500/35'
                        }`}
                      >
                        <p className="break-words whitespace-pre-line">{stripHtml(m.text)}</p>
                        <div
                          className={`flex items-center gap-1 text-[9px] mt-1 ${
                            isMine ? 'text-primary-content/75 justify-end' : 'text-neutral justify-start'
                          }`}
                        >
                          <span>{formatMessageTime(m.timecreated)}</span>
                          {isMine && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-neutral text-xs space-y-1">
                  <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-bold">هنوز پیامی ردوبدل نشده است.</p>
                  <p className="text-[10px]">اولین پیام خود را ارسال نمایید.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* کادر ورود و ارسال پیام */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-base-500/30 bg-base-500/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="پیام خود را بنویسید..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs text-base-content focus:outline-none focus:border-primary transition"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || sending}
                className="p-2.5 rounded-xl bg-primary text-primary-content hover:brightness-110 active:scale-95 transition disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
                title="ارسال پیام"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>
        ) : (
          /* فهرست گفتگوهای پیام‌رسان */
          <div className="space-y-4">
            {/* سربرگ پیام‌رسان */}
            <div className="sarv-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-secondary-soft text-secondary border border-secondary/25 grid place-items-center shadow-sm">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-base-content">پیام‌رسان دانشگاهی</h2>
                    <p className="text-xs text-neutral">مکالمات مستقیم با اساتید، دستیاران و هم‌کلاسی‌ها</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-content text-xs font-bold hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="شروع گفتگوی جدید"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>پیام جدید</span>
                </button>
              </div>

              {/* کادر جستجو در پیام‌ها */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در گفتگوها و پیام‌ها..."
                  className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-base-500/20 border border-base-500/35 text-xs text-base-content placeholder:text-neutral/60 focus:outline-none focus:border-primary transition"
                />
                <Search className="w-4 h-4 text-neutral absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* لیست مکالمات */}
            {loadingConv ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral space-y-2.5">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">در حال دریافت مکالمات از مودل...</span>
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="space-y-2">
                {filteredConversations.map((conv) => {
                  const title = getConversationTitle(conv);
                  const subtitle = getConversationSubtitle(conv);

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConversation(conv)}
                      className="w-full sarv-card p-3.5 flex items-center justify-between gap-3 text-right hover:border-primary/40 active:scale-[0.99] transition cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/25 grid place-items-center font-black text-sm shrink-0 shadow-sm">
                          {title.charAt(0)}
                        </div>

                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h3 className="text-xs font-black text-base-content truncate">
                            {title}
                          </h3>
                          {subtitle && (
                            <p className="text-[11px] text-neutral/80 truncate font-medium">
                              {subtitle}
                            </p>
                          )}
                          {conv.lastmessage && (
                            <p className="text-[11px] text-neutral truncate">
                              {stripHtml(conv.lastmessage)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left shrink-0 space-y-1 mr-2">
                        {conv.lastmessagedate && (
                          <span className="text-[10px] text-neutral/70 block font-mono">
                            {formatMessageTime(Math.floor(conv.lastmessagedate / 1000))}
                          </span>
                        )}
                        {conv.unreadcount > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-content text-[10px] font-black inline-grid place-items-center shadow-sm">
                            {toFaDigits(conv.unreadcount)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="sarv-card p-12 text-center text-neutral space-y-3 shadow-sm">
                <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-xs font-bold text-base-content">مکالمه‌ای یافت نشد</p>
                <p className="text-[11px]">می‌توانید با دکمه «پیام جدید» یا از بخش هم‌کلاسی‌ها و اساتید در سرفصل دروس، مستقیماً به دیگران پیام دهید.</p>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-bold inline-flex items-center gap-1.5 shadow-sm mx-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>شروع پیام جدید</span>
                </button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* مودال شروع گفتگوی جدید با انتخاب مخاطب */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewChatModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="sarv-card relative z-10 w-full max-w-md max-h-[85vh] flex flex-col p-5 space-y-3.5 shadow-2xl border border-base-500/40"
            >
              <div className="flex items-center justify-between pb-3 border-b border-base-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary grid place-items-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-base-content">شروع گفتگوی جدید</h3>
                    <p className="text-[10px] text-neutral">مخاطب خود را از اساتید و هم‌کلاسی‌ها انتخاب کنید</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1 rounded-lg text-neutral hover:text-base-content cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* کادر جستجو بین مخاطبین */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="جستجوی نام یا نقش مخاطب..."
                  className="w-full pr-9 pl-4 py-2 rounded-xl bg-base-500/20 border border-base-500/35 text-xs text-base-content placeholder:text-neutral/60 focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* لیست مخاطبان */}
              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 max-h-[360px]">
                {loadingContacts ? (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs">در حال بارگذاری مخاطبین از دروس...</span>
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleStartChatWithContact(u)}
                      className="w-full p-2.5 rounded-xl border border-base-500/20 hover:border-primary/40 hover:bg-base-500/15 flex items-center justify-between transition cursor-pointer text-right"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary grid place-items-center font-bold text-xs shrink-0">
                          {cleanPersianText(u.fullname).charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-base-content truncate">
                            {cleanPersianText(u.fullname)}
                          </h4>
                          <p className="text-[10px] text-neutral truncate">
                            {u.roleName} {u.department ? `· ${u.department}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-primary font-bold px-2 py-0.5 rounded-lg bg-primary-soft">
                        ارسال پیام
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral text-xs">
                    مخاطبی یافت نشد. می‌توانید از بخش هم‌کلاسی‌ها در سرفصل دروس نیز پیام دهید.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
