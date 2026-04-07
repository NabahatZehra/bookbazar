import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const AdminBookForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEdit);

  const [formData, setFormData] = useState({
    title: '', author: '', price: '', condition: 'New', description: '',
    university: '', course: '', status: 'available', image: '',
    seoTitle: '', seoDescription: '', seoKeywords: '', canonicalUrl: '', ogImage: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const fetchBookData = useCallback(async () => {
    try {
      const { data } = await api.get(`/books/${id}`);
      if (data.success) {
        setFormData({
          title: data.data.title || '',
          author: data.data.author || '',
          price: data.data.price || '',
          condition: data.data.condition || 'New',
          description: data.data.description || '',
          university: data.data.university || '',
          course: data.data.course || '',
          status: data.data.status || 'available',
          image: data.data.image || '',
          seoTitle: data.data.seoTitle || '',
          seoDescription: data.data.seoDescription || '',
          seoKeywords: data.data.seoKeywords || '',
          canonicalUrl: data.data.canonicalUrl || '',
          ogImage: data.data.ogImage || ''
        });
        setImagePreview(data.data.image);
      } else {
        toast.error('Failed to load book data');
      }
    } catch (error) {
      toast.error('Error loading book data');
    } finally {
      setInitLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchBookData();
  }, [fetchBookData, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => submitData.append(key, formData[key]));
      if (imageFile) submitData.append('image', imageFile);

      const res = isEdit
        ? await api.put(`/admin/books/${id}`, submitData)
        : await api.post('/admin/books', submitData);

      const data = res.data;

      if (data.success) {
        toast.success(isEdit ? 'Book updated!' : 'Book created!');
        navigate('/admin/books');
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Helmet>
        <title>{isEdit ? 'Edit Book' : 'Add New Book'} - Admin</title>
      </Helmet>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Book' : 'Add New Book'}</h1>
        <Link to="/admin/books" className="text-gray-500 hover:text-gray-900 font-medium">← Back to listing</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
          {/* Image Upload */}
          <div className="w-full md:w-1/3 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Cover Image</h2>
            <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 relative group">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 font-medium">Upload Cover</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <span className="text-white font-medium">Click to change</span>
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            {/* Fallback image URL input if file upload fails */}
            {isEdit && !imageFile && (
              <input 
                type="text" 
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="Or paste image URL"
                className="w-full p-2 border rounded text-xs text-gray-500"
              />
            )}
          </div>

          {/* Form Fields */}
          <div className="w-full md:w-2/3 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Core Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input required type="text" name="author" value={formData.author} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input required type="number" min="0" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select name="condition" value={formData.condition} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                <input type="text" name="university" value={formData.university} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                <input type="text" name="course" value={formData.course} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea required rows="4" name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
            </div>
            
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-1/3 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* SEO Section */}
        <details className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
          <summary className="p-6 cursor-pointer bg-gray-50/50 hover:bg-gray-50 font-semibold text-gray-800 list-none flex justify-between items-center group-open:border-b">
            SEO & Meta Details
            <span className="text-emerald-600 text-xl font-light transform transition-transform group-open:rotate-180">↓</span>
          </summary>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between">
                   <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                   <span className="text-xs text-gray-400">{formData.seoTitle.length}/60</span>
                </div>
                <input type="text" name="seoTitle" value={formData.seoTitle} onChange={handleChange} maxLength={60} className="w-full p-2 border border-gray-300 rounded outline-none focus:border-emerald-500" placeholder="e.g. Buy Introduction to Physics - Used Book"/>
              </div>

              <div>
                <div className="flex justify-between">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                   <span className="text-xs text-gray-400">{formData.seoDescription.length}/160</span>
                </div>
                <textarea rows="3" name="seoDescription" value={formData.seoDescription} onChange={handleChange} maxLength={160} className="w-full p-2 border border-gray-300 rounded outline-none focus:border-emerald-500" placeholder="Brief summary of the book for search engines..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input type="text" name="seoKeywords" value={formData.seoKeywords} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded outline-none focus:border-emerald-500" placeholder="physics, used books, college, science"/>
                <p className="text-xs text-gray-400 mt-1">Comma separated list</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
                <input type="url" name="canonicalUrl" value={formData.canonicalUrl} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded outline-none focus:border-emerald-500" placeholder="https://bookbazaar.com/books/123"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
                <input type="url" name="ogImage" value={formData.ogImage} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded outline-none focus:border-emerald-500" placeholder="https://example.com/og-image.jpg"/>
              </div>
            </div>

            {/* Live SEO Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 mb-2">Live SEO Preview</h3>
              <div className="bg-white p-4 border rounded-lg shadow-sm">
                <span className="text-sm font-medium text-[#1a0dab] block hover:underline cursor-pointer truncate">
                  {formData.seoTitle || formData.title || 'Book Title Example for Google'}
                </span>
                <span className="text-xs text-[#006621] block mt-1 truncate">
                  {formData.canonicalUrl || `https://bookbazaar.com/books/${id || 'preview'}`}
                </span>
                <p className="text-sm text-[#545454] mt-1 break-words line-clamp-2">
                  {formData.seoDescription || formData.description || 'This is how your book listing will appear in Google search results. Add a compelling description to attract more buyers.'}
                </p>
              </div>

               <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                   💡 Pro Tip
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  Using customized SEO Titles and Meta Descriptions greatly increases the Click-Through Rate (CTR) from Google search pages!
                </p>
              </div>
            </div>
          </div>
        </details>

        <div className="flex justify-end gap-4 mt-8">
          <Link to="/admin/books" className="px-6 py-2 border rounded-lg hover:bg-gray-50 font-medium">Cancel</Link>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
            {loading ? 'Saving...' : (isEdit ? 'Update Book' : 'Publish Book')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminBookForm;
