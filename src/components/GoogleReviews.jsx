import { useState, useEffect } from 'preact/hooks';

export default function GoogleReviews() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch('https://1w17daqib0.execute-api.us-east-1.amazonaws.com/prod')
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews || []))
      .catch((err) => {
        console.error('Failed to fetch reviews:', err);
        setReviews([]);
      });
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {reviews.map((review, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <img
                src={review.profile_photo_url}
                alt={review.author_name}
                className="rounded-full h-10 w-10"
              />
              <div>
                <h3 className="text-lg font-semibold">{review.author_name}</h3>
                <p className="text-sm text-gray-500">{review.relative_time_description}</p>
              </div>
            </div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <p className="text-gray-700">"{review.text}"</p>
        </div>
      ))}
    </div>
  );
}

