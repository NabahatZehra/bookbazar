import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ArrowLeft, Send, Paperclip, X, Loader2 } from 'lucide-react';

const userId = (u) => (u?.id || u?._id ? String(u.id || u._id) : '');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const apiOrigin = () =>
  (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

function resolveMessageImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = apiOrigin().replace(/\/$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

const MessagesPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/conversations');
        if (res.data.success) setConversations(res.data.data || []);
      } catch {
        toast.error('Failed to load conversations');
      } finally {
        setLoadingList(false);
      }
    };
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (!conversationId || !user) return undefined;

    const loadMsgs = async () => {
      setLoadingMsgs(true);
      try {
        const res = await api.get(`/messages/${conversationId}`);
        if (res.data.success) setMessages(res.data.data || []);
      } catch {
        toast.error('Failed to load messages');
        navigate('/messages');
      } finally {
        setLoadingMsgs(false);
      }
    };
    loadMsgs();
    return undefined;
  }, [conversationId, user, navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearImageSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateImageFile = (file) => {
    if (!file) return false;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be under 5MB');
      return false;
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error('Only JPG, PNG, and WEBP images are allowed');
      return false;
    }
    return true;
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file)) {
      e.target.value = '';
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = content.trim();
    if ((!text && !selectedFile) || !conversationId || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      if (text) formData.append('content', text);
      if (selectedFile) formData.append('image', selectedFile);
      formData.append('conversationId', conversationId);

      const res = await api.post('/messages', formData);

      if (res.data.success) {
        setMessages((prev) => [...prev, res.data.data]);
        setContent('');
        clearImageSelection();
        const previewLabel = text || 'Photo';
        setConversations((prev) =>
          prev.map((c) =>
            String(c.conversationId) === String(conversationId)
              ? {
                  ...c,
                  lastMessageText: previewLabel,
                  lastMessageAt: new Date().toISOString(),
                }
              : c
          )
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 500) {
        toast.error('Failed to send image, please try again');
      } else {
        toast.error(msg || 'Failed to send');
      }
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-gray-500">Please log in to view messages.</div>;
  }

  const activeConv = conversations.find((c) => String(c.conversationId) === String(conversationId));
  const myId = userId(user);
  const canSend = (content.trim() || selectedFile) && !sending;

  return (
    <div className="flex h-[calc(100vh-140px)] max-w-6xl mx-auto bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <aside
        className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col bg-gray-50 ${
          conversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 bg-white border-b border-gray-100 font-bold text-gray-900">Messages</div>
        <div className="overflow-y-auto flex-1">
          {loadingList ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No conversations yet</div>
          ) : (
            conversations.map((c) => (
              <Link
                key={String(c.conversationId)}
                to={`/messages/${c.conversationId}`}
                className={`block p-4 border-b border-gray-100 hover:bg-white transition-colors ${
                  String(conversationId) === String(c.conversationId) ? 'bg-white border-l-4 border-l-blue-600' : ''
                }`}
              >
                <p className="font-semibold text-gray-900">{c.otherUser?.name || 'User'}</p>
                <p className="text-sm text-gray-500 truncate">{c.lastMessageText || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {c.lastMessageAt ? format(new Date(c.lastMessageAt), 'MMM d, h:mm a') : ''}
                </p>
              </Link>
            ))
          )}
        </div>
      </aside>

      <main className={`flex-1 flex flex-col bg-gray-50/50 min-w-0 ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
        {conversationId ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white shrink-0">
              <button
                type="button"
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                onClick={() => navigate('/messages')}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 truncate">{activeConv?.otherUser?.name || 'Chat'}</h2>
                {activeConv?.book?.title && (
                  <p className="text-xs text-gray-500 truncate">Re: {activeConv.book.title}</p>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="text-center text-gray-500 py-10">Loading messages...</div>
              ) : (
                messages.map((msg) => {
                  const mine = myId === String(msg.senderId);
                  const imgSrc = msg.imageUrl ? resolveMessageImageUrl(msg.imageUrl) : '';
                  const showText = msg.text && String(msg.text).trim();
                  return (
                    <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          mine
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        {imgSrc && (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(imgSrc)}
                            className="mb-2 block w-full p-0 border-0 bg-transparent cursor-pointer text-left"
                          >
                            <img
                              src={imgSrc}
                              alt=""
                              className="max-w-[240px] w-full rounded-lg object-cover"
                            />
                          </button>
                        )}
                        {showText && (
                          <p className={`whitespace-pre-wrap break-words ${imgSrc ? 'mt-0.5' : ''}`}>{msg.text}</p>
                        )}
                        <div className={`text-[10px] mt-1 ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
                          {format(new Date(msg.timestamp), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white shrink-0 space-y-2">
              {previewUrl && (
                <div className="flex items-start gap-2 px-1">
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt=""
                      className="max-h-[80px] rounded-lg border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImageSelection}
                      className="absolute -top-2 -right-2 rounded-full bg-gray-800 text-white p-0.5 shadow hover:bg-gray-900"
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickImage}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Attach image"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2 min-w-[3rem]"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 p-8 text-center">
            Select a conversation or message a seller from a book listing.
          </div>
        )}
      </main>

      {lightboxUrl && (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 border-0 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
          aria-label="Close image"
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}
    </div>
  );
};

export default MessagesPage;
