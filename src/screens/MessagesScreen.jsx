import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  User,
  GraduationCap,
  Users,
  ArrowRight,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import {
  getMoodleConversations,
  getConversationMessages,
  sendMoodleMessage,
} from '../services/moodle/api';
import { cleanPersianText, toFaDigits } from '../utils/persianUtils';

export default function MessagesScreen() {
  const { session, siteInfo } = useMoodleAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // بارگذاری فهرست گفتگوهای مودل
  useEffect(() => {
    async function loadConversations() {
      if (!session) return;
      setLoadingConv(true);
      try {
        const res = await getMoodleConversations(session.siteUrl, session.token, siteInfo?.userid || 9999);
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
  }, [session, siteInfo]);

  // بارگذاری پیام‌های گفتگوی انتخاب‌شده
  useEffect(() => {
    async function loadChat() {
      if (!activeConversation || !session) return;
      setLoadingMessages(true);
      try {
        const res = await getConversationMessages(
          session.siteUrl,
          session.token,
          siteInfo?.userid || 9999,
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
  }, [activeConversation, session, siteInfo]);

  // اسکرول به انتهای چت هنگام اضافه شدن پیام جدید
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || sending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    const tempMsg = {
      id: Date.now(),
      useridfrom: siteInfo?.userid || 9999,
      text: textToSend,
      timecreated: Math.floor(Date.now() / 1000),
      isOptimistic: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const targetUserId = activeConversation?.members?.[0]?.id || 1001;
      await sendMoodleMessage(session.siteUrl, session.token, targetUserId, textToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.subname && c.subname.toLowerCase().includes(q)) ||
      (c.lastmessage && c.lastmessage.toLowerCase().includes(q))
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
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="sarv-card p-0 flex flex-col h-[calc(100vh-160px)] min-h-[480px] overflow-hidden"
          >
            {/* نوار بالای چت */}
            <div className="p-3.5 border-b border-base-500/30 bg-base-500/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  className="p-1.5 rounded-xl text-neutral hover:text-base-content hover:bg-base-500/20 transition cursor-pointer"
                  title="بازگشت به فهرست پیام‌ها"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary border border-primary/25 grid place-items-center font-black text-xs shrink-0">
                  {cleanPersianText(activeConversation.name).charAt(0)}
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs font-black text-base-content truncate">
                    {cleanPersianText(activeConversation.name)}
                  </h3>
                  {activeConversation.subname && (
                    <p className="text-[10px] text-neutral truncate">
                      {cleanPersianText(activeConversation.subname)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-success font-bold bg-success/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                <span>پروتکل پیام‌رسان مودل</span>
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
                  const isMine = m.useridfrom === (siteInfo?.userid || 9999);
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
                        <p className="break-words">{cleanPersianText(m.text)}</p>
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
                  <p>هنوز پیامی ردوبدل نشده است.</p>
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
            <div className="sarv-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/15 text-secondary border border-secondary/25 grid place-items-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-base-content">پیام‌رسان دانشگاهی</h2>
                    <p className="text-xs text-neutral">مکالمات مستقیم با اساتید، دستیاران و هم‌کلاسی‌ها</p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-primary bg-primary-soft px-2.5 py-1 rounded-full">
                  {toFaDigits(conversations.length)} گفتگو
                </span>
              </div>

              {/* کادر جستجو در پیام‌ها */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در مخاطبان یا پیام‌ها..."
                  className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-base-500/20 border border-base-500/40 text-xs text-base-content focus:outline-none focus:border-primary transition"
                />
                <Search className="w-4 h-4 text-neutral absolute right-3 top-1/2 -translate-y-1/2" />
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
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConversation(conv)}
                      className="w-full sarv-card p-3.5 flex items-center justify-between gap-3 text-right hover:border-primary/40 active:scale-[0.99] transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/25 grid place-items-center font-black text-sm shrink-0">
                          {cleanPersianText(conv.name).charAt(0)}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <h3 className="text-xs font-black text-base-content truncate">
                            {cleanPersianText(conv.name)}
                          </h3>
                          {conv.subname && (
                            <p className="text-[11px] text-neutral/80 truncate">
                              {cleanPersianText(conv.subname)}
                            </p>
                          )}
                          {conv.lastmessage && (
                            <p className="text-[11px] text-neutral truncate">
                              {cleanPersianText(conv.lastmessage)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left shrink-0 space-y-1">
                        {conv.lastmessagedate && (
                          <span className="text-[10px] text-neutral/70 block">
                            {formatMessageTime(Math.floor(conv.lastmessagedate / 1000))}
                          </span>
                        )}
                        {conv.unreadcount > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-content text-[10px] font-black inline-grid place-items-center">
                            {toFaDigits(conv.unreadcount)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="sarv-card p-12 text-center text-neutral space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-xs font-bold">مکالمه‌ای یافت نشد</p>
                <p className="text-[11px]">پیام‌های رسمی ارسالی توسط اساتید در اینجا نمایش داده خواهد شد.</p>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}