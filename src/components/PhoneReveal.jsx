// src/components/PhoneReveal.jsx
import { useState } from 'react';

export default function PhoneReveal() {
  const [revealed, setRevealed] = useState(false);

  const tel = '+17379103739';
  const display = '(737) 910-3739';

  return (
    <>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Call Us
        </button>
      ) : (
        <a
          href={`tel:${tel}`}
          className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {display}
        </a>
      )}
    </>
  );
}

