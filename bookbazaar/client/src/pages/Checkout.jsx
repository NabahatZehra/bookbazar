import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/common/SEO';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CreditCard, Lock } from 'lucide-react';

const COMMISSION_RATE = 0.1;

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [delivery, setDelivery] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const cityOptions = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Quetta', 'Multan', 'Hyderabad', 'Other'];

  const { subtotal, platformFee, youPay, itemsPayload } = useMemo(() => {
    const sub = cart.reduce((t, b) => t + Number(b.price), 0);
    const fee = sub * COMMISSION_RATE;
    const pay = sub;
    const items = cart.map((b) => ({
      bookId: b._id,
      price: Number(b.price),
    }));
    return {
      subtotal: sub,
      platformFee: fee,
      youPay: pay,
      itemsPayload: items,
    };
  }, [cart]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (cart.length === 0) {
      navigate('/cart');
      return;
    }
    setInitializing(false);
  }, [user, cart.length, navigate]);

  const handleMockCheckout = async () => {
    if (!itemsPayload.length) {
      toast.error('Your cart is empty');
      return;
    }

    const nextErrors = {};
    if (!delivery.fullName.trim()) nextErrors.fullName = 'Full name is required';
    if (!delivery.phone.trim()) nextErrors.phone = 'Phone number is required';
    else if (!/^03\d{2}-?\d{7}$/.test(delivery.phone.replace(/\s+/g, ''))) {
      nextErrors.phone = 'Use Pakistani format: 03XX-XXXXXXX';
    }
    if (!delivery.addressLine1.trim()) nextErrors.addressLine1 = 'Address is required';
    if (!delivery.city.trim()) nextErrors.city = 'City is required';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please complete required delivery details');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/orders/mock-checkout', {
        items: itemsPayload,
        totalPrice: youPay,
        paymentMethod: 'mock',
        deliveryInfo: {
          fullName: delivery.fullName.trim(),
          phone: delivery.phone.trim(),
          addressLine1: delivery.addressLine1.trim(),
          city: delivery.city.trim(),
          notes: delivery.notes.trim(),
        },
      });

      if (!res.data.success) {
        toast.error(res.data.message || 'Checkout failed');
        return;
      }

      const orderId = res.data.data?.orderId;
      const orderIds = res.data.data?.orderIds || [];

      try {
        await api.delete('/cart/clear');
      } catch {
        // cart clear is best-effort if endpoint fails
      }

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order/success/${orderId}`, { state: { orderIds } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing || !user || cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Preparing checkout...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 lg:px-8">
      <SEO title="Secure Checkout" description="Complete your BookBazaar purchase." />

      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 px-4 lg:px-0 flex items-center gap-3">
        <CreditCard className="text-blue-600" />
        Checkout
      </h1>

      <div className="flex flex-col lg:flex-row gap-8 px-4 lg:px-0">
        <div className="flex-1 order-2 lg:order-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Delivery Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={delivery.fullName}
                  onChange={(e) => setDelivery((p) => ({ ...p, fullName: e.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2.5 bg-gray-50 ${errors.fullName ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={delivery.phone}
                  onChange={(e) => setDelivery((p) => ({ ...p, phone: e.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2.5 bg-gray-50 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="03XX-XXXXXXX"
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                <select
                  value={delivery.city}
                  onChange={(e) => setDelivery((p) => ({ ...p, city: e.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2.5 bg-gray-50 ${errors.city ? 'border-red-400' : 'border-gray-200'}`}
                >
                  <option value="">Select city</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  value={delivery.addressLine1}
                  onChange={(e) => setDelivery((p) => ({ ...p, addressLine1: e.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2.5 bg-gray-50 ${errors.addressLine1 ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="House no, street, area"
                />
                {errors.addressLine1 && <p className="text-xs text-red-600 mt-1">{errors.addressLine1}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={delivery.notes}
                  onChange={(e) => setDelivery((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50"
                  placeholder="Any instructions for the seller..."
                />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">Mock payment (development)</h2>
            <p className="text-gray-500 text-sm mb-6">
              No card required. This places a real order in the database with payment status <strong>Paid</strong>.
            </p>

            {import.meta.env.DEV && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
                <Lock className="text-amber-700 shrink-0" size={20} />
                <p className="text-sm text-amber-900">
                  For live Stripe, configure <code className="bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> on the
                  server and use Payment Intents; this flow avoids payment API errors during local development.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleMockCheckout}
              disabled={submitting}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-all flex justify-center items-center gap-2 disabled:bg-gray-400"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={18} />
                  Place order — Rs. {youPay.toLocaleString()}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="w-full lg:w-96 flex-shrink-0 order-1 lg:order-2">
          <div className="bg-gray-50 rounded-2xl shadow-inner border border-gray-200 p-6 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-6">Order Summary</h3>

            <ul className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {cart.map((book) => (
                <li key={book._id} className="flex gap-3 text-sm">
                  <img src={book.image} alt="" className="w-12 h-16 object-cover rounded" />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 line-clamp-2">{book.title}</p>
                    <p className="text-gray-500">Rs. {Number(book.price).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-3 text-sm border-t border-gray-200 pt-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform fee (from seller payout)</span>
                <span>Rs. {platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-900 font-bold text-lg pt-3 border-t border-gray-200">
                <span>You pay</span>
                <span>Rs. {youPay.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Charged amount matches the cart total (listing prices). The fee is deducted from the seller&apos;s
              payout, not added to your charge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
