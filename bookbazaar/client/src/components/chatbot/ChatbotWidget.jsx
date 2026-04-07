import { useEffect, useRef, useState } from 'react';
import { MessageCircle, RotateCcw, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WELCOME_MESSAGE = "Hi! 👋 I'm BookBot! Ask me to find books by subject, grade level, university, or price range.";
const QUICK_REPLIES = [
  'Grade 5 books',
  'Books under Rs 500',
  'FAST university books',
  'How do I sell a book?',
  'New condition books',
];
const NO_RESULT_SUGGESTIONS = ['Grade 5', 'Grade 7', 'Grade 9', 'O Levels', 'University'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const formatTime = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const truncate = (value, max = 35) => {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const getBookMetaLabel = (book) => {
  const grade = book?.educationMeta?.grade;
  const level = String(book?.educationMeta?.level || '').toLowerCase();
  const subject = String(book?.educationMeta?.subject || '').trim();
  const field = String(book?.educationMeta?.field || '').trim();
  if (grade) return `Grade ${grade}`;
  if (subject) return subject;
  if (field) return field;
  if (level && level !== 'general') return level.replace(/_/g, ' ');
  const fallback = String(book?.university || book?.course || '').trim();
  if (fallback && fallback.toLowerCase() !== 'general' && fallback.toLowerCase() !== 'n/a') return fallback;
  return '';
};

export default function ChatbotWidget() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [limitedMode, setLimitedMode] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);

  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen && !hasWelcomed) {
      setMessages([{ id: `m-${Date.now()}`, role: 'model', content: WELCOME_MESSAGE, timestamp: Date.now() }]);
      setHistory([{ role: 'model', content: WELCOME_MESSAGE }]);
      setShowQuickReplies(true);
      setHasWelcomed(true);
    }
  }, [isOpen, hasWelcomed]);

  const closeAndGo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const addAssistantMessage = (content, extras = {}) => {
    const bot = { id: `m-${Date.now()}`, role: 'model', content, timestamp: Date.now(), ...extras };
    setMessages((prev) => [...prev, bot]);
    setHistory((prev) => [...prev, { role: 'model', content }]);
  };

  const sendToApi = async (messageText, historySlice) => {
    const response = await fetch(`${API_BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        conversationHistory: historySlice.slice(-6),
      }),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  };

  const sendMessage = async (messageText) => {
    const text = String(messageText || '').trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);
    setShowQuickReplies(false);

    const userEntry = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    const nextHistory = [...history, { role: 'user', content: text }];
    setMessages((prev) => [...prev, userEntry]);
    setHistory(nextHistory);

    try {
      const data = await sendToApi(text, nextHistory);
      const books = Array.isArray(data?.books) ? data.books : [];
      addAssistantMessage(data?.reply || 'I can help with book search and marketplace questions.', {
        books,
        hasBooks: Boolean(data?.hasBooks) && books.length > 0,
        showNoBooksCard: Boolean(data?.isBookSearch) && books.length === 0,
        cta: data?.cta || null,
        totalMatches: Number(data?.totalMatches || books.length || 0),
        truncated: Boolean(data?.truncated),
        viewAllPath: data?.viewAllPath || null,
        queryText: text,
      });
      setLimitedMode(false);
    } catch {
      addAssistantMessage('🔄 Connection issue. Retrying...', { isRetryNotice: true });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const retryData = await sendToApi(text, nextHistory);
        const books = Array.isArray(retryData?.books) ? retryData.books : [];
        addAssistantMessage(retryData?.reply || 'Retry succeeded.', {
          books,
          hasBooks: Boolean(retryData?.hasBooks) && books.length > 0,
          showNoBooksCard: Boolean(retryData?.isBookSearch) && books.length === 0,
          cta: retryData?.cta || null,
          totalMatches: Number(retryData?.totalMatches || books.length || 0),
          truncated: Boolean(retryData?.truncated),
          viewAllPath: retryData?.viewAllPath || null,
          queryText: text,
        });
        setLimitedMode(false);
      } catch {
        setLimitedMode(true);
      }
    } finally {
      setIsLoading(false);
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setHistory([]);
    setShowQuickReplies(false);
    setHasWelcomed(false);
    setLimitedMode(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center"
        aria-label="Open chatbot"
      >
        <span className="text-2xl">📚</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 z-[10000] w-[380px] h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-bold">BookBot 📚</div>
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>Online</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearHistory}
                className="p-1.5 rounded hover:bg-blue-700"
                title="Clear history"
                aria-label="Clear history"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded hover:bg-blue-700"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {limitedMode && (
            <div className="bg-red-100 text-red-700 text-xs px-3 py-2 border-b border-red-200">
              ⚠️ Limited mode - some features unavailable
            </div>
          )}

          <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line shadow-sm ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  {m.content}

                  {m.hasBooks && Array.isArray(m.books) && m.books.length > 0 && (
                    <div className={`mt-3 space-y-2 ${m.books.length > 4 ? 'max-h-[300px] overflow-y-auto pr-1' : ''}`}>
                      {m.books.slice(0, 8).map((book) => (
                        <div key={book._id} className="rounded-lg border border-gray-300 bg-white px-3 py-2">
                          <div className="text-sm font-semibold text-gray-900">📖 {truncate(book.title, 35)}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {book.author} • Rs.{book.price}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {book.condition}{getBookMetaLabel(book) ? ` • ${getBookMetaLabel(book)}` : ''}
                          </div>
                          {m.truncated && m.totalMatches > m.books.length && (
                            <div className="text-[11px] text-gray-500 mt-1">
                              Showing {m.books.length} of {m.totalMatches} results.
                            </div>
                          )}
                          <div className="flex justify-end mt-2">
                            <button
                              type="button"
                              onClick={() => closeAndGo(`/books/${book._id}`)}
                              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                            >
                              View Book →
                            </button>
                          </div>
                        </div>
                      ))}
                      {m.truncated && m.viewAllPath && (
                        <button
                          type="button"
                          onClick={() => closeAndGo(m.viewAllPath)}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-1"
                        >
                          View all →
                        </button>
                      )}
                    </div>
                  )}

                  {m.showNoBooksCard && (
                    <div className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2">
                      <div className="text-sm font-semibold text-gray-900">🔍 No books found</div>
                      <div className="text-xs text-gray-600 mt-1">
                        No books found for "{m.queryText || 'your search'}". Try a different grade or subject.
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {NO_RESULT_SUGGESTIONS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => void sendMessage(chip)}
                            className="text-[11px] border border-blue-200 bg-blue-50 text-blue-700 rounded-full px-2.5 py-1"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => closeAndGo('/books')}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                        >
                          Browse All Books →
                        </button>
                      </div>
                    </div>
                  )}

                  {m.cta?.path && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => closeAndGo(m.cta.path)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        → {m.cta.label || 'Open'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">{formatTime(m.timestamp)}</div>
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="rounded-2xl px-4 py-2 bg-gray-100 border border-gray-200">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="animate-bounce text-gray-600" style={{ animationDelay: `${i * 120}ms` }}>
                        •
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">{formatTime(Date.now())}</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {showQuickReplies && (
            <div className="px-3 pb-2">
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void sendMessage(chip)}
                    className="text-xs border border-blue-200 bg-blue-50 text-blue-700 rounded-full px-3 py-1.5 hover:bg-blue-100 disabled:opacity-60"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="border-t border-gray-200 p-3"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search books or ask anything..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1"
              >
                {isLoading ? <RotateCcw size={14} className="animate-spin" /> : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

