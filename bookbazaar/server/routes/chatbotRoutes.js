import { GoogleGenerativeAI } from '@google/generative-ai';
import Book from '../models/Book.js';
import express from 'express';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const STOP_WORDS = new Set([
  'book', 'books', 'for', 'of', 'the', 'a', 'an', 'please', 'find', 'show', 'me',
  'under', 'below', 'cheap', 'new', 'good', 'fair', 'condition', 'rs', 'in', 'on',
  'with', 'and', 'or', 'university', 'college', 'grade', 'class',
]);

const normalizeCondition = (value) => {
  if (!value) return null;
  const t = String(value).toLowerCase().trim();
  if (t.includes('new')) return 'New';
  if (t.includes('good')) return 'Good';
  if (t.includes('fair')) return 'Fair';
  return null;
};

const parsePossiblyWrappedJson = (rawText) => {
  const text = String(rawText || '').trim().replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in model output');
    return JSON.parse(match[0]);
  }
};

const extractFiltersFromText = (message) => {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  const filters = {
    keyword: null,
    university: null,
    condition: null,
    maxPrice: null,
    minPrice: null,
    educationLevel: null,
    category: null,
  };

  const priceUnder = lower.match(/(?:under|below|less than)\s*(?:rs\.?\s*)?(\d{2,6})/i);
  const priceRs = lower.match(/(?:rs\.?\s*)(\d{2,6})/i);
  if (priceUnder) filters.maxPrice = Number(priceUnder[1]);
  else if (priceRs && /cheap|under|below|less/.test(lower)) filters.maxPrice = Number(priceRs[1]);

  if (/\bnew\b/i.test(lower)) filters.condition = 'New';
  else if (/\bgood\b/i.test(lower)) filters.condition = 'Good';
  else if (/\bfair\b/i.test(lower)) filters.condition = 'Fair';

  if (/grade\s*5|class\s*5|primary/i.test(lower)) filters.educationLevel = 'grade5';
  else if (/grade\s*6|class\s*6/i.test(lower)) filters.educationLevel = 'grade6';
  else if (/grade\s*7|class\s*7/i.test(lower)) filters.educationLevel = 'grade7';
  else if (/grade\s*8|class\s*8/i.test(lower)) filters.educationLevel = 'grade8';
  else if (/matric|ssc|grade\s*9|grade\s*10|class\s*9|class\s*10/i.test(lower)) filters.educationLevel = 'matric';
  else if (/fsc|hssc|intermediate|grade\s*11|grade\s*12|class\s*11|class\s*12/i.test(lower)) filters.educationLevel = 'fsc';
  else if (/o[\s-]?level/i.test(lower)) filters.educationLevel = 'olevel';
  else if (/a[\s-]?level/i.test(lower)) filters.educationLevel = 'alevel';
  else if (/\bcollege\b/i.test(lower)) filters.educationLevel = 'college';
  else if (/\buniversity\b/i.test(lower)) filters.educationLevel = 'university';

  const universities = ['fast', 'lums', 'comsats', 'nust', 'uet', 'pucit', 'nuces', 'iba', 'uol'];
  const uni = universities.find((u) => lower.includes(u));
  if (uni) filters.university = uni;

  if (filters.educationLevel?.includes('grade') || filters.educationLevel === 'matric' || filters.educationLevel === 'fsc') {
    filters.category = 'school';
  } else if (filters.educationLevel === 'college') {
    filters.category = 'college';
  } else if (filters.educationLevel === 'university') {
    filters.category = 'university';
  }

  let keyword = text
    .replace(/(?:under|below|less than)\s*(?:rs\.?\s*)?\d{2,6}/gi, ' ')
    .replace(/(?:rs\.?\s*)\d{2,6}/gi, ' ')
    .replace(/\b(new|good|fair|condition|books?|book|grade|class|matric|fsc|o-?level|a-?level|university|college)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!keyword) {
    const tokens = lower.split(/[^a-z0-9\u0600-\u06ff]+/i).filter((t) => t && !STOP_WORDS.has(t));
    keyword = tokens.slice(0, 4).join(' ').trim();
  }
  filters.keyword = keyword || null;

  const isBookSearch = /\b(book|books|grade|class|matric|fsc|o-?level|a-?level|university|college|course|subject|under|cheap)\b/i.test(lower)
    || /کتاب|کتابیں|کورس|کالج|یونیورسٹی|سستی/.test(lower);

  return { isBookSearch, filters };
};

const mergeFilters = (aiFilters = {}, textFilters = {}) => {
  const merged = { ...aiFilters };
  for (const key of Object.keys(textFilters)) {
    const current = merged[key];
    if (current === null || current === undefined || current === '') {
      merged[key] = textFilters[key];
    }
  }
  if (!merged.keyword && textFilters.keyword) merged.keyword = textFilters.keyword;
  return merged;
};

