import SEO from '../../components/common/SEO';

export default function Reports() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <SEO title="Reports" description="Admin reports and flagged content." />
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Reports & Flagged Content</h1>
      <p className="text-sm text-gray-600">No reports yet. Flagged books and users will appear here.</p>
    </div>
  );
}

