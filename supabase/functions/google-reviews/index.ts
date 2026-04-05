import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Mock Google Reviews data for NextGen Dental
    // In production, this would fetch from Google Places API
    const mockReviews = [
      {
        author_name: "Meka Abdi",
        rating: 5,
        text: "I have been a patient here for over two years and absolutely love NextGen Dental! The entire staff, including Dr. Kondragunla makes you feel so comfortable—it truly feels like family. I've also been to his wife's location, Lilac Dental, and they are both amazing practices. I've had crowns, two root canals, and routine cleanings done here, and I've never experienced any issues. They accept insurance, and the front desk is always professional and helpful. Dr. K is incredibly knowledgeable and always explains everything clearly. If you're looking for a new dentist, I highly recommend NextGen Dental!",
        profile_photo_url: "https://ui-avatars.com/api/?name=Meka+Abdi&background=8B6F47&color=fff",
        relative_time_description: "5 months ago"
      },
      {
        author_name: "Arti",
        rating: 5,
        text: "The entire team was welcoming and professional from start to finish. Dr. K is knowledgeable, patient, and takes the time to explain everything clearly, which really helped put me at ease. He genuinely cares about his patients and makes sure you're comfortable throughout the visit. The front desk team was also super friendly and made scheduling and insurance questions hassle-free. I highly recommend NextGen Dental for anyone looking for quality care in a comfortable environment!",
        profile_photo_url: "https://ui-avatars.com/api/?name=Arti&background=8B6F47&color=fff",
        relative_time_description: "2 months ago"
      },
      {
        author_name: "Rodrigo Velez",
        rating: 5,
        text: "I recently switched to Next Gen Dental after a negative experience with my previous dentist, and I'm so glad I did! The front reception is super welcoming—they always remember my partner and me, which makes every visit feel personal and relaxed. The office is also very clean and well-maintained. Dr. K is professional, thorough, and genuinely cares about his patients. He takes the time to explain everything and makes sure you feel comfortable. If you're looking for a great dental experience, I highly recommend Next Gen Dental!",
        profile_photo_url: "https://ui-avatars.com/api/?name=Rodrigo+Velez&background=8B6F47&color=fff",
        relative_time_description: "5 months ago"
      },
      {
        author_name: "Sarah Mitchell",
        rating: 5,
        text: "Dr. K and his team are amazing! I was nervous about getting dental work done, but they made me feel so comfortable. The office is modern and clean, and they use the latest technology. My Invisalign treatment has been going great!",
        profile_photo_url: "https://ui-avatars.com/api/?name=Sarah+Mitchell&background=8B6F47&color=fff",
        relative_time_description: "3 months ago"
      },
      {
        author_name: "James Rodriguez",
        rating: 5,
        text: "Best dental experience I've ever had! The staff is friendly, the office is spotless, and Dr. K really knows his stuff. They worked with my insurance and made everything easy. Highly recommend for families!",
        profile_photo_url: "https://ui-avatars.com/api/?name=James+Rodriguez&background=8B6F47&color=fff",
        relative_time_description: "1 month ago"
      },
      {
        author_name: "Emily Chen",
        rating: 5,
        text: "I had an emergency dental issue and they got me in the same day! Dr. K was so patient and explained all my options. The front desk staff is wonderful and the whole experience was stress-free. Thank you NextGen Dental!",
        profile_photo_url: "https://ui-avatars.com/api/?name=Emily+Chen&background=8B6F47&color=fff",
        relative_time_description: "2 weeks ago"
      }
    ];

    // Generate AI summary based on reviews
    const aiSummary = "Patients consistently praise NextGen Dental for its welcoming, family-like atmosphere and professional staff. Dr. K is highly regarded for his knowledge, patience, and ability to clearly explain treatments, helping patients feel comfortable and informed. The practice is noted for its modern, clean facilities and use of advanced technology. Many reviewers highlight the seamless insurance process and friendly front desk team. Patients appreciate the practice's ability to handle both routine care and emergency situations with exceptional service.";

    const data = {
      reviews: mockReviews,
      rating: 5.0,
      user_ratings_total: mockReviews.length,
      aiSummary: aiSummary
    };

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in google-reviews function:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to fetch reviews",
        reviews: [],
        rating: 0,
        user_ratings_total: 0,
        aiSummary: ""
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
