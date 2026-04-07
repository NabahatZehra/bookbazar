import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, MapPin, BookOpen, AlertCircle, X } from 'lucide-react';
import SEO from '../components/common/SEO';
import api from '../services/api';
import toast from 'react-hot-toast';

const CATEGORY_OPTIONS = [
  { value: 'school_primary', label: 'Primary (Grade 1-5)', group: 'school', level: 'primary', gradeLabel: 'Grade 1-5' },
  { value: 'school_secondary', label: 'Secondary (Grade 6-10)', group: 'school', level: 'secondary', gradeLabel: 'Grade 6-10' },
  { value: 'school_higher_secondary', label: 'Higher Secondary (Grade 11-12)', group: 'school', level: 'higher_secondary', gradeLabel: 'Grade 11-12' },
  { value: 'school_oa_levels', label: 'O/A Levels', group: 'school', level: 'higher_secondary', gradeLabel: 'O/A Levels' },
  { value: 'uni_cs', label: 'Computer Science', group: 'university', level: 'university', field: 'Computer Science' },
  { value: 'uni_business', label: 'Business & Commerce', group: 'university', level: 'university', field: 'Business/Commerce' },
  { value: 'uni_engineering', label: 'Engineering', group: 'university', level: 'university', field: 'Engineering' },
  { value: 'uni_medical', label: 'Medical/Biology', group: 'university', level: 'university', field: 'Medical/Biology' },
  { value: 'popular_programming', label: 'Programming', group: 'popular', level: 'general' },
  { value: 'popular_mathematics', label: 'Mathematics', group: 'popular', level: 'general' },
  { value: 'popular_physics', label: 'Physics', group: 'popular', level: 'general' },
  { value: 'popular_exam_prep', label: 'Exam Prep', group: 'popular', level: 'general' },
  { value: 'popular_other', label: 'General / Other', group: 'popular', level: 'general' },
];

