import Book from '../models/Book.js';
import User from '../models/User.js';

const fieldSubjectMap = {
  'Computer Science': ['Data Structures', 'Algorithms', 'OOP', 'Operating Systems', 'Database', 'Computer Networks', 'Software Engineering', 'Artificial Intelligence', 'Web Development', 'Python', 'Java', 'C++'],
  'Software Engineering': ['Software Engineering', 'OOP', 'Data Structures', 'Design Patterns', 'Agile', 'Testing', 'Web Development'],
  'Electrical Engineering': ['Circuit Analysis', 'Electronics', 'Digital Logic', 'Signals Systems', 'Control Systems', 'Power Systems'],
  'Business/Commerce': ['Accounting', 'Finance', 'Marketing', 'Economics', 'Business Law', 'Statistics', 'Management', 'HRM'],
  'Medical/Biology': ['Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology', 'Pathology', 'Biology', 'Chemistry', 'Microbiology'],
  Mathematics: ['Calculus', 'Linear Algebra', 'Statistics', 'Differential Equations', 'Real Analysis', 'Number Theory'],
};

export const getGradeProgressionBooks = async (user) => {
  const profile = user.educationProfile || {};
  const history = Array.isArray(user.purchaseHistory) ? user.purchaseHistory : [];

  let targetGrades = [];
  if (profile.currentGrade) {
    targetGrades.push(profile.currentGrade);
    if (profile.currentGrade < 12) targetGrades.push(profile.currentGrade + 1);
  }
  const boughtGrades = history.filter((h) => h.grade).map((h) => h.grade);
  if (boughtGrades.length > 0) {
    const highestBoughtGrade = Math.max(...boughtGrades);
    if (highestBoughtGrade + 1 <= 12) targetGrades.push(highestBoughtGrade + 1);
  }
  targetGrades = [...new Set(targetGrades)];
  const boughtBookIds = history.map((h) => h.bookId).filter(Boolean);
  if (targetGrades.length === 0) return { books: [], targetGrades: [] };

  const books = await Book.find({
    status: 'available',
    'educationMeta.grade': { $in: targetGrades },
    _id: { $nin: boughtBookIds },
  }).sort({ createdAt: -1 }).limit(10).lean();

  return { books, targetGrades };
};

export const getUniversityFieldBooks = async (user) => {
  const { field, semester, university } = user.educationProfile || {};
  if (!field) return { books: [], field: null, subjects: [] };

  const subjects = fieldSubjectMap[field] || [];
  const boughtBookIds = (user.purchaseHistory || []).map((h) => h.bookId).filter(Boolean);
  const subjectRegex = subjects.slice(0, 8).map((s) => `(${s})`).join('|');

  const query = {
    status: 'available',
    _id: { $nin: boughtBookIds },
    $or: [
      { 'educationMeta.field': { $regex: field, $options: 'i' } },
      { title: { $regex: subjectRegex || field, $options: 'i' } },
      { 'educationMeta.tags': { $in: subjects.map((s) => s.toLowerCase()) } },
      { description: { $regex: subjectRegex || field, $options: 'i' } },
    ],
  };
  if (semester) query.$or.push({ 'educationMeta.semester': Number(semester) });
  if (university) query.$or.push({ university: { $regex: university, $options: 'i' } });

  const books = await Book.find(query).sort({ createdAt: -1 }).limit(10).lean();
  return { books, field, subjects: subjects.slice(0, 5) };
};

export const getPersonalizedRecommendations = async (userId) => {
  const user = await User.findById(userId).populate('purchaseHistory.bookId', 'title educationMeta').lean();
  if (!user) return { books: [], reason: 'User not found' };

  const profile = user.educationProfile || {};
  let recommendations = [];
  let reason = '';
  let nextGrade = null;
  let subjects = [];

  if (!profile?.isProfileComplete) {
    const popular = await Book.find({ status: 'available' }).sort({ views: -1 }).limit(8).lean();
    return { books: popular, reason: 'Popular books', needsProfile: true, profile };
  }

  if (profile.level === 'university') {
    const result = await getUniversityFieldBooks(user);
    recommendations = result.books;
    subjects = result.subjects;
    reason = `Recommended for ${profile.field || 'university'} students`;
  } else {
    const result = await getGradeProgressionBooks(user);
    recommendations = result.books;
    nextGrade = result.targetGrades[result.targetGrades.length - 1] || profile.currentGrade;
    reason = nextGrade ? `Books for Grade ${nextGrade}` : 'Books for your level';
  }

  if (recommendations.length === 0) {
    recommendations = await Book.find({ status: 'available' }).sort({ createdAt: -1 }).limit(8).lean();
    reason = 'Latest books';
  }

  return { books: recommendations, reason, profile, nextGrade, subjects };
};
