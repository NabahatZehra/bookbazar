import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Star, ShieldCheck, MapPin, BookOpen } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const uid = (u) => (u?.id || u?._id ? String(u.id || u._id) : null);

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [sellerAverage, setSellerAverage] = useState(0);
  const [sellerTotalReviews, setSellerTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [ratingDraft, setRatingDraft] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const sellerId =
    book?.sellerId?._id || book?.sellerId || book?.seller?._id || book?.seller;
  const sellerIdStr = sellerId ? String(sellerId) : null;

  const loadReviews = useCallback(async () => {
    if (!sellerIdStr) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const res = await api.get(`/reviews/seller/${sellerIdStr}`);
      if (res.data.success) {
        const payload = res.data.data;
        const list = Array.isArray(payload?.reviews)
          ? payload.reviews
          : Array.isArray(payload)
            ? payload
            : [];
        setReviews(list);
        setSellerAverage(
          typeof payload?.averageRating === 'number' ? payload.averageRating : 0
        );
        setSellerTotalReviews(typeof payload?.totalReviews === 'number' ? payload.totalReviews : list.length);
      } else {
        setReviews([]);
      }
    } catch (err) {
      setReviewsError(err.response?.data?.message || 'Failed to load reviews');
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [sellerIdStr]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await api.get(`/books/${id}`);
        if (res.data.success) {
          setBook(res.data.data);
        }
      } catch {
        toast.error('Failed to load book');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, navigate]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    const fetchEligibility = async () => {
      if (!user || !sellerIdStr) {
        setReviewEligibility(null);
        return;
      }
      try {
        const res = await api.get(`/reviews/seller/${sellerIdStr}/eligibility`);
        if (res.data.success) setReviewEligibility(res.data.data);
        else setReviewEligibility(null);
      } catch {
        setReviewEligibility(null);
      }
    };
    fetchEligibility();
  }, [user, sellerIdStr, reviews.length]);

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please login to purchase books');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (sellerIdStr && uid(user) === sellerIdStr) {
      toast.error('You cannot buy your own book');
      return;
    }

    addToCart(book);
    toast.success('Added to cart!');
  };

  const handleMessageSeller = async () => {
    if (!user) {
      toast.error('Please login to message the seller');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    const myId = uid(user);
    const sid = sellerIdStr;
    if (!sid) {
      toast.error('Seller information is missing');
      return;
    }
    if (myId === sid) {
      toast.error('You cannot message yourself');
      return;
    }

    setMessaging(true);
    try {
      const res = await api.post('/conversations', {
        recipientId: sid,
        bookId: book._id,
      });
      if (!res.data.success || !res.data.data?.conversationId) {
        throw new Error(res.data.message || 'Could not start conversation');
      }
      navigate(`/messages/${res.data.data.conversationId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start conversation');
    } finally {
      setMessaging(false);
    }
  };

  const handleSubmitSellerReview = async (e) => {
    e.preventDefault();
    if (!reviewEligibility?.canReview || !reviewEligibility?.orderId) {
      toast.error('You are not eligible to review this seller yet');
      return;
    }
    if (!ratingDraft || ratingDraft < 1 || ratingDraft > 5) {
      toast.error('Please select a rating from 1 to 5 stars');
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await api.post(`/reviews/seller/${sellerIdStr}`, {
        orderId: reviewEligibility.orderId,
        rating: ratingDraft,
        comment: commentDraft.trim(),
      });
      if (res.data.success) {
        toast.success('Thank you for your review!');
        setCommentDraft('');
        setRatingDraft(0);
        await loadReviews();
        const el = await api.get(`/reviews/seller/${sellerIdStr}/eligibility`);
        if (el.data.success) setReviewEligibility(el.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!book) return null;

  const inCart = cart.some((item) => item._id === book._id);
  const displayAvg = sellerAverage || Number(book?.sellerId?.averageRating || 0);
  const displayTotal = sellerTotalReviews ?? book?.sellerId?.totalReviews ?? 0;
  const isOwnListing = Boolean(user && sellerIdStr && uid(user) === sellerIdStr);
  const canShowMessage = Boolean(user && sellerIdStr && uid(user) !== sellerIdStr);
  const lowerTitle = String(book.title || '').toLowerCase();
  const lowerCourse = String(book.course || '').toLowerCase();
  const lowerUniversity = String(book.university || '').toLowerCase();
  const meta = book.educationMeta || {};

  const normalizeDisplay = (v) => {
    const t = String(v ?? '').trim();
    if (!t || /^n\/?a$/i.test(t) || /^general$/i.test(t) || /^null$/i.test(t) || /^undefined$/i.test(t)) {
      return null;
    }
    return t;
  };

  const isSchoolBook =
    ['primary', 'secondary', 'higher_secondary'].includes(String(meta.level || '').toLowerCase()) ||
    (Number(meta.grade) >= 1 && Number(meta.grade) <= 12) ||
    /grade|class|matric|fsc|o level|a level|igcse/.test(`${lowerTitle} ${lowerCourse}`);

  const isUniversityBook =
    String(meta.level || '').toLowerCase() === 'university' ||
    /university|semester|bs|bsc|be|bba/.test(`${lowerUniversity} ${lowerCourse}`);

  let infoLabel1 = 'Category';
  let infoLabel2 = 'Level';
  let infoValue1 = normalizeDisplay(meta.field) || normalizeDisplay(meta.subject) || 'Not specified';
  let infoValue2 = normalizeDisplay(meta.semester ? `Semester ${meta.semester}` : null) || 'General';

  if (isSchoolBook) {
    infoLabel1 = 'Grade Level';
    infoLabel2 = 'Subject';
    infoValue1 = normalizeDisplay(meta.grade ? `Class ${meta.grade}` : null) || normalizeDisplay(meta.level) || 'Not specified';
    infoValue2 = normalizeDisplay(meta.subject) || normalizeDisplay(book.course) || 'Not specified';
  } else if (isUniversityBook) {
    infoLabel1 = 'University';
    infoLabel2 = 'Course';
    infoValue1 = normalizeDisplay(meta.university) || normalizeDisplay(book.university) || 'Not specified';
    infoValue2 = normalizeDisplay(meta.subject) || normalizeDisplay(book.course) || 'Not specified';
  }

  const conditionScoreMatch = String(book.description || '').match(/\b(\d{1,2})\s*\/\s*10\b/);
  const conditionScore = conditionScoreMatch ? `${conditionScoreMatch[1]}/10` : null;
  const looksLikeOnlyScore = conditionScoreMatch && String(book.description || '').trim() === conditionScore;
  const descriptionText = looksLikeOnlyScore ? '' : String(book.description || '').trim();

  return (
    <div className="max-w-6xl mx-auto py-8">
      <Helmet>
        <title>{book.seoTitle || book.title}</title>
        <meta name="description" content={book.seoDescription || book.description.substring(0, 160)} />
        {book.seoKeywords && <meta name="keywords" content={book.seoKeywords} />}
        {book.canonicalUrl && <link rel="canonical" href={book.canonicalUrl} />}

        <meta property="og:title" content={book.seoTitle || book.title} />
        <meta property="og:description" content={book.seoDescription || book.description.substring(0, 160)} />
        <meta property="og:image" content={book.ogImage || book.image} />
        <meta property="og:type" content="product" />

        <script type="application/ld+json">
          {JSON.stringify(
            book.structuredData && Object.keys(book.structuredData).length
              ? book.structuredData
              : {
                  '@context': 'https://schema.org',
                  '@type': 'Product',
                  name: book.title,
                  image: book.image,
                  description: book.description,
                  offers: {
                    '@type': 'Offer',
                    priceCurrency: 'PKR',
                    price: book.price,
                    availability:
                      book.status === 'available'
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/OutOfStock',
                  },
                }
          )}
        </script>
      </Helmet>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-2/5 md:border-r border-gray-100 bg-gray-50 p-8 flex items-center justify-center">
            <img
              src={book.image}
              alt={book.title}
              className="max-h-[500px] w-auto object-contain rounded-lg shadow-md"
            />
          </div>

          <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col pt-10">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  book.condition === 'New'
                    ? 'bg-green-100 text-green-700'
                    : book.condition === 'Good'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                }`}
              >
                {book.condition} Condition
              </span>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  book.status === 'available'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {book.status === 'available' ? 'In Stock' : 'Sold Out'}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">{book.title}</h1>
            <p className="text-xl text-gray-600 mb-6 font-medium">By {book.author}</p>

            <div className="text-3xl font-black text-gray-900 mb-8 border-b border-gray-100 pb-8">
              Rs. {book.price.toLocaleString()}
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-3">Condition</h3>
            <div className="mb-3">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                  book.condition === 'New'
                    ? 'bg-green-100 text-green-700'
                    : book.condition === 'Good'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                }`}
              >
                {book.condition}{conditionScore ? ` — ${conditionScore}` : ''}
              </span>
            </div>
            {descriptionText && (
              <p className="text-gray-600 leading-relaxed mb-8 whitespace-pre-line">{descriptionText}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{infoLabel1}</p>
                  <p className={`text-sm font-bold ${infoValue1 === 'Not specified' ? 'text-gray-400' : 'text-gray-700'}`}>{infoValue1}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{infoLabel2}</p>
                  <p className={`text-sm font-bold ${infoValue2 === 'Not specified' || infoValue2 === 'General' ? 'text-gray-400' : 'text-gray-700'}`}>{infoValue2}</p>
                </div>
              </div>
            </div>

            {book.sellerId && (
              <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-8 gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
                    {book.sellerId.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 font-medium mb-0.5">Sold by</p>
                    <p className="font-bold text-gray-800 flex items-center gap-1.5 truncate">
                      {book.sellerId.name}
                      <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                    </p>
                    <div className="flex items-center mt-1 text-yellow-400 gap-0.5 flex-wrap">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const filled = i < Math.round(displayAvg);
                        return (
                          <Star
                            key={i}
                            size={14}
                            fill={filled ? 'currentColor' : 'none'}
                            className={filled ? 'text-yellow-400' : 'text-gray-300'}
                          />
                        );
                      })}
                      <span className="text-xs text-gray-500 ml-1.5 font-medium">
                        ({Number(displayAvg).toFixed(1)}) • {displayTotal} reviews
                      </span>
                    </div>
                  </div>
                </div>

                {canShowMessage && (
                  <button
                    type="button"
                    onClick={handleMessageSeller}
                    disabled={messaging}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    <MessageCircle size={18} className="text-blue-600" />
                    <span className="hidden sm:inline">{messaging ? 'Opening…' : 'Message'}</span>
                  </button>
                )}
              </div>
            )}

            <div className="mt-10 bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Seller Reviews</h3>

              {reviewsLoading ? (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
                  Loading reviews...
                </div>
              ) : reviewsError ? (
                <div className="text-sm text-red-600">{reviewsError}</div>
              ) : reviews.length === 0 ? (
                <div className="text-sm text-gray-600 bg-white border border-gray-100 rounded-xl p-4">
                  No reviews yet for this seller.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => {
                    const ratingInt = Math.round(Number(r.rating || 0));
                    return (
                      <div key={r._id} className="bg-white border border-gray-100 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900">{r.reviewerId?.name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-500">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <div className="flex items-center text-yellow-400 gap-0.5 flex-shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const filled = i < ratingInt;
                              return (
                                <Star
                                  key={i}
                                  size={14}
                                  fill={filled ? 'currentColor' : 'none'}
                                  className={filled ? 'text-yellow-400' : 'text-gray-300'}
                                />
                              );
                            })}
                          </div>
                        </div>
                        {r.comment && <p className="mt-3 text-gray-700 whitespace-pre-line">{r.comment}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {user && reviewEligibility?.canReview && reviewEligibility?.orderId && (
                <form
                  onSubmit={handleSubmitSellerReview}
                  className="mt-6 bg-white border border-blue-100 rounded-xl p-4 space-y-4"
                >
                  <p className="font-bold text-gray-900">Rate this seller</p>
                  <p className="text-xs text-gray-500">
                    Completed purchase required. One review per seller.
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRatingDraft(n)}
                        className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`${n} stars`}
                      >
                        <Star
                          size={28}
                          className={n <= ratingDraft ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      </button>
                    ))}
                    <span className="text-sm text-gray-600 ml-2">{ratingDraft ? `${ratingDraft} / 5` : 'Select stars'}</span>
                  </div>
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Optional comment"
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    disabled={reviewSubmitting || !ratingDraft}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {reviewSubmitting ? 'Submitting…' : 'Submit review'}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-auto pt-6 flex flex-col gap-4">
              {isOwnListing ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
                  <p className="font-bold text-amber-900 mb-1">This is your listing</p>
                  <p className="text-sm text-amber-800/90 mb-3">
                    Buyers cannot purchase their own books. Manage this book from your seller dashboard.
                  </p>
                  <Link
                    to="/dashboard"
                    state={{ focusBookId: book._id }}
                    className="inline-flex items-center font-semibold text-blue-700 hover:text-blue-900 underline"
                  >
                    Open seller dashboard →
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={book.status !== 'available' || inCart}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
                  >
                    <ShoppingCart size={20} />
                    {inCart ? 'Already in Cart' : book.status === 'available' ? 'Add to Cart' : 'Sold Out'}
                  </button>
                  {book.status === 'available' && !inCart && (
                    <button
                      onClick={() => {
                        handleAddToCart();
                        navigate('/cart');
                      }}
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-bold flex items-center justify-center shadow-md transition-all hover:-translate-y-0.5"
                    >
                      Buy Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