const normalizeLoose = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/gi, '');

const fuzzyFilterBooks = (books, filters = {}) => {
  const keyword = String(filters.keyword || '').trim();
  const keywordNorm = normalizeLoose(keyword);
  const tokens = keyword
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff]+/i)
    .filter((t) => t && !STOP_WORDS.has(t));

  return books.filter((b) => {
    if (filters.condition && b.condition !== normalizeCondition(filters.condition)) return false;
    if (filters.maxPrice && Number(b.price) > Number(filters.maxPrice)) return false;
    if (filters.minPrice && Number(b.price) < Number(filters.minPrice)) return false;
    if (filters.university && !String(b.university || '').toLowerCase().includes(String(filters.university).toLowerCase())) return false;

    if (!keyword) return true;

    const hay = `${b.title || ''} ${b.author || ''} ${b.description || ''} ${b.course || ''} ${b.university || ''}`;
    const hayNorm = normalizeLoose(hay);
    if (keywordNorm && hayNorm.includes(keywordNorm)) return true;
    if (tokens.length === 0) return false;
    const matchedCount = tokens.filter((t) => hayNorm.includes(normalizeLoose(t))).length;
    return matchedCount >= Math.max(1, Math.ceil(tokens.length / 2));
  });
};

const shouldSearchByHeuristic = (message) => {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();
  if (!text) return false;
  if (/\bhow|what|why|when|can i|can you|payment|order|commission|sell\b/i.test(lower)) return false;
  if (/\bbook|books|grade|class|matric|fsc|o-?level|a-?level|university|college|rs|cheap|under\b/i.test(lower)) return true;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 8;
};

const detectSupportIntent = (message) => {
  const lower = String(message || '').toLowerCase();
  const intents = {
    selling: /\b(how to sell|sell|list a book|add book|post a book|i want to sell)\b/i,
    account: /\b(login|log in|signup|sign up|register|account)\b/i,
    order: /\b(order|my order|track|purchase)\b/i,
    price: /\b(price|how much|cost|fee)\b/i,
  };
  if (intents.selling.test(lower)) {
    return {
      intentType: 'selling',
      reply: "To sell a book on BookBazaar:\n1. Click 'Sell a Book' in the top navbar\n2. Fill in your book details, price & condition\n3. Upload a cover photo\n4. Submit - your listing goes live instantly!\nNeed help with anything else?",
      cta: { label: 'Go to Sell a Book', path: '/add-book' },
    };
  }
  if (intents.account.test(lower)) {
    return {
      intentType: 'account',
      reply: 'You can create a free account by clicking Sign Up at the top of the page.',
      cta: null,
    };
  }
  if (intents.order.test(lower)) {
    return {
      intentType: 'order',
      reply: 'You can view your orders in your Profile page.',
      cta: { label: 'Go to Profile', path: '/profile' },
    };
  }
  if (intents.price.test(lower)) {
    return {
      intentType: 'price',
      reply: 'BookBazaar charges a small 10% platform fee from the seller. Buyers pay only the listed price.',
      cta: null,
    };
  }
  return null;
};

