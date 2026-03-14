import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import SEO from '../components/common/SEO';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
      <SEO 
        title="404 - Page Not Found" 
        description="The page you are looking for does not exist on BookBazaar."
      />
      <div>
        <h1 className="text-9xl font-extrabold text-blue-600 mb-4 opacity-20">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Home size={20} />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
