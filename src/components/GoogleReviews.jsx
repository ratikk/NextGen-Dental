import { useState, useEffect } from 'react';

export default function GoogleReviews({ apiUrl }) {
  const [reviews, setReviews] = useState([]);
  const [overallRating, setOverallRating] = useState(null);
  const [totalRatings, setTotalRatings] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data.reviews || []);
      setOverallRating(data.overallRating || null);
      setTotalRatings(data.totalRatings || null);
      setAiSummary(data.aiSummary || null);
      setLoading(false);
    } catch (err) {
      console.error('Review Fetch Error:', err);
      setError('Unable to load reviews at this time. Please try again later.');
      setLoading(false);
    }
  };

  const loadMore = () => setVisibleCount(prev => prev + 4);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No reviews available at this time.</p>
      </div>
    );
  }

  return (
    <div>

      {/* ── AI Summary Block ── */}
      {aiSummary && (
        <div className="mb-10 bg-primary-50 border border-primary-100 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6 shadow-sm">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-primary-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                AI Insights
              </span>
              <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                What Patients Are Saying
              </h3>
            </div>
            <p className="text-gray-600 leading-relaxed italic text-base">
              "{aiSummary}"
            </p>
          </div>

          {/* Decorative circle icon */}
          <div className="hidden sm:flex items-center justify-center w-28 h-28 rounded-full bg-primary-100 text-primary-200 flex-shrink-0 self-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm0 15a1 1 0 110-2 1 1 0 010 2zm1-4.5V13a1 1 0 01-2 0v-1c0-.552.448-1 1-1 .827 0 1.5-.673 1.5-1.5S12.827 8 12 8s-1.5.673-1.5 1.5a1 1 0 01-2 0C8.5 7.57 10.07 6 12 6s3.5 1.57 3.5 3.5c0 1.653-1.148 3.033-2.5 3.5z"/>
            </svg>
          </div>
        </div>
      )}

      {/* ── Review Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {reviews.slice(0, visibleCount).map((review, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center mb-4">
              {review.profile_photo_url ? (
                <img
                  src={review.profile_photo_url}
                  alt={review.author_name}
                  className="w-12 h-12 rounded-full mr-4"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-4 font-bold text-lg">
                  {review.author_name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-800">{review.author_name}</h3>
                <p className="text-sm text-gray-500">{review.relative_time_description}</p>
              </div>
            </div>

            <div className="flex mb-3">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <p className="text-gray-600 mb-4">{review.text}</p>

            <a
              href={review.author_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center"
            >
              View on Google
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ))}
      </div>

      {/* ── Load More ── */}
      {visibleCount < reviews.length && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            className="inline-flex items-center px-6 py-3 border border-primary-600 text-primary-600 font-medium rounded-md hover:bg-primary-50 transition-colors duration-200"
          >
            Load More Reviews
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

