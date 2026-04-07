/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function scoreCondition(condition) {
  if (condition === 'New') return 3;
  if (condition === 'Good') return 2;
  return 1;
}

function isNewlyListed(book) {
  const created = new Date(book?.createdAt || 0).getTime();
  if (!created) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - created <= sevenDays;
}

function BookTile({ book, reason, badge, subtext }) {
  return (
    <div className="flex flex-col min-w-[220px] w-[220px] max-w-[220px]">
      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
        <Link to={`/book/${book._id}`} className="block h-[220px]">
          <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
        </Link>
        {badge && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 border border-gray-200 text-gray-800 px-2.5 py-1 text-[11px] font-bold shadow-sm">
              {badge}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Link to={`/book/${book._id}`} className="font-bold text-gray-900 line-clamp-1 hover:text-blue-700 transition-colors">
          {book.title}
        </Link>
        <div className="text-sm text-gray-500 mt-1 line-clamp-1">{book.author}</div>
        <div className="text-lg font-black text-gray-900 mt-2">Rs. {book.price}</div>
        {!!subtext && <div className="text-xs text-gray-600 mt-1">{subtext}</div>}
        {!subtext && !!reason && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{reason}</div>}
      </div>
    </div>
  );
}

export default function AIRecommendations() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [matchedBooks, setMatchedBooks] = useState([]);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const userId = user.id || user._id;
      const res = await api.post('/ai/recommendations', { userId });
      if (res?.data?.success) {
        const { aiSuggestions: nextSuggestions = [], matchedBooks: nextBooks = [] } = res.data.data || {};
        setAiSuggestions(nextSuggestions);
        setMatchedBooks(nextBooks);
      } else {
        setError(res?.data?.message || 'Failed to load recommendations');
      }
    } catch {
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, user?._id]);

  const lowestByCategory = useMemo(() => {
    const map = {};
    for (const b of matchedBooks) {
      const key = String(b?.educationMeta?.level || b?.course || b?.university || 'other').toLowerCase();
      const price = Number(b?.price || 0);
      if (!map[key] || price < map[key]) map[key] = price;
    }
    return map;
  }, [matchedBooks]);

  const aiPickIds = useMemo(() => {
    const ranked = matchedBooks
      .map((b) => ({
        id: b._id,
        score: Number(b?.averageRating || 0) * 10 + Number(b?.views || 0) + (50 / Math.max(1, Number(b?.price || 1))) + scoreCondition(b?.condition) * 3,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => String(x.id));
    return new Set(ranked);
  }, [matchedBooks]);

  const getBadgeAndSubtext = (book) => {
    const key = String(book?.educationMeta?.level || book?.course || book?.university || 'other').toLowerCase();
    const lowestInCategory = Number(book?.price || 0) === Number(lowestByCategory[key]);
    const trending = Number(book?.views || 0) >= 10;
    const newlyListed = isNewlyListed(book);
    const likeNew = book?.condition === 'New';
    if (aiPickIds.has(String(book._id))) return { badge: '⭐ AI Pick', subtext: trending ? 'Trending this week' : null };
    if (newlyListed) return { badge: 'New', subtext: 'Newly listed' };
    if (likeNew) return { badge: 'Like New', subtext: 'Like new condition' };
    if (lowestInCategory) return { badge: 'Best Price', subtext: 'Best price in category' };
    if (trending) return { badge: null, subtext: 'Trending this week' };
    return { badge: null, subtext: null };
  };

  if (!isAuthenticated) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">📚 Recommended For You</h2>
          {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
        </div>
        <button
          type="button"
          onClick={() => void fetchRecommendations()}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 font-semibold px-3 py-1.5 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[220px] w-[220px] max-w-[220px] rounded-xl border border-gray-100 bg-white p-3 animate-pulse">
              <div className="w-full aspect-[3/4] bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded mt-3 w-4/5" />
              <div className="h-3 bg-gray-200 rounded mt-2 w-2/3" />
              <div className="h-5 bg-gray-200 rounded mt-3 w-1/3" />
              <div className="h-3 bg-gray-200 rounded mt-2 w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {matchedBooks.map((book, idx) => {
            const meta = getBadgeAndSubtext(book);
            return (
            <BookTile
              key={book._id || idx}
              book={book}
              reason={aiSuggestions[idx]?.reason}
              badge={meta.badge}
              subtext={meta.subtext}
            />
            );
          })}
          {matchedBooks.length === 0 && (
            <div className="text-gray-600 bg-white border border-gray-100 rounded-xl p-4">
              No recommendations available yet.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

