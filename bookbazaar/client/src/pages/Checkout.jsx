import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import SEO from '../components/common/SEO';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Lock, CreditCard } from 'lucide-react';
import PropTypes from 'prop-types';

// Stripe setup
// In development, this key should come from .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_dummy_key');

const CheckoutForm = ({ clientSecret, orderId, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true); // Toggle for real stripe vs demo bypass

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (demoMode) {
      // Demo bypass logic (skips real stripe validation)
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 1500)); // simulate network
        const res = await api.post('/orders/confirm', { 
          orderId, 
          paymentIntentId: 'pi_demo_success_' + Date.now() 
        });
        
        if (res.data.success) {
          toast.success('Payment successful! (Demo Mode)');
          clearCart();
          navigate('/dashboard'); // or order confirmation page
        }
      } catch (err) {
        toast.error('Payment confirmation failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Real Stripe logic
    if (!stripe || !elements) return;

    setLoading(true);
    const cardElement = elements.getElement(CardElement);
    
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        toast.error(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        const res = await api.post('/orders/confirm', { 
          orderId, 
          paymentIntentId: paymentIntent.id 
        });
        
        if (res.data.success) {
          toast.success('Payment successful!');
          clearCart();
          navigate('/dashboard');
        }
      }
    } catch (err) {
      toast.error('Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center">
        <div>
          <span className="text-sm font-bold text-blue-800">Test / Demo Mode</span>
          <p className="text-xs text-blue-600 mt-1">Bypass actual Stripe network calls</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={demoMode} onChange={() => setDemoMode(!demoMode)} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className={`space-y-4 ${demoMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="block text-sm font-medium text-gray-700">Card Information</label>
        <div className="p-4 border border-gray-300 rounded-lg bg-white shadow-sm">
          <CardElement options={{
            style: {
               base: {
                 fontSize: '16px',
                 color: '#424770',
                 '::placeholder': { color: '#aab7c4' },
               },
               invalid: { color: '#9e2146' },
            }
          }} />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={(!stripe && !demoMode) || loading}
        className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-all flex justify-center items-center gap-2 disabled:bg-gray-400"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <Lock size={18} />
            Pay Rs. {amount.toLocaleString()}
          </>
        )}
      </button>
    </form>
  );
};

CheckoutForm.propTypes = {
  clientSecret: PropTypes.string.isRequired,
  orderId: PropTypes.string.isRequired,
  amount: PropTypes.number.isRequired
};

const Checkout = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [clientSecret, setClientSecret] = useState('');
  const [orderIds, setOrderIds] = useState([]); // Array to hold IDs if multiple, but backend expects 1 book/order currently.
  const [initializing, setInitializing] = useState(true);

  // We need to place an order to get the clientSecret.
  // BookBazaar backend's /api/orders currently expects a single bookId.
  // For standard checkout with multiple items, we'll process the first one for demonstration,
  // or loop through them. Let's process the first book in the cart for this implementation.
  const bookToCheckout = cart[0]; 

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (cart.length === 0) {
      navigate('/cart');
      return;
    }

    if (cart.length > 1) {
       toast.error('BookBazaar currently supports checkout for one book at a time. Checking out first item.', { duration: 5000 });
    }

    const initCheckout = async () => {
      try {
        const res = await api.post('/orders', { bookId: bookToCheckout._id });
        if (res.data.success) {
          setClientSecret(res.data.data.clientSecret);
          setOrderIds([res.data.data.orderId]);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to initialize checkout');
        navigate('/cart');
      } finally {
         setInitializing(false);
      }
    };

    initCheckout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platformFee = bookToCheckout ? bookToCheckout.price * 0.10 : 0;
  const grandTotal = bookToCheckout ? bookToCheckout.price + platformFee : 0;

  if (initializing) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Preparing checkout...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 lg:px-8">
       <SEO title="Secure Checkout" description="Complete your BookBazaar purchase securely." />
       
       <h1 className="text-3xl font-extrabold text-gray-900 mb-8 px-4 lg:px-0 flex items-center gap-3">
         <CreditCard className="text-blue-600" />
         Checkout
       </h1>

       <div className="flex flex-col lg:flex-row gap-8 px-4 lg:px-0">
          
          {/* Payment Form side */}
          <div className="flex-1 order-2 lg:order-1">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
               <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Details</h2>
               <p className="text-gray-500 text-sm mb-6">Complete your purchase safely and securely.</p>
               
               {clientSecret && (
                 <Elements stripe={stripePromise} options={{ clientSecret }}>
                   <CheckoutForm clientSecret={clientSecret} orderId={orderIds[0]} amount={grandTotal} />
                 </Elements>
               )}
             </div>
          </div>

          {/* Order Summary Side */}
          <div className="w-full lg:w-96 flex-shrink-0 order-1 lg:order-2">
            <div className="bg-gray-50 rounded-2xl shadow-inner border border-gray-200 p-6 sticky top-24">
               <h3 className="font-bold text-gray-900 mb-6">Order Summary</h3>
               
               {bookToCheckout && (
                 <div className="flex gap-4 mb-6 pb-6 border-b border-gray-200">
                    <img src={bookToCheckout.image} alt={bookToCheckout.title} className="w-16 h-24 object-cover rounded shadow-sm" />
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-2">{bookToCheckout.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{bookToCheckout.author}</p>
                      <p className="text-sm font-black text-gray-900 mt-2">Rs. {bookToCheckout.price}</p>
                    </div>
                 </div>
               )}

               <div className="space-y-3 text-sm">
                 <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>Rs. {bookToCheckout?.price.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-gray-600">
                    <span>Platform Fee</span>
                    <span>Rs. {platformFee.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-gray-900 font-bold text-lg pt-4 border-t border-gray-200 mt-4">
                    <span>Total due</span>
                    <span>Rs. {grandTotal.toLocaleString()}</span>
                 </div>
               </div>
            </div>
          </div>

       </div>
    </div>
  );
};

export default Checkout;
