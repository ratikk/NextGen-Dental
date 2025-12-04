import { useState, useEffect } from 'react';

export default function GoogleReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);

  // ✅ Read the variable we just set in .env
  const API_URL = import.meta.env.PUBLIC_GOOGLE_REVIEWS_ENDPOINT;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        if (!API_URL) {
          throw new Error("Google Reviews endpoint is not configured in .env");
        }

        const response = await fetch(API_URL);
        
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const data = await response.json();
        const reviewsList = data.reviews || [];
        
        setReviews(reviewsList);
        setLoading(false);
      } catch (err) {
        console.error("Review Fetch Error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const loadMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );

  if (error) return null; 
  if (!reviews || reviews.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.slice(0, visibleCount).map((review, index) => (
          <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={review.profile_photo_url} 
                alt={review.author_name} 
                className="w-10 h-10 rounded-full object-cover"
                loading="lazy"
              />
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{review.author_name}</h4>
                <div className="flex text-yellow-400 text-sm">
                  {'★'.repeat(Math.round(review.rating))}
                  <span className="text-gray-300">{'★'.repeat(5 - Math.round(review.rating))}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-600 text-sm italic mb-4 flex-grow line-clamp-4">"{review.text}"</p>
            <div className="mt-auto text-xs text-gray-400 font-medium">
              {review.relative_time_description}
            </div>
          </div>
        ))}
      </div>

      {visibleCount < reviews.length && (
        <div className="text-center mt-10">
          <button 
            onClick={loadMore} 
            className="inline-flex items-center px-8 py-3 border-2 border-primary-600 text-primary-600 font-bold rounded-full hover:bg-primary-600 hover:text-white transition-colors duration-300"
          >
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
}