const AddBook = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiPriceLoading, setAiPriceLoading] = useState(false);
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    price: '',
    condition: 'Good',
    university: '',
    course: '',
    image: null,
    educationLevel: 'general',
    grade: '',
    subject: '',
    field: '',
    semester: '',
    board: '',
    tags: '',
    bookCategory: '',
  });

  const selectedCategoryMeta = useMemo(
    () => CATEGORY_OPTIONS.find((item) => item.value === formData.bookCategory) || null,
    [formData.bookCategory]
  );
  const isUniversityCategory = selectedCategoryMeta?.group === 'university';
  const isSchoolCategory = selectedCategoryMeta?.group === 'school';

  const canSuggestPrice =
    String(formData.title || '').trim().length > 0 &&
    String(formData.author || '').trim().length > 0 &&
    String(formData.condition || '').trim().length > 0;

  const suggestedTags = useMemo(() => {
    const map = {
      school_primary: ['grade1', 'grade2', 'primary', 'school'],
      school_secondary: ['grade6', 'grade7', 'secondary', 'oxford'],
      school_higher_secondary: ['grade11', 'grade12', 'fsc', 'intermediate'],
      school_oa_levels: ['olevel', 'alevel', 'cambridge', 'school'],
      uni_cs: ['programming', 'dsa', 'oop', 'cs'],
      uni_business: ['accounting', 'finance', 'commerce', 'business'],
      uni_engineering: ['engineering', 'circuits', 'mechanics', 'math'],
      uni_medical: ['biology', 'anatomy', 'mbbs', 'medical'],
      popular_programming: ['coding', 'javascript', 'python', 'programming'],
      popular_mathematics: ['algebra', 'calculus', 'math', 'statistics'],
      popular_physics: ['physics', 'mechanics', 'science', 'quantum'],
      popular_exam_prep: ['mcqs', 'entrytest', 'exam', 'prep'],
      popular_other: ['books', 'reading', 'general', 'bestseller'],
    };
    return map[formData.bookCategory] || [];
  }, [formData.bookCategory]);

  const completionPercent = useMemo(() => {
    const checks = [
      Boolean(formData.image),
      Boolean(String(formData.title).trim()),
      Boolean(String(formData.author).trim()),
      Boolean(String(formData.price).trim()),
      Boolean(String(formData.description).trim()),
      Boolean(formData.bookCategory),
      isUniversityCategory ? Boolean(String(formData.university).trim()) && Boolean(String(formData.course).trim()) : true,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [formData, isUniversityCategory]);

  const descriptionPlaceholder = isSchoolCategory
    ? 'e.g. Class 6 Oxford English, good condition, no missing pages...'
    : isUniversityCategory
      ? 'e.g. CS-101 textbook, highlighted chapters 1-5, spine intact...'
      : 'Describe the condition, edition, and any highlights...';

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files[0]) {
      setFormData((prev) => ({ ...prev, image: files[0] }));
      setImagePreview(URL.createObjectURL(files[0]));
      setErrors((prev) => ({ ...prev, image: '' }));
      return;
    }
    if (name === 'bookCategory') {
      const meta = CATEGORY_OPTIONS.find((item) => item.value === value);
      setFormData((prev) => ({
        ...prev,
        bookCategory: value,
        educationLevel: meta?.level || 'general',
        field: meta?.group === 'university' ? (meta?.field || prev.field) : '',
        university: meta?.group === 'university' ? prev.university : '',
        course: meta?.group === 'university' ? prev.course : '',
      }));
      setErrors((prev) => ({ ...prev, bookCategory: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const getAiPriceSuggestion = async () => {
    if (!canSuggestPrice || aiPriceLoading) return;
    setAiPriceLoading(true);
    setAiPriceSuggestion(null);
    try {
      const res = await api.post('/ai/suggest-price', {
        title: formData.title.trim(),
        author: formData.author.trim(),
        condition: formData.condition,
      });
      const data = res?.data?.data;
      if (data && typeof data === 'object') {
        setAiPriceSuggestion({
          minPrice: Number(data.minPrice),
          maxPrice: Number(data.maxPrice),
          suggestedPrice: Number(data.suggestedPrice),
          reason: typeof data.reason === 'string' ? data.reason.trim() : '',
        });
      }
    } catch {
      setAiPriceSuggestion(null);
    } finally {
      setAiPriceLoading(false);
    }
  };

  const addTagChip = (tag) => {
    const current = String(formData.tags || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (current.includes(tag.toLowerCase())) return;
    setFormData((prev) => ({ ...prev, tags: [...current, tag].join(', ') }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!formData.image) nextErrors.image = 'Book cover image is required';
    if (!String(formData.title).trim()) nextErrors.title = 'Title is required';
    if (!String(formData.author).trim()) nextErrors.author = 'Author is required';
    if (!String(formData.price).trim()) nextErrors.price = 'Price is required';
    if (!String(formData.description).trim()) nextErrors.description = 'Description is required';
    if (!formData.bookCategory) nextErrors.bookCategory = 'Book category is required';
    if (isUniversityCategory && !String(formData.university).trim()) nextErrors.university = 'University is required';
    if (isUniversityCategory && !String(formData.course).trim()) nextErrors.course = 'Course code is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    try {
      const res = await api.post('/books', data);
      if (res.data.success) {
        toast.success('Book listed successfully!');
        navigate(`/book/${res.data.data._id}`);
      }
    } catch (err) {
      if (err.response) toast.error(err.response.data?.message || `Server Error: ${err.response.status}`);
      else if (err.request) toast.error('Network Error: The backend connection dropped or timed out.');
      else toast.error(`Browser Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <SEO title="Sell Your Book" description="List your used textbooks and academic materials for sale on BookBazaar." />
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 px-8 py-6 text-white">
          <h1 className="text-3xl font-extrabold mb-2">Sell Your Book</h1>
          <p className="text-blue-100 font-medium">Fill in the details below to list your book on the marketplace.</p>
          <div className="mt-4">
            <div className="flex text-xs font-semibold justify-between mb-1">
              <span>Step 1: Book Details</span><span>Step 2: Pricing</span><span>Step 3: Preview & Submit</span>
            </div>
            <div className="w-full h-2 bg-blue-400/40 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="text-xs mt-1 text-blue-100">{completionPercent}% complete</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Book Cover Image *</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors bg-gray-50 relative group cursor-pointer overflow-hidden">
                    {imagePreview ? (
                      <div className="relative w-full aspect-[3/4] flex items-center justify-center">
                        <img src={imagePreview} alt="Preview" className="max-h-64 object-contain" />
                        <button type="button" onClick={() => { setImagePreview(null); setFormData((prev) => ({ ...prev, image: null })); }} className="absolute top-2 right-2 bg-white text-gray-700 rounded-full p-1.5 shadow">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 text-center py-10">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="text-sm text-gray-600 font-medium">Click to upload or drag & drop your book cover</p>
                        <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                      </div>
                    )}
                    <input id="file-upload" name="image" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} />
                  </div>
                  {errors.image && <p className="text-xs text-red-600 mt-1">{errors.image}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FileText size={18} className="text-gray-400" /></div>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} className={`pl-10 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 bg-gray-50 ${errors.title ? 'border-red-400' : 'border-gray-300'}`} placeholder="e.g. Introduction to Algorithms" />
                  </div>
                  {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Author(s) *</label>
                  <input type="text" name="author" value={formData.author} onChange={handleChange} className={`block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 px-4 bg-gray-50 ${errors.author ? 'border-red-400' : 'border-gray-300'}`} placeholder="e.g. Thomas H. Cormen" />
                  {errors.author && <p className="text-xs text-red-600 mt-1">{errors.author}</p>}
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Price (Rs.) *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500 font-medium">Rs.</span></div>
                      <input
                        type="number"
                        name="book-price"
                        min="1"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={formData.price}
                        onChange={(e) => { setFormData((prev) => ({ ...prev, price: e.target.value })); setErrors((prev) => ({ ...prev, price: '' })); }}
                        className={`pl-10 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 bg-gray-50 ${errors.price ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="1500"
                      />
                    </div>
                    {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
                    {canSuggestPrice && (
                      <button type="button" onClick={() => void getAiPriceSuggestion()} disabled={aiPriceLoading} className="mt-3 w-full bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold py-2.5 px-3 rounded-lg border border-blue-200 shadow-sm transition-colors disabled:opacity-60">
                        {aiPriceLoading ? 'Getting suggestion...' : '✨ Get AI Price Suggestion'}
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Condition *</label>
                    <select name="condition" value={formData.condition} onChange={handleChange} className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 px-3 bg-gray-50">
                      <option value="New">Like New</option><option value="Good">Good</option><option value="Fair">Fair</option>
                    </select>
                  </div>
                </div>

                {aiPriceSuggestion && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="font-bold text-gray-900">AI Price Suggestion</div>
                    <div className="text-sm text-gray-700 mt-2">Suggested: <span className="font-black">Rs. {aiPriceSuggestion.suggestedPrice}</span></div>
                    <button type="button" onClick={() => setFormData((prev) => ({ ...prev, price: String(aiPriceSuggestion.suggestedPrice) }))} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-lg">
                      Use This Price
                    </button>
                  </div>
                )}

                <div className="border rounded-xl p-4 bg-gray-50">
                  <h3 className="font-bold text-gray-900 mb-3">Education Details</h3>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Book Category *</label>
                  <select name="bookCategory" value={formData.bookCategory} onChange={handleChange} className={`w-full rounded-lg py-2.5 px-3 ${errors.bookCategory ? 'border-red-400' : 'border-gray-300'}`}>
                    <option value="">Select a category</option>
                    <optgroup label="School Books">{CATEGORY_OPTIONS.filter((c) => c.group === 'school').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
                    <optgroup label="University">{CATEGORY_OPTIONS.filter((c) => c.group === 'university').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
                    <optgroup label="Popular Reads">{CATEGORY_OPTIONS.filter((c) => c.group === 'popular').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
                  </select>
                  {errors.bookCategory && <p className="text-xs text-red-600 mt-1">{errors.bookCategory}</p>}

                  {isSchoolCategory && (
                    <div className="mt-3">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Grade Level</label>
                      <input type="text" value={selectedCategoryMeta?.gradeLabel || ''} readOnly className="w-full border-gray-300 rounded-lg py-2.5 px-3 bg-gray-100" />
                    </div>
                  )}

                  {isUniversityCategory && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">University</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin size={18} className="text-gray-400" /></div>
                          <input type="text" name="university" value={formData.university} onChange={handleChange} className={`pl-9 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 bg-gray-50 ${errors.university ? 'border-red-400' : 'border-gray-300'}`} placeholder="e.g. FAST" />
                        </div>
                        {errors.university && <p className="text-xs text-red-600 mt-1">{errors.university}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Course Code</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><BookOpen size={18} className="text-gray-400" /></div>
                          <input type="text" name="course" value={formData.course} onChange={handleChange} className={`pl-9 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 bg-gray-50 ${errors.course ? 'border-red-400' : 'border-gray-300'}`} placeholder="e.g. CS-101" />
                        </div>
                        {errors.course && <p className="text-xs text-red-600 mt-1">{errors.course}</p>}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-3">
                    {(isSchoolCategory || isUniversityCategory) && <input name="subject" placeholder="Subject/Course name" value={formData.subject} onChange={handleChange} className="w-full border-gray-300 rounded-lg py-2.5 px-3" />}
                    {isSchoolCategory && (
                      <select name="board" value={formData.board} onChange={handleChange} className="w-full border-gray-300 rounded-lg py-2.5 px-3">
                        <option value="">Board</option><option>Punjab</option><option>Federal</option><option>Cambridge</option><option>Other</option>
                      </select>
                    )}
                    {isUniversityCategory && <input name="semester" type="number" min="1" max="12" placeholder="Semester (optional)" value={formData.semester} onChange={handleChange} className="w-full border-gray-300 rounded-lg py-2.5 px-3" />}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
                  <textarea name="description" rows="5" maxLength={500} value={formData.description} onChange={handleChange} className={`block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 px-4 bg-gray-50 ${errors.description ? 'border-red-400' : 'border-gray-300'}`} placeholder={descriptionPlaceholder} />
                  <div className="mt-1 flex justify-between">{errors.description ? <p className="text-xs text-red-600">{errors.description}</p> : <span />}{<p className="text-xs text-gray-500">{formData.description.length} / 500 characters</p>}</div>
                </div>

                <div>
                  <input name="tags" value={formData.tags} onChange={handleChange} placeholder="Tags (comma separated): calculus, grade10, matric" className="w-full border-gray-300 rounded-lg py-2.5 px-3" />
                  <p className="text-xs text-gray-500 mt-1">Tags help buyers find your book. Add relevant keywords.</p>
                  {suggestedTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestedTags.map((tag) => <button key={tag} type="button" onClick={() => addTagChip(tag)} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">+ {tag}</button>)}
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 text-yellow-800 text-sm">
                  <AlertCircle size={20} className="flex-shrink-0 text-yellow-600" />
                  <p><strong>Platform Fee:</strong> When your book sells, BookBazaar deducts a 10% commission fee from the final sale price automatically.</p>
                </div>
              </div>
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-24 border border-gray-200 rounded-2xl p-5 bg-gray-50">
                <h3 className="font-bold text-gray-900 mb-4">Live Preview</h3>
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="w-full h-44 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {imagePreview ? <img src={imagePreview} alt="Book preview" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">Cover preview</span>}
                  </div>
                  <h4 className="font-bold text-gray-900 mt-3 line-clamp-2">{formData.title || 'Book title'}</h4>
                  <p className="text-sm text-gray-500 line-clamp-1">{formData.author || 'Author name'}</p>
                  <p className="text-sm mt-1 font-semibold text-gray-900">Rs. {formData.price || '0'}</p>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3">{formData.description || 'Description preview appears here...'}</p>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 cursor-pointer mr-4 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button
              type="button"
              onClick={() => { localStorage.setItem('bookbazaar_add_book_draft', JSON.stringify({ ...formData, image: null })); toast.success('Draft saved'); }}
              className="px-6 py-3 cursor-pointer mr-4 text-blue-700 font-medium border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Save as Draft
            </button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2">
              {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Publishing...</> : 'List Book For Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBook;
