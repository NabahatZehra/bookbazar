import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Check, Star, MessageSquare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';

const OrderTracking = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (err) {
      toast.error('Could not load order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading order tracker...</div>;
  if (!order) return <div className="p-12 text-center text-red-500 font-bold">Order not found</div>;

  const sellerId = order.sellerId?._id || order.sellerId;
  const buyerId = order.buyerId?._id || order.buyerId;
  const isSeller = Boolean(user?._id && sellerId && user._id.toString() === sellerId.toString());
  const isBuyer = Boolean(user?._id && buyerId && user._id.toString() === buyerId.toString());

  // Visual Stepper Logic
  const steps = [
    { label: 'Order Placed', statusKey: 'Pending', stepDate: order.createdAt },
    { label: 'Payment Confirmed', statusKey: 'Paid', stepDate: order.paymentStatus === 'Paid' ? order.updatedAt : null },
    { label: 'Processing', statusKey: 'Processing', stepDate: order.orderStatus === 'Processing' || order.orderStatus === 'Completed' ? order.updatedAt : null },
    { label: 'Completed', statusKey: 'Completed', stepDate: order.orderStatus === 'Completed' ? order.updatedAt : null }
  ];

  let currentStepIndex = 0;
  if (order.orderStatus === 'Pending' && order.paymentStatus === 'Paid') currentStepIndex = 1;
  if (order.orderStatus === 'Processing') currentStepIndex = 2;
  if (order.orderStatus === 'Completed') currentStepIndex = 3;

  const handleCompleteOrder = async () => {
    try {
      setLoading(true);
      const res = await api.put(`/orders/${id}/complete`);
      if (res.data.success) {
        toast.success('Order marked as completed');
        setOrder(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to complete order');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewSubmitting) return;
    try {
      setReviewSubmitting(true);
      const res = await api.post(`/orders/${id}/review`, {
        rating,
        comment: comment.trim(),
      });
      if (res.data.success) {
        toast.success('Review submitted successfully');
        setReviewOpen(false);
      } else {
        toast.error(res.data.message || 'Failed to submit review');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 lg:px-4 space-y-8">
      <Helmet><title>Order Tracking - BookBazaar</title></Helmet>

      <div>
         <h1 className="text-2xl font-extrabold text-gray-900">Tracking: #{order._id.substring(0, 8)}...</h1>
         <p className="text-gray-500 mt-1 flex items-center gap-2">Placed on {new Date(order.createdAt).toLocaleString()}</p>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
         <div className="relative">
            {/* Connecting Line Backdrop */}
            <div className="absolute top-6 left-12 right-12 h-1 bg-gray-200" />
            
            {/* Active Line (Calculated Width) */}
            <div className={`absolute top-6 left-12 h-1 bg-blue-500 transition-all duration-700`} style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }} />

            <div className="flex justify-between relative z-10 w-full">
              {steps.map((step, idx) => {
                 const isCompleted = idx <= currentStepIndex;
                 const isActive = idx === currentStepIndex;
                 return (
                   <div key={idx} className="flex flex-col items-center flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-md transition-colors ${isCompleted ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                         {isCompleted ? <Check size={20} strokeWidth={3} /> : (idx + 1)}
                      </div>
                      <p className={`font-bold text-sm text-center ${isActive ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                      {step.stepDate && <p className="text-[10px] text-gray-500 mt-1">{new Date(step.stepDate).toLocaleDateString()}</p>}
                   </div>
                 )
              })}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Book Reference */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex gap-6">
            <img src={order.bookId?.image} alt={order.bookId?.title} className="w-24 h-36 object-cover rounded shadow-sm border border-gray-200" />
            <div className="flex flex-col justify-between">
               <div>
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-2">{order.bookId?.title}</h3>
                  <p className="text-sm font-medium text-gray-600">Amount Paid: <span className="font-bold text-gray-900 ml-1">Rs. {Number(order.price || 0).toLocaleString()}</span></p>
                  <p className="text-xs text-gray-500 mt-1">
                    Platform fee portion: Rs. {Number(order.commissionAmount || 0).toLocaleString()}
                  </p>
               </div>
               
               {/* Completed State Actions */}
               {order.orderStatus === 'Processing' && isSeller && (
                 <button
                   onClick={handleCompleteOrder}
                   className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex justify-center items-center gap-2 mt-4 transition-colors"
                 >
                   <Star size={16} className="rotate-[-8deg]" /> Mark as Completed
                 </button>
               )}

               {order.orderStatus === 'Completed' && isBuyer && (
                 <div className="mt-4">
                   {!reviewOpen ? (
                     <button
                       onClick={() => setReviewOpen(true)}
                       className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 px-4 rounded-lg flex justify-center items-center gap-2 w-full transition-colors"
                     >
                       <Star size={16} fill="currentColor" /> Leave Review
                     </button>
                   ) : (
                     <form onSubmit={handleSubmitReview} className="bg-white border border-yellow-100 rounded-xl p-4 space-y-3">
                       <div className="flex items-center justify-between gap-3">
                         <p className="text-sm font-bold text-gray-900">Your Rating</p>
                         <span className="text-sm font-bold text-yellow-700">{rating}/5</span>
                       </div>
                       <input
                         type="range"
                         min="1"
                         max="5"
                         step="1"
                         value={rating}
                         onChange={(e) => setRating(Number(e.target.value))}
                         className="w-full"
                       />
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Review (optional)</label>
                         <textarea
                           value={comment}
                           onChange={(e) => setComment(e.target.value)}
                           rows="4"
                           className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300"
                           placeholder="Share how the handover went, book condition, etc."
                         />
                       </div>
                       <div className="flex gap-3">
                         <button
                           type="button"
                           onClick={() => setReviewOpen(false)}
                           className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
                         >
                           Cancel
                         </button>
                         <button
                           type="submit"
                           disabled={reviewSubmitting}
                           className="flex-1 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                         </button>
                       </div>
                     </form>
                   )}
                 </div>
               )}
            </div>
         </div>

         {/* Seller Contact */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
            <h3 className="font-bold text-gray-900 mb-2">Need Help with this Order?</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">Contact the seller directly to coordinate physical handover or clarify details.</p>
            <Link
              to={`/chat/${sellerId}`}
              className="bg-blue-50 text-blue-700 border border-blue-200 font-bold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-blue-100 transition-colors w-full justify-center"
            >
               <MessageSquare size={18} /> Message Seller
            </Link>
         </div>
      </div>

    </div>
  );
};
export default OrderTracking;
