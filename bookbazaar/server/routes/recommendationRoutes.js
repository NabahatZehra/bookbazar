import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import Book from '../models/Book.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { getPersonalizedRecommendations } from '../services/recommendationService.js';
import { getAnthropicClient } from '../utils/anthropicClient.js';
import {
  extractTextFromClaudeResponse,
  escapeRegExp,
  parseJsonFromClaude,
} from '../utils/claudeJson.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const result = await getPersonalizedRecommendations(req.user._id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const searchAssistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const recommendationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id?.toString?.() || req.user?.id?.toString?.();
    return userId || ipKeyGenerator(req.ip);
  },
});

function buildContextString({ user, purchasedBooks, wishlistBooks, recentlyViewedBooks }) {
  const parts = [];

  if (user?.university) parts.push(`Preferred university: ${user.university}`);
  if (user?.course) parts.push(`Preferred course: ${user.course}`);

  if (purchasedBooks?.length) {
    parts.push(
      `Purchased books: ${purchasedBooks
        .slice(0, 10)
        .map((b) => `${b.title} by ${b.author} (${b.university || 'General'}${b.course ? `, ${b.course}` : ''})`)
        .join('; ')}`
    );
  }

  if (wishlistBooks?.length) {
    parts.push(
      `Wishlist books: ${wishlistBooks
        .slice(0, 10)
        .map((b) => `${b.title} by ${b.author} (${b.university || 'General'}${b.course ? `, ${b.course}` : ''})`)
        .join('; ')}`
    );
  }

  if (recentlyViewedBooks?.length) {
    parts.push(
      `Recently viewed books: ${recentlyViewedBooks
        .slice(0, 10)
        .map((b) => `${b.title} by ${b.author} (${b.university || 'General'}${b.course ? `, ${b.course}` : ''})`)
        .join('; ')}`
    );
  }

  return parts.join('\n') || 'No prior browsing data found.';
}

async function findMatchingBookForSuggestion({ suggestion }) {
  const title = typeof suggestion?.title === 'string' ? suggestion.title.trim() : '';
  const author = typeof suggestion?.author === 'string' ? suggestion.author.trim() : '';
  if (!title && !author) return null;

  const or = [];
  if (title) or.push({ title: { $regex: new RegExp(escapeRegExp(title), 'i') } });
  if (author) or.push({ author: { $regex: new RegExp(escapeRegExp(author), 'i') } });

  const book = await Book.findOne({
    status: 'available',
    $or: or.length ? or : [{ title: { $regex: /./, $options: 'i' } }],
  }).sort({ views: -1, createdAt: -1 });

  return book;
}