const extractSearchIntent = async (message) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
    Analyze this user message from a book marketplace: "${message}"

    Extract search intent and return ONLY valid JSON (no markdown, no backticks):
    {
      "isBookSearch": true or false,
      "filters": {
        "keyword": "book title, subject, or topic - or null",
        "university": "university or school name - or null",
        "condition": "New or Good or Fair - or null",
        "maxPrice": number or null,
        "minPrice": number or null,
        "educationLevel": "grade5 or matric or fsc or olevel alevel or university or college - or null",
        "category": "school or college or university or general - or null"
      }
    }

    Examples:
    "books of grade 5" -> isBookSearch:true, educationLevel:"grade5"
    "cheap physics books" -> isBookSearch:true, keyword:"physics", maxPrice:500
    "FAST university books" -> isBookSearch:true, university:"FAST"
    "books under Rs 300" -> isBookSearch:true, maxPrice:300
    "how do I sell a book" -> isBookSearch:false
    "Introduction to E-commerce" -> isBookSearch:true, keyword:"Introduction to E-commerce"
  `;

  const ruleBased = extractFiltersFromText(message);
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = parsePossiblyWrappedJson(text);
    const aiFilters = parsed?.filters && typeof parsed.filters === 'object' ? parsed.filters : {};
    return {
      isBookSearch: Boolean(parsed?.isBookSearch) || ruleBased.isBookSearch,
      filters: mergeFilters(aiFilters, ruleBased.filters),
    };
  } catch {
    return ruleBased;
  }
};

const buildBookQuery = (filters = {}) => {
  const query = { status: 'available' };
  const orConditions = [];

  if (filters.keyword) {
    const rawKeyword = String(filters.keyword).trim();
    const keywordCompact = rawKeyword.replace(/[-_\s]+/g, '');
    const tokens = rawKeyword
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff\s-]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t && !STOP_WORDS.has(t));

    orConditions.push(
      { title: { $regex: rawKeyword, $options: 'i' } },
      { title: { $regex: keywordCompact, $options: 'i' } },
      { author: { $regex: rawKeyword, $options: 'i' } },
      { description: { $regex: rawKeyword, $options: 'i' } },
      { course: { $regex: rawKeyword, $options: 'i' } },
      { 'educationMeta.subject': { $regex: rawKeyword, $options: 'i' } },
      { 'educationMeta.tags': { $regex: rawKeyword, $options: 'i' } },
      { category: { $regex: rawKeyword, $options: 'i' } }
    );

    if (tokens.length > 0) {
      query.$and = tokens.map((token) => ({
        $or: [
          { title: { $regex: token, $options: 'i' } },
          { author: { $regex: token, $options: 'i' } },
          { description: { $regex: token, $options: 'i' } },
          { course: { $regex: token, $options: 'i' } },
          { university: { $regex: token, $options: 'i' } },
          { 'educationMeta.subject': { $regex: token, $options: 'i' } },
          { 'educationMeta.tags': { $regex: token, $options: 'i' } },
        ],
      }));
    }
  }

  if (filters.university) {
    orConditions.push({ university: { $regex: filters.university, $options: 'i' } });
  }

  const levelMap = {
    grade5: 'grade 5|primary|class 5',
    grade6: 'grade 6|class 6',
    grade7: 'grade 7|class 7',
    grade8: 'grade 8|class 8',
    matric: 'matric|grade 9|grade 10|class 9|class 10|ssc',
    fsc: 'fsc|intermediate|grade 11|grade 12|hssc',
    olevel: 'o.?level|o level',
    alevel: 'a.?level|a level',
    university: 'university|bachelor|bs|bsc|be|bba',
    college: 'college|intermediate|fsc|fa',
  };

  if (filters.educationLevel && levelMap[filters.educationLevel]) {
    const pattern = levelMap[filters.educationLevel];
    orConditions.push(
      { university: { $regex: pattern, $options: 'i' } },
      { course: { $regex: pattern, $options: 'i' } },
      { description: { $regex: pattern, $options: 'i' } }
    );
  }

  const gradeMatch = String(filters.keyword || '').match(/\b(grade|class|standard)\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i);
  const gradeWordMap = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };
  if (gradeMatch) {
    const raw = gradeMatch[2].toLowerCase();
    const gradeNum = Number.isFinite(Number(raw)) ? Number(raw) : gradeWordMap[raw];
    if (gradeNum) {
      const pattern = `(grade|class|standard)\\s*${gradeNum}`;
      orConditions.push(
        { 'educationMeta.grade': gradeNum },
        { grade: gradeNum },
        { gradeLevel: { $regex: `(^|\\b)(grade\\s*${gradeNum}|class\\s*${gradeNum}|standard\\s*${gradeNum})(\\b|$)`, $options: 'i' } },
        { 'educationMeta.tags': { $in: [`grade${gradeNum}`, `class${gradeNum}`, `grade ${gradeNum}`] } },
        { title: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } }
      );
      if (gradeNum >= 6 && gradeNum <= 10) {
        orConditions.push(
          { 'educationMeta.level': 'secondary' },
          { category: { $regex: 'secondary', $options: 'i' } }
        );
      }
    }
  }

  if (orConditions.length > 0) query.$or = orConditions;

  const normalizedCondition = normalizeCondition(filters.condition);
  if (normalizedCondition) query.condition = normalizedCondition;

  if (filters.maxPrice || filters.minPrice) {
    query.price = {};
    if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
  }

  return query;
};

const generateReply = async (message, books, conversationHistory, profileContext = '') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const bookContext = books.length > 0
    ? `Found ${books.length} book(s) in database:\n${books
      .map(
        (b, i) =>
          `${i + 1}. "${b.title}" by ${b.author} - Rs.${b.price} Condition: ${b.condition} | Level: ${
            b.university || 'General'
          }`
      )
      .join('\n')}`
    : 'No matching books found in database.';

  const historyText = Array.isArray(conversationHistory)
    ? conversationHistory
      .slice(-4)
      .map((m) => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`)
      .join('\n')
    : '';

  const systemContext = `
    You are BookBot, a friendly assistant for BookBazaar -
    a second-hand book marketplace in Pakistan.

    ${historyText ? `Recent conversation:\n${historyText}\n` : ''}
    ${profileContext ? `User profile context:\n${profileContext}\n` : ''}

    ${bookContext}

    User asked: "${message}"

    Instructions:
    - If books were found, mention them naturally and briefly
    - If no books found, suggest they try different keywords
      or browse the full collection
    - For non-book questions, help with: selling books,
      commission (10% fee), payments, orders, account issues
    - Keep response SHORT (2-3 sentences max)
    - Respond in same language as user (Urdu or English)
    - Never say you are Gemini or Google AI - you are BookBot
    - Do NOT list the books again in text (frontend shows cards)
      just say how many were found and what they are about
  `;

  try {
    const result = await model.generateContent(systemContext);
    return result.response.text();
  } catch {
    if (books.length > 0) {
      return `I found ${books.length} book(s) matching your search! Check them out below.`;
    }
    return `I couldn't find books matching that search. Try different keywords or browse our full collection!`;
  }
};

