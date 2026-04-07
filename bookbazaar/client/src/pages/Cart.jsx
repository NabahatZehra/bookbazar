import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import SEO from '../components/common/SEO';

const Cart = () => {
  const { cart, removeFromCart } = useCart();
  const navigate = useNavigate();

  // Commission is 10%
  const commissionRate = 0.10;
  
  const calculateTotals = () => {
    const subtotal = cart.reduce((total, item) => total + item.price, 0);
    const platformFee = subtotal * commissionRate;
    return { subtotal, platformFee };
  };

  const { subtotal, platformFee } = calculateTotals();

  return (
    <div className="max-w-7xl mx-auto py-8 lg:px-8">
      <SEO 
        title="Your Cart" 
        description="Review your selected books before checkout securely on BookBazaar."
      />
      
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 px-4 lg:px-0">Shopping Cart</h1>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8 max-w-md">
            Looks like you haven&apos;t added any books yet. Explore our marketplace to find great deals on used textbooks.
          </p>
          <Link 
            to="/" 
            className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 px-4 lg:px-0">
          
          {/* Cart Items List */}
          <div className="flex-1 space-y-4">
            {cart.map((book) => (
              <div key={book._id} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 relative group">
                <Link to={`/book/${book._id}`} className="w-full sm:w-32 h-48 sm:h-auto flex-shrink-0 rounded-lg overflow-hidden border border-gray-100">
                  <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                </Link>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start pr-8 sm:pr-0">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 hover:text-blue-600 transition-colors">
                        <Link to={`/book/${book._id}`}>{book.title}</Link>
                      </h3>
                      <p className="text-sm text-gray-500 font-medium mb-3">{book.author}</p>
                    </div>
                    <div className="text-right whitespace-nowrap hidden sm:block">
                      <p className="text-xl font-black text-gray-900">Rs. {book.price.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold border border-gray-200">
                      Condition: {book.condition}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 font-medium flex items-center">
                      <ShieldCheck size={14} className="mr-1 text-blue-500" />
                      BookBazaar Protected
                    </span>
                  </div>

                  <div className="mt-auto flex justify-between items-center sm:border-t sm:pt-4 border-gray-100">
                    <div className="sm:hidden text-xl font-black text-gray-900">
                      Rs. {book.price.toLocaleString()}
                    </div>
                    <button 
                      onClick={() => removeFromCart(book._id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium ml-auto sm:ml-0"
                    >
                      <Trash2 size={16} /> 
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Order Summary</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-gray-600">
                   <p>Book Price ({cart.length} item{cart.length > 1 ? 's' : ''})</p>
                   <p className="font-medium">Rs. {subtotal.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                   <p className="flex items-center gap-1.5">
                     Platform fee (from seller)
                     <div className="group relative">
                        <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold cursor-help">?</span>
                        <div className="absolute bottom-full right-0 mb-2 w-52 bg-gray-900 text-white text-xs p-2 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                          This fee is deducted from the seller&apos;s payout. You are charged the book prices only (same as checkout).
                        </div>
                     </div>
                   </p>
                   <p className="font-medium">Rs. {platformFee.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-8">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-gray-900">You Pay</p>
                  <p className="text-2xl font-black text-blue-600">Rs. {subtotal.toLocaleString()}</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total charged at checkout = <strong>Rs. {subtotal.toLocaleString()}</strong> (subtotal only).
                </p>
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </button>
              
              <div className="mt-4 flex justify-center items-center gap-2 text-xs text-gray-500">
                <ShieldCheck size={16} className="text-green-500" />
                <span>Secure SSL encrypted payment</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Cart;
