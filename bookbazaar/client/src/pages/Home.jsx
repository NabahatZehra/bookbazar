import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import SEO from '../components/common/SEO';
import api from '../services/api';

const Home = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    condition: '',
    university: '',
    minPrice: '',
    maxPrice: ''
  });

  const fetchBooks = async () => {
    setLoading(true);
    try {
      // Build query string based on filters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.university) params.append('university', filters.university);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

      const res = await api.get(`/books?${params.toString()}`);
      if (res.data.success) {
        setBooks(res.data.data.docs || res.data.data); // Adjust based on pagination setup
      }
    } catch (err) {
      console.error('Failed to fetch books', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks();
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
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
          
          <form onSubmit={handleSearch} className="flex bg-white rounded-full shadow-lg p-1.5 md:p-2 max-w-2xl mx-auto items-center transition-all focus-within:ring-4 focus-within:ring-blue-500/30">
            <input 
              type="text" 
              placeholder="Search by title, author, or ISBN..." 
              className="flex-grow px-4 md:px-6 py-3 text-gray-800 bg-transparent focus:outline-none placeholder-gray-400 text-sm md:text-base font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 md:py-3.5 font-medium flex items-center gap-2 transition-colors">
              <Search size={18} />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>
        
        {/* Decorative background vectors */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
      </section>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0">
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
                onClick={fetchBooks}
                className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm mt-4"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content - Book Grid */}
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {searchTerm || Object.values(filters).some(x => x) ? 'Search Results' : 'Featured Books'}
            </h2>
            <span className="text-gray-500 text-sm font-medium">{books.length} items found</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  fetchBooks();
                }}
                className="mt-6 text-blue-600 font-medium hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          )}
          
          {/* Mock Pagination */}
          {!loading && books.length > 0 && (
            <div className="mt-10 flex justify-center">
              <nav className="flex items-center gap-1">
                <button className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50 text-gray-500 disabled:opacity-50">Previous</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold shadow-sm">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border text-gray-600 hover:bg-gray-50 text-sm font-medium">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border text-gray-600 hover:bg-gray-50 text-sm font-medium">3</button>
                <button className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50 text-gray-700">Next</button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
