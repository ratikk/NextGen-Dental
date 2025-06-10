export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  image: string;
  category: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 'dental-hygiene-tips',
    title: '5 Essential Dental Hygiene Tips for a Healthy Smile',
    excerpt: 'Maintain optimal oral health with these proven dental hygiene practices that you can easily incorporate into your daily routine.',
    content: `
      Maintaining good oral hygiene is crucial for a healthy smile and overall well-being. Here are five essential tips to help you maintain optimal dental health:

      1. Proper Brushing Technique
      Use a soft-bristled toothbrush and fluoride toothpaste. Brush at a 45-degree angle to your gums, using gentle circular motions. Don't forget to brush your tongue!

      2. Regular Flossing
      Floss at least once daily to remove plaque and food particles between teeth where your toothbrush can't reach.

      3. Healthy Diet
      Limit sugary and acidic foods. Include calcium-rich foods in your diet to strengthen teeth and bones.

      4. Stay Hydrated
      Drink plenty of water throughout the day to help wash away bacteria and food particles.

      5. Regular Dental Checkups
      Visit your dentist every six months for professional cleaning and examination.
    `,
    author: 'Dr. Suman Kondragunta',
    date: '2024-02-15',
    image: '/images/hero/dental-1.jpg',
    category: 'Oral Health',
    tags: ['dental hygiene', 'oral health', 'brushing techniques', 'flossing', 'dental care'],
    seoTitle: 'Dental Hygiene Tips: 5 Essential Practices for a Healthy Smile | Lilac Dental Austin',
    seoDescription: 'Learn 5 proven dental hygiene tips from Austin\'s top dentists. Discover proper brushing techniques, flossing methods, and diet recommendations for optimal oral health.'
  },
  {
    id: 'choosing-toothbrush',
    title: 'How to Choose the Right Toothbrush: A Complete Guide',
    excerpt: 'Learn how to select the perfect toothbrush for your specific dental needs with our comprehensive guide.',
    content: `
      Choosing the right toothbrush is essential for maintaining good oral health. Here's what to consider:

      Bristle Type:
      - Soft bristles are recommended for most people
      - Medium and hard bristles can damage gums and enamel
      - Look for rounded bristle tips for gentle cleaning

      Head Size:
      - Should easily reach all areas of your mouth
      - Smaller heads offer better control and access
      - Consider your mouth size when choosing

      Handle Design:
      - Should feel comfortable in your hand
      - Non-slip grip for better control
      - Flexible neck can help reduce pressure

      Manual vs. Electric:
      - Both can be effective when used properly
      - Electric brushes can help with limited mobility
      - Consider your budget and preferences
    `,
    author: 'Dr. Kiranmayee Yanala',
    date: '2024-02-10',
    image: '/images/hero/dental-2.jpg',
    category: 'Dental Products',
    tags: ['toothbrush', 'dental products', 'oral care', 'dental hygiene'],
    seoTitle: 'How to Choose the Best Toothbrush: Expert Guide | Lilac Dental Austin',
    seoDescription: 'Expert guide on choosing the right toothbrush for your needs. Compare manual vs electric, bristle types, and features to maintain optimal oral health.'
  }
];

export function getBlogPost(id: string): BlogPost | undefined {
  return blogPosts.find(post => post.id === id);
}