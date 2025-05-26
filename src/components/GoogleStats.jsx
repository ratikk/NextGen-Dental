// GoogleStats.jsx
import { useEffect, useState } from 'preact/hooks';

export default function GoogleStats() {
  const [stats, setStats] = useState({ averageRating: 0, totalRatings: 0 });

  useEffect(() => {
    fetch('https://1w17daqib0.execute-api.us-east-1.amazonaws.com/prod')
      .then((res) => res.json())
      .then((data) => {
        setStats({
          averageRating: data.overallRating,
          totalRatings: data.totalRatings,
        });
      })
      .catch(console.error);
  }, []);

  return (
    <>
      <div class="bg-white p-6 rounded-lg shadow-md text-center">
        <div class="text-3xl font-bold text-primary-600 mb-2">{stats.averageRating}</div>
        <div class="text-neutral-600">Average Rating</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-md text-center">
        <div class="text-3xl font-bold text-primary-600 mb-2">{stats.totalRatings}</div>
        <div class="text-neutral-600">Total Reviews</div>
      </div>
    </>
  );
}