router.post('/message', optionalAuth, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const cleanMessage = String(message).trim();
    const supportIntent = detectSupportIntent(cleanMessage);
    if (supportIntent) {
      return res.json({
        success: true,
        reply: supportIntent.reply,
        books: [],
        hasBooks: false,
        filtersUsed: {},
        isBookSearch: false,
        intentType: supportIntent.intentType,
        cta: supportIntent.cta,
      });
    }
    const userProfile = req.user?._id
      ? await User.findById(req.user._id).select('educationProfile purchaseHistory').lean()
      : null;
    const profileContext = userProfile?.educationProfile?.isProfileComplete
      ? (userProfile.educationProfile.level === 'university'
          ? `This user is a ${userProfile.educationProfile.field || 'university'} student at ${
              userProfile.educationProfile.university || 'their university'
            }, Semester ${userProfile.educationProfile.semester || 'N/A'}.`
          : `This user is a Grade ${userProfile.educationProfile.currentGrade || 'N/A'} student.`)
      : '';
    const intent = await extractSearchIntent(cleanMessage);
    const isBookSearch = Boolean(intent.isBookSearch) || shouldSearchByHeuristic(cleanMessage);
    let books = [];
    let totalMatches = 0;
    let viewAllPath = null;

    if (isBookSearch) {
      const query = buildBookQuery(intent.filters || {});
      const sortQuery = /cheap|under|below|low price|budget|sasti|کم/.test(cleanMessage.toLowerCase())
        ? { price: 1, createdAt: -1 }
        : { createdAt: -1 };
      totalMatches = await Book.countDocuments(query);
      books = await Book.find(query)
        .sort(sortQuery)
        .limit(8)
        .select('_id title author price condition university course image educationMeta category grade gradeLevel tags')
        .lean();

      if (books.length === 0 && intent.filters?.keyword) {
        const broadPool = await Book.find({ status: 'available' })
          .sort(sortQuery)
          .limit(100)
          .select('_id title author price condition university course image description educationMeta category grade gradeLevel tags')
          .lean();
        const fuzzy = fuzzyFilterBooks(broadPool, intent.filters);
        totalMatches = fuzzy.length;
        books = fuzzy.slice(0, 8).map(({ description, ...rest }) => rest);
      }

      const q = String(intent.filters?.keyword || cleanMessage || '').trim();
      const categoryParam = /grade\s*6|class\s*6|standard\s*6|grade six/i.test(cleanMessage) ? 'secondary' : '';
      viewAllPath = `/books?search=${encodeURIComponent(q)}${categoryParam ? `&category=${encodeURIComponent(categoryParam)}` : ''}`;
    }
    let reply = '';
    if (!isBookSearch) {
      reply = await generateReply(cleanMessage, books, conversationHistory, profileContext);
    } else if (books.length === 0) {
      reply = `Sorry, I couldn't find any books for "${cleanMessage}".`;
    } else if (books.length === 1) {
      reply = 'I found 1 book matching your search!';
    } else {
      reply = `I found ${books.length} books for "${cleanMessage}". Here they are:`;
    }

    return res.json({
      success: true,
      reply,
      books,
      hasBooks: books.length > 0,
      filtersUsed: intent.filters || {},
      isBookSearch,
      totalMatches,
      showingCount: books.length,
      truncated: totalMatches > books.length,
      viewAllPath,
    });
  } catch (error) {
    console.error('Chatbot error:', error.message);

    try {
      const safeMessage = String(req.body?.message || '').trim();
      const books = await Book.find({
        status: 'available',
        title: { $regex: safeMessage, $options: 'i' },
      })
        .limit(5)
        .select('_id title author price condition university image')
        .lean();

      return res.json({
        success: true,
        reply: books.length > 0
          ? `Found ${books.length} book(s) for you!`
          : `No books found. Try browsing our full collection.`,
        books,
        hasBooks: books.length > 0,
        isBookSearch: true,
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Service temporarily unavailable',
      });
    }
  }
});

export default router;

