import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import SEO from '../components/common/SEO';
import api from '../services/api';
import SmartSearchBar from '../components/search/SmartSearchBar';
import AIRecommendations from '../components/recommendations/AIRecommendations';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [personalized, setPersonalized] = useState([]);
  const [recommendReason, setRecommendReason] = useState('');
  const [recommendProfile, setRecommendProfile] = useState(null);
  const [recommendSubjects, setRecommendSubjects] = useState([]);
  const [recommendNextGrade, setRecommendNextGrade] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    condition: '',
    university: '',
    minPrice: '',
    maxPrice: ''
  });

  const fetchBooks = async (overrideSearchTerm, page = currentPage, overrideCategory = selectedCategory) => {
    setLoading(true);
    try {
      const effectiveSearchTerm =
        typeof overrideSearchTerm === 'string' ? overrideSearchTerm : searchTerm;

      // Build query string based on filters
      const params = new URLSearchParams();
      if (effectiveSearchTerm) params.append('search', effectiveSearchTerm);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.university) params.append('university', filters.university);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (overrideCategory) params.append('category', overrideCategory);
      params.append('page', String(page));
      params.append('limit', '9');

      const res = await api.get(`/books?${params.toString()}`);
      if (res.data.success) {
        const booksPayload = res.data.data?.books || res.data.data?.docs || [];
        setBooks(Array.isArray(booksPayload) ? booksPayload : []);
        setCurrentPage(Number(res.data.data?.page || page));
        setTotalPages(Number(res.data.data?.pages || 1));
        setTotalBooks(Number(res.data.data?.total || booksPayload.length || 0));
      }
    } catch (err) {
      console.error('Failed to fetch books', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const pageFromUrl = Number(searchParams.get('page') || 1);
    setSearchTerm(urlSearch);
    setSelectedCategory(urlCategory);
    setCurrentPage(pageFromUrl > 0 ? pageFromUrl : 1);
    void fetchBooks(urlSearch, pageFromUrl > 0 ? pageFromUrl : 1, urlCategory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await api.get('/recommendations');
        if (res.data?.success) {
          setPersonalized(res.data.books || []);
          setRecommendReason(res.data.reason || '');
          setRecommendProfile(res.data.profile || null);
          setRecommendSubjects(res.data.subjects || []);
          setRecommendNextGrade(res.data.nextGrade || null);
        }
      } catch {
        setPersonalized([]);
      }
    };
    void fetchRecommendations();
  }, [isAuthenticated]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    setCurrentPage(1);
    void fetchBooks(undefined, 1);
    setShowMobileFilters(false);
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    void fetchBooks(undefined, page);
  };

  return (
    <div>
      <SEO 
        title="Buy & Sell Second-Hand Books" 
        description="Find affordable used textbooks and academic materials at BookBazaar. Sell your old books safely and easily."
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl shadow-xl p-8 md:p-16 mb-12 text-center text-white relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            The Smart Way to Buy & Sell Used Textbooks
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 font-light">
            Save money on course materials. Trade directly with students on your campus.
          </p>
          
          <SmartSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSearch={(q) => {
              setSearchTerm(q);
              setCurrentPage(1);
              void fetchBooks(q, 1);
            }}
          />
        </div>
        
        {/* Decorative background vectors */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
      </section>

      <AIRecommendations />

      <div className="mb-4 md:hidden">
        <button
          type="button"
          onClick={() => setShowMobileFilters((prev) => !prev)}
          className="w-full inline-flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-lg py-2.5 font-semibold text-gray-700"
        >
          <Filter size={16} />
          {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className={`w-full md:w-64 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 sticky top-24">
            <div className="flex items-center gap-2 font-bold text-gray-800 mb-6 border-b pb-4">
              <Filter size={18} className="text-blue-600" />
              <h3>Filters</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                <select 
                  name="condition" 
                  value={filters.condition}
                  onChange={handleFilterChange}
                  className="w-full border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-3 text-sm"
                >
                  <option value="">All Conditions</option>
                  <option value="New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair / Acceptable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">University / Campus</label>
                <input 
                  type="text" 
                  name="university"
                  value={filters.university}
                  onChange={handleFilterChange}
                  placeholder="e.g. FAST NUCES"
                  className="w-full border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    name="minPrice"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={handleFilterChange}
                    className="w-full border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="number" 
                    name="maxPrice"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={handleFilterChange}
                    className="w-full border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <button 
                onClick={applyFilters}
                className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm mt-4"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content - Book Grid */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {searchTerm || Object.values(filters).some(x => x) ? 'Search Results' : 'Featured Books'}
            </h2>
            <span className="text-gray-500 text-sm font-medium">{totalBooks} items found</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="pt-4 flex justify-between items-center">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {books.map((book) => (
                 <div key={book._id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group">
                   <Link to={`/book/${book._id}`} className="block relative overflow-hidden aspect-[3/4]">
                     <img 
                       src={book.image} 
                       alt={book.title} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                     />
                     <div className="absolute top-2 right-2">
                       <span className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm text-white ${
                         book.condition === 'New' ? 'bg-green-500' : 
                         book.condition === 'Good' ? 'bg-blue-500' : 'bg-orange-500'
                       }`}>
                         {book.condition}
                       </span>
                     </div>
                   </Link>
                   
                   <div className="p-4 flex flex-col flex-grow">
                     <Link to={`/book/${book._id}`}>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{book.title}</h3>
                     </Link>
                     <p className="text-sm text-gray-500 mb-4">{book.author}</p>
                     
                     <div className="mt-auto flex items-center justify-between border-t pt-3">
                       <span className="font-bold text-lg text-gray-900">Rs. {book.price}</span>
                       <span className="text-xs font-medium text-gray-400 max-w-[50%] truncate">
                         {book.university || 'General'}
                       </span>
                     </div>
                   </div>
                 </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-gray-400 mb-4">
                <Search size={48} className="mx-auto opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-gray-700">No books found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your filters or search terms.</p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilters({ condition: '', university: '', minPrice: '', maxPrice: '' });
                  setCurrentPage(1);
                  void fetchBooks('', 1);
                }}
                className="mt-6 text-blue-600 font-medium hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          )}
          
          {/* Real Pagination */}
          {!loading && books.length > 0 && (
            <div className="mt-10 flex justify-center">
              <nav className="flex items-center gap-1 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                        p === currentPage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          )}

          <div className="mt-12 space-y-8">
            <section className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">
                  Recommended For You
                </h3>
                <Link to="/books" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</Link>
              </div>
              {!isAuthenticated && <p className="text-sm text-gray-600 mb-3">Sign in to get personalized recommendations.</p>}
              <div className="flex gap-4 overflow-x-auto pb-2">
                {(isAuthenticated ? personalized.slice(0, 8) : books.slice(0, 8)).map((book) => (
                  <Link key={book._id} to={`/book/${book._id}`} className="min-w-[220px] max-w-[220px] border rounded-lg p-3 hover:shadow">
                    <img src={book.image} alt={book.title} className="w-full h-32 object-cover rounded" />
                    <div className="mt-2 font-semibold line-clamp-1">{book.title}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{book.author}</div>
                    <div className="text-sm font-bold mt-1">Rs. {book.price}</div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
