// Location: src/components/GoogleReviews.jsx

import { useState, useEffect } from 'react';

export default function GoogleReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const endpoint = import.meta.env.PUBLIC_GOOGLE_REVIEWS_ENDPOINT;

        if (!endpoint) {
          throw new Error("Google Reviews endpoint is not configured.");
        }

        const res = await fetch(endpoint);
        if (!res.ok) {
          throw new Error('Failed to fetch reviews');
        }

        // ✅ THE FIX IS HERE:
        // With a direct Lambda Function URL, `res.json()` already gives us the final data.
        // We no longer need to do the extra `JSON.parse(data.body)`.
        const reviewsData = await res.json();

        // Now we can use `reviewsData` directly.
        setReviews(reviewsData.reviews || []);

      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError(`Unable to load reviews at this time. ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const loadMore = () => {
    setVisibleCount((prev) => prev + 4);
  };

  // --- No changes are needed below this line ---

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
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-4">
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
                <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-600 mb-4">{review.text}</p>
          </div>
        ))}
      </div>
      {visibleCount < reviews.length && (
        <div className="text-center mt-8">
          <button onClick={loadMore} className="inline-flex items-center px-6 py-3 border border-primary-600 text-primary-600 font-medium rounded-md hover:bg-primary-50 transition-colors duration-200">
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
}
