// src/components/PhoneReveal.jsx
import { useState } from 'react';

export default function PhoneReveal() {
  const [revealed, setRevealed] = useState(false);

  const tel = '+17379103739';
  const display = '(737) 910-3739';

  return (
    <div>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Reveal Phone Number
        </button>
      ) : (
        <a href={`tel:${tel}`} className="ml-3 font-semibold text-lg text-blue-700 underline">
          {display}
        </a>
      )}
    </div>
  );
}