router.post('/recommendations', protect, recommendationsLimiter, async (req, res) => {
  try {
    const userId = req.user?._id?.toString?.() || req.user?.id?.toString?.();
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    // Fetch user context
    const [orders, user] = await Promise.all([
      Order.find({ buyerId: userId, paymentStatus: 'Paid' })
        .populate('bookId', 'title author university course image price condition')
        .sort({ createdAt: -1 })
        .limit(30),
      User.findById(userId).populate('wishlist recentlyViewedBooks'),
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const purchasedBooks = (orders || [])
      .map((o) => o.bookId)
      .filter(Boolean);

    const wishlistBooks = user.wishlist || [];
    const recentlyViewedBooks = user.recentlyViewedBooks || [];

    const context = buildContextString({ user, purchasedBooks, wishlistBooks, recentlyViewedBooks });

    const prompt = `Based on this user's reading history and interests: ${context}
Recommend 5 books they would likely want to buy next.
For each book suggest: title, author, subject/genre, and a one-sentence reason why they'd like it.
Return ONLY a JSON array in this format:
[{ title, author, genre, reason }]`;

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractTextFromClaudeResponse(response);
    const parsed = parseJsonFromClaude(text);
    if (!Array.isArray(parsed)) {
      throw new Error('Claude did not return an array');
    }

    const suggestions = parsed
      .map((s) => ({
        title: typeof s?.title === 'string' ? s.title.trim() : '',
        author: typeof s?.author === 'string' ? s.author.trim() : '',
        genre: typeof s?.genre === 'string' ? s.genre.trim() : '',
        reason: typeof s?.reason === 'string' ? s.reason.trim() : '',
      }))
      .filter((s) => s.title && s.author && s.reason);

    const matchedBooks = [];
    const aiSuggestions = [];

    for (const suggestion of suggestions) {
      // Keep trying until we have 5 real matches.
      // If a suggestion has no matching DB entry, it is skipped.
      const book = await findMatchingBookForSuggestion({ suggestion });
      if (!book) continue;

      matchedBooks.push(book);
      aiSuggestions.push({
        title: suggestion.title,
        author: suggestion.author,
        genre: suggestion.genre || book.course || book.university || 'General',
        reason: suggestion.reason,
      });

      if (matchedBooks.length >= 5) break;
    }

    // If Claude returned suggestions but we couldn't match enough books, fall back gracefully.
    if (matchedBooks.length < 5) {
      const popularFallback = await Book.find({ status: 'available' })
        .sort({ views: -1, createdAt: -1 })
        .limit(5);

      for (const b of popularFallback) {
        if (matchedBooks.length >= 5) break;
        if (matchedBooks.some((mb) => mb._id.toString() === b._id.toString())) continue;
        matchedBooks.push(b);
        aiSuggestions.push({
          title: b.title,
          author: b.author,
          genre: b.course || b.university || 'General',
          reason: 'Popular pick on BookBazaar based on current interest.',
        });
      }
    }

    return res.json({
      success: true,
      data: { aiSuggestions, matchedBooks },
    });
  } catch (err) {
    // Recommendations: show regular popular books instead.
    try {
      const popularBooks = await Book.find({ status: 'available' })
        .sort({ views: -1, createdAt: -1 })
        .limit(5);

      const aiSuggestions = popularBooks.map((b) => ({
        title: b.title,
        author: b.author,
        genre: b.course || b.university || 'General',
        reason: 'Popular pick on BookBazaar right now.',
      }));

      return res.json({ success: true, data: { aiSuggestions, matchedBooks: popularBooks } });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to generate recommendations' });
    }
  }
});

router.post('/search-assist', searchAssistLimiter, async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }

    const prompt = `Extract search intent from the following natural language query.
Return ONLY valid JSON (no markdown) that matches this schema:
{
  "keywords": string[],
  "subject": string | null,
  "university": string | null,
  "maxPrice": number | null
}
Guidelines:
- keywords should be short terms (5-10 words total) taken from the query.
- subject should be the academic subject/genre (e.g., accounting, python, data structures) if present.
- university should be the campus/university name if present.
- maxPrice should be the maximum price in PKR if specified; otherwise null.

Query: "${query}"`;

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractTextFromClaudeResponse(response);
    const parsed = parseJsonFromClaude(text);

    const keywords = Array.isArray(parsed?.keywords) ? parsed.keywords.map((k) => String(k).trim()).filter(Boolean) : [];
    const subject = parsed?.subject ? String(parsed.subject).trim() : null;
    const university = parsed?.university ? String(parsed.university).trim() : null;
    const maxPrice = Number.isFinite(parsed?.maxPrice) ? parsed.maxPrice : parsed?.maxPrice != null ? Number(parsed.maxPrice) : null;

    const queryObj = { status: 'available' };
    if (university) queryObj.university = { $regex: university, $options: 'i' };
    if (typeof maxPrice === 'number' && Number.isFinite(maxPrice)) {
      queryObj.price = { $lte: maxPrice };
    }

    const or = [];

    const pushRegexOr = (field, value) => {
      if (!value) return;
      const v = String(value).trim();
      if (!v) return;
      or.push({ [field]: { $regex: v, $options: 'i' } });
    };

    if (subject) {
      pushRegexOr('title', subject);
      pushRegexOr('author', subject);
      pushRegexOr('course', subject);
      pushRegexOr('description', subject);
    }

    for (const kw of keywords.slice(0, 12)) {
      pushRegexOr('title', kw);
      pushRegexOr('author', kw);
      pushRegexOr('course', kw);
      pushRegexOr('description', kw);
    }

    if (or.length) queryObj.$or = or;

    const matchedBooks = await Book.find(queryObj)
      .sort({ views: -1, createdAt: -1 })
      .limit(8)
      .select('title author price image condition university course');

    return res.json({
      success: true,
      data: {
        matchedBooks,
        understood: { keywords, subject, university, maxPrice: typeof maxPrice === 'number' ? maxPrice : null },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'AI search failed' });
  }
});

router.post('/suggest-price', protect, async (req, res) => {
  try {
    const { title, author, condition } = req.body || {};
    if (!title || !author || !condition) {
      return res.status(400).json({ success: false, message: 'title, author, and condition are required' });
    }

    const prompt = `A seller on a Pakistani second-hand book marketplace wants to 
sell: '${title}' by ${author} in ${condition} condition.
Suggest a fair resale price in Pakistani Rupees.
Consider that new books in Pakistan cost between Rs.500-Rs.3000 
typically. Give a price range and brief reason.
Return ONLY JSON: { minPrice, maxPrice, suggestedPrice, reason }`;

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 450,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractTextFromClaudeResponse(response);
    const parsed = parseJsonFromClaude(text);

    const result = {
      minPrice: Number(parsed?.minPrice),
      maxPrice: Number(parsed?.maxPrice),
      suggestedPrice: Number(parsed?.suggestedPrice),
      reason: typeof parsed?.reason === 'string' ? parsed.reason.trim() : '',
    };

    if (![result.minPrice, result.maxPrice, result.suggestedPrice].every((n) => Number.isFinite(n))) {
      throw new Error('Invalid price fields from Claude');
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    // Price suggester: hide the suggestion box silently on the frontend.
    return res.status(500).json({ success: false, message: 'AI price suggestion failed' });
  }
});

export default router;

