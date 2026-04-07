/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import api from '../../services/api';

function formatUnderstood(understood) {
  if (!understood) return '';
  const parts = [];
  if (understood.subject) parts.push(`subject: ${understood.subject}`);
  if (understood.university) parts.push(`university: ${understood.university}`);
  if (Array.isArray(understood.keywords) && understood.keywords.length) {
    parts.push(`keywords: ${understood.keywords.slice(0, 5).join(', ')}`);
  }
  if (typeof understood.maxPrice === 'number' && Number.isFinite(understood.maxPrice)) {
    parts.push(`maxPrice: Rs. ${understood.maxPrice}`);
  }
  return parts.length ? parts.join(' | ') : '';
}

export default function SmartSearchBar({ value, onChange, onSearch }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [understood, setUnderstood] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = String(value || '').trim();
    if (!q || q.length < 3) {
      setDropdownOpen(false);
      setAiResults([]);
      setUnderstood(null);
      return;
    }

    const t = setTimeout(() => {
      setAiLoading(true);
      api
        .post('/ai/search-assist', { query: q })
        .then((res) => {
          const data = res?.data?.data || null;
          if (!data) {
            setDropdownOpen(false);
            return;
          }
          setAiResults(Array.isArray(data.matchedBooks) ? data.matchedBooks : []);
          setUnderstood(data.understood || null);
          setDropdownOpen(true);
        })
        .catch(() => {
          // Fallback to normal search: just close the dropdown.
          setDropdownOpen(false);
          setAiResults([]);
          setUnderstood(null);
        })
        .finally(() => setAiLoading(false));
    }, 600);

    return () => clearTimeout(t);
  }, [value]);

  const understoodText = useMemo(() => formatUnderstood(understood), [understood]);
  const q = String(value || '').trim();

  const submitSearch = () => {
    if (!q) return;
    onSearch?.(q);
    setDropdownOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex bg-white rounded-full shadow-lg p-1.5 md:p-2 max-w-2xl mx-auto items-center transition-all focus-within:ring-4 focus-within:ring-blue-500/30">
        <div className="flex items-center pl-3 gap-2 text-gray-600">
          <Sparkles size={18} className="text-yellow-500" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Try: cheap python book for COMSATS..."
          className="flex-grow px-2 md:px-4 py-3 text-gray-800 bg-transparent focus:outline-none placeholder-gray-400 text-sm md:text-base font-medium transition-all rounded-l-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitSearch();
            }
          }}
          aria-label="Smart search books"
        />
        <button
          type="button"
          onClick={submitSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 md:py-3.5 font-medium flex items-center gap-2 transition-colors"
        >
          <Search size={18} />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      {dropdownOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs text-gray-500 font-medium">🔍 Searching for: {understoodText || q}</div>
          </div>

          {aiLoading ? (
            <div className="px-4 py-4 text-sm text-gray-600">Searching…</div>
          ) : aiResults.length ? (
            <div className="max-h-72 overflow-y-auto">
              {aiResults.map((b) => (
                <button
                  key={b._id}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(`/book/${b._id}`);
                  }}
                >
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-12 h-16 object-cover rounded-md border border-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-gray-900 line-clamp-1">{b.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{b.author}</div>
                    <div className="text-sm font-black text-gray-900 mt-1">Rs. {b.price}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-4 text-sm text-gray-600">No AI matches found.</div>
          )}

          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              className="w-full text-left px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-sm text-gray-900"
              onClick={submitSearch}
            >
              See all results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

