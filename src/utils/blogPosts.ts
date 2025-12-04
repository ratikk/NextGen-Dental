// src/utils/blogPosts.ts
import { type ImageMetadata } from 'astro';

// Import existing images to use as placeholders for now
import dental1 from '../assets/images/hero/dental-1.jpg';
import dental2 from '../assets/images/hero/dental-2.jpg';
import dental3 from '../assets/images/hero/dental-3.jpg';
import dental4 from '../assets/images/hero/dental-4.jpg';

export interface BlogPost {
  id: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  category: string;
  image?: ImageMetadata | string;
  tags?: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 'why-get-veneers',
    title: 'Why Do People Get Veneers?',
    seoTitle: 'Dental Veneers Austin | Lilac Dental Cosmetic Dentistry',
    seoDescription: 'Are dental veneers right for you? Learn how they fix chips, gaps, and stains for a perfect smile.',
    excerpt: 'The dental veneers market is booming. From fixing chips to closing gaps, see how this cosmetic treatment transforms smiles.',
    date: '2025-12-01',
    author: 'Dr. Kiranmayee Yanala',
    category: 'Dental Veneers', // <--- NEW CATEGORY
    image: dental1, // Placeholder
    tags: ['Veneers', 'Cosmetic', 'Smile Makeover'],
    content: `<p>Dental veneers are thin, custom-made shells crafted of tooth-colored materials designed to cover the front surface of teeth...</p>`
  },
  {
    id: 'invisalign-vs-braces',
    title: 'Invisalign vs. Braces: What is Right for You?',
    seoTitle: 'Invisalign vs Braces Austin | Lilac Dental',
    seoDescription: 'Comparing clear aligners vs traditional metal braces in North Austin.',
    excerpt: 'Choosing between clear aligners and traditional metal braces is a big decision. We break down the cost, comfort, and speed.',
    date: '2025-11-27',
    author: 'Dr. Suman Kondragunta',
    category: 'Invisalign',
    image: dental2, // Placeholder
    tags: ['Invisalign', 'Orthodontics'],
    content: `<p>Choosing between <strong>Invisalign</strong> and traditional braces is a significant decision...</p>`
  },
  {
    id: 'tongue-pain-causes',
    title: 'Why Does The Side Of My Tongue Hurt?',
    seoTitle: 'Tongue Pain Causes & Treatments | Austin Dentist',
    seoDescription: 'Experiencing tongue pain? Learn common causes from trauma to vitamin deficiency.',
    excerpt: 'It may not seem like a big deal at first, but tongue pain can indicate underlying issues. Here is what to look out for.',
    date: '2025-11-20',
    author: 'Dr. Suman Kondragunta',
    category: 'Preventive',
    image: dental3, // Placeholder
    tags: ['Oral Health', 'Diagnosis'],
    content: `<p>Tongue pain is surprisingly common and often ignored...</p>`
  },
  {
    id: 'replace-toothbrush',
    title: 'How Often Should I Change My Toothbrush?',
    seoTitle: 'When to Change Toothbrush | Dental Hygiene Tips',
    seoDescription: 'Learn why changing your toothbrush every 3 months is crucial for oral health.',
    excerpt: 'How often should I change my toothbrush? According to the ADA, you might be keeping yours for too long.',
    date: '2025-11-10',
    author: 'Dr. Kiranmayee Yanala',
    category: 'Preventive',
    image: dental4, // Placeholder
    tags: ['Hygiene', 'Tips'],
    content: `<p>A worn-out toothbrush cannot clean your teeth effectively...</p>`
  }
];
