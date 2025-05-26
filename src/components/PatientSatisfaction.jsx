import { useState, useEffect } from 'preact/hooks';

export default function PatientSatisfaction() {
  const [satisfaction, setSatisfaction] = useState("...");

  useEffect(() => {
    fetch('https://1w17daqib0.execute-api.us-east-1.amazonaws.com/prod')
      .then(res => res.json())
      .then(data => {
        const positiveReviews = data.reviews.filter(r => r.rating >= 4).length;
        const satisfactionPercent = ((positiveReviews / data.reviews.length) * 100).toFixed(0);
        setSatisfaction(`${satisfactionPercent}%`);
      })
      .catch(() => {
        setSatisfaction("N/A");
      });
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-center">
      <div className="text-3xl font-bold text-primary-600 mb-2">{satisfaction}</div>
      <div className="text-neutral-600">Patient Satisfaction</div>
    </div>
  );
}

