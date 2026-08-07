// src/utils/blogPosts.ts
import { type ImageMetadata } from 'astro';

// Featured images (best topical match available in the current asset library)
import dental1 from '../assets/images/hero/dental-1.jpg';
import dental2 from '../assets/images/hero/dental-2.jpg';
import dental3 from '../assets/images/hero/dental-3.jpg'; // two people holding clear aligners
import dental4 from '../assets/images/hero/dental-4.jpg'; // bright smiles close together

export interface BlogPost {
  id: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt: string;
  content: string;
  date: string;
  dateModified?: string;
  author: string;
  category: string;
  image?: ImageMetadata | string;
  imageAlt?: string;
  tags?: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 'why-get-veneers',
    title: 'Why Do People Get Veneers?',
    seoTitle: 'Why Do People Get Dental Veneers? Austin Cosmetic Dentistry',
    seoDescription: 'Are dental veneers right for you? Learn how they fix chips, gaps, and stains for a confident smile.',
    excerpt: 'The dental veneers market is booming. From fixing chips to closing gaps, see how this cosmetic treatment transforms smiles.',
    date: '2025-12-01',
    dateModified: '2026-08-06',
    author: 'Dr. Kiranmayee Yanala',
    category: 'Dental Veneers',
    image: dental4,
    imageAlt: 'Three friends laughing together and showing bright, healthy smiles',
    tags: ['Veneers', 'Cosmetic', 'Smile Makeover'],
    content: `<p>Dental veneers are thin, custom-made shells of tooth-colored material that bond to the front surface of your teeth. Think of them as a new "face" for a tooth: the tooth underneath stays yours, but what the world sees is a carefully shaped, naturally colored surface designed to blend in with the rest of your smile.</p>

<h2>The most common reasons patients choose veneers</h2>
<p>In our South Austin practice, patients ask about veneers for a handful of recurring reasons:</p>
<ul>
<li><strong>Deep staining that whitening cannot fix.</strong> Some discoloration &mdash; from certain medications, an injured tooth, or years of coffee and tea &mdash; does not respond well to <a href="/services/teeth-whitening">professional whitening</a>. A veneer covers the stain rather than trying to bleach it away.</li>
<li><strong>Chips and worn edges.</strong> A chipped front tooth is one of the most frequent cosmetic complaints we see. Veneers restore a smooth, even edge.</li>
<li><strong>Small gaps.</strong> For minor spacing between front teeth, veneers can close the gap without months of orthodontic treatment.</li>
<li><strong>Uneven shape or size.</strong> Teeth that are naturally short, pointed, or mismatched can be brought into harmony with the rest of the smile.</li>
</ul>

<h2>Porcelain and composite: the two main types</h2>
<p>Porcelain veneers are crafted in a dental lab, are highly resistant to staining, and typically last many years with good care. Composite veneers are sculpted directly onto the tooth in a single visit and are usually more budget-friendly, though they may need more maintenance over time. Which one makes sense depends on your teeth, your goals, and your budget &mdash; that conversation is exactly what a consultation is for.</p>

<h2>What the process looks like</h2>
<p>Veneers usually take two to three visits: a consultation with photos and impressions, preparation of the teeth and placement of temporaries, and finally bonding of the finished veneers. Most patients describe the process as far easier than they expected.</p>

<h2>Caring for veneers</h2>
<p>Veneers do not need special products &mdash; just the habits that protect natural teeth: brushing twice a day, daily flossing, wearing a nightguard if you grind, and keeping up with <a href="/services/dental-checkup">regular checkups</a> so we can monitor the edges and the health of the underlying teeth.</p>

<h2>Are veneers right for you?</h2>
<p>Veneers are a cosmetic solution, so healthy teeth and gums come first. If decay or gum disease is present, we treat that before any cosmetic work. The best way to find out whether veneers fit your situation is a consultation &mdash; you can read more about our approach on the <a href="/services/dental-veneers">dental veneers service page</a>, or come in and talk through your options with us.</p>`
  },
  {
    id: 'invisalign-vs-braces',
    title: 'Invisalign vs. Braces: What is Right for You?',
    seoTitle: 'Invisalign vs. Braces in Austin: Which Is Right for You?',
    seoDescription: 'Comparing clear aligners vs traditional metal braces in South Austin.',
    excerpt: 'Choosing between clear aligners and traditional metal braces is a big decision. We break down the cost, comfort, and speed.',
    date: '2025-11-27',
    dateModified: '2026-08-06',
    author: 'Dr. Suman Kondragunta',
    category: 'Invisalign',
    image: dental3,
    imageAlt: 'Two smiling people each holding up a clear removable aligner',
    tags: ['Invisalign', 'Orthodontics'],
    content: `<p>Choosing between <strong>Invisalign</strong> and traditional braces is a significant decision, and there is no single right answer &mdash; the best option depends on your teeth, your habits, and your lifestyle. Here is how we help patients think it through.</p>

<h2>How each option works</h2>
<p>Traditional braces use brackets bonded to the teeth, connected by wires that your provider adjusts over time. Invisalign uses a series of clear, removable plastic aligners, each worn for a week or two, that move teeth gradually toward their planned position.</p>

<h2>Appearance</h2>
<p>This is usually the first thing patients mention. Aligners are nearly invisible in everyday conversation, which matters to many working adults and teens. Modern braces are lower-profile than they used to be, but they remain visible.</p>

<h2>Eating, brushing, and comfort</h2>
<p>Because aligners come out for meals, there are no food restrictions, and brushing and flossing stay exactly as they were. With braces, popcorn, sticky candy, and very hard foods are off the menu, and cleaning around brackets takes more effort. Braces can also irritate cheeks and lips at first, while aligner discomfort is usually limited to a feeling of pressure when starting a new tray.</p>

<h2>The discipline factor</h2>
<p>Here is the honest trade-off: aligners only work while they are in your mouth &mdash; typically 20 to 22 hours a day. If trays tend to stay on the nightstand, treatment stalls. Braces, being fixed in place, work around the clock without any willpower required. Knowing yourself is a real part of this decision.</p>

<h2>What your case needs</h2>
<p>Clear aligners handle many common situations well, including crowding, spacing, and various bite concerns. Some complex tooth movements are still managed more predictably with braces. This is why the decision starts with an exam and records &mdash; not with a preference.</p>

<h2>Making the call</h2>
<p>If you are weighing the two options here in the Austin area, we are glad to help you compare them for your specific smile. You can learn more on our <a href="/services/invisalign">Invisalign page</a>, or book a consultation and we will walk through what your case actually requires &mdash; no pressure either way.</p>`
  },
  {
    id: 'tongue-pain-causes',
    title: 'Why Does The Side Of My Tongue Hurt?',
    seoTitle: 'Tongue Pain: Common Causes & When to See a Dentist',
    seoDescription: 'Experiencing tongue pain? Learn common causes from trauma to vitamin deficiency.',
    excerpt: 'It may not seem like a big deal at first, but tongue pain can indicate underlying issues. Here is what to look out for.',
    date: '2025-11-20',
    dateModified: '2026-08-06',
    author: 'Dr. Suman Kondragunta',
    category: 'Preventive',
    image: dental1,
    imageAlt: 'Group of smiling young adults pointing toward the camera',
    tags: ['Oral Health', 'Preventive'],
    content: `<p>Tongue pain is surprisingly common and often ignored &mdash; most of us assume it will simply go away on its own. Usually it does. But because the tongue is involved in everything you eat, drink, and say, even a small sore spot is hard to ignore, and a few causes deserve real attention.</p>

<h2>Common, usually harmless causes</h2>
<ul>
<li><strong>Accidental bites and irritation.</strong> Biting the tongue while chewing, or rubbing against a rough tooth edge, a filling, or orthodontic hardware, is the most frequent culprit.</li>
<li><strong>Canker sores.</strong> These small, shallow ulcers often show up on the side of the tongue. They are not contagious and typically heal within a week or two on their own.</li>
<li><strong>Burns.</strong> Hot coffee, soup, or pizza can leave the tongue tender for a few days while it heals.</li>
<li><strong>Grinding and clenching.</strong> People who grind their teeth often press the tongue against them at night, which can leave the sides sore in the morning.</li>
<li><strong>Dry mouth.</strong> A tongue without enough saliva becomes irritated more easily. Medications are a common cause of dryness.</li>
</ul>

<h2>Causes worth a professional look</h2>
<p>Some tongue discomfort points to something a dentist or physician should evaluate. Nutritional deficiencies &mdash; particularly vitamin B12, iron, or folate &mdash; can cause a sore, smooth, or burning tongue. Oral thrush, a yeast overgrowth, appears as creamy white patches that wipe away and leave redness underneath. And a condition called geographic tongue creates map-like patches that are usually painless but sometimes sensitive to spicy or acidic foods.</p>

<h2>When to stop waiting and get it checked</h2>
<p>Our rule of thumb: <strong>any sore, patch, lump, or discolored area on the tongue that has not healed within two weeks deserves an exam.</strong> Persistent changes are usually benign, but they are also exactly what an <a href="/services/oral-cancer-screening">oral cancer screening</a> exists to rule out &mdash; screening is quick, painless, and part of a routine visit. Sudden severe pain or swelling that affects swallowing or breathing warrants <a href="/services/emergency-dentistry">urgent care</a>.</p>

<h2>In the meantime</h2>
<p>While something minor heals: rinse with warm salt water, avoid very spicy or acidic foods, stay hydrated, and keep brushing gently. If a rough tooth or restoration keeps catching your tongue in the same spot, do not just live with it &mdash; smoothing it out is often a simple fix, and it removes a source of chronic irritation. If a tongue sore has overstayed its welcome, we are happy to take a look.</p>`
  },
  {
    id: 'replace-toothbrush',
    title: 'How Often Should I Change My Toothbrush?',
    seoTitle: 'How Often Should You Replace Your Toothbrush?',
    seoDescription: 'Worn bristles clean poorly. Learn how often to replace your toothbrush and the signs it is time for a new one.',
    excerpt: 'A worn-out toothbrush cannot clean your teeth effectively. Here is when to swap it out and why it matters.',
    date: '2025-11-10',
    dateModified: '2026-08-06',
    author: 'Dr. Kiranmayee Yanala',
    category: 'Preventive',
    image: dental2,
    imageAlt: 'Multigenerational family smiling together outdoors',
    tags: ['Oral Hygiene', 'Preventive'],
    content: `<p>A worn-out toothbrush cannot clean your teeth effectively &mdash; and most of us hold onto our brushes far longer than we should. The good news: the rule is simple, and the signs are easy to spot.</p>

<h2>The three-to-four month rule</h2>
<p>The American Dental Association recommends replacing your toothbrush &mdash; or the head of your electric brush &mdash; about every <strong>three to four months</strong>. Bristles are engineered to flex and sweep plaque away; as they wear, they splay outward and lose that action. Worn brushes remove noticeably less plaque than fresh ones, even with good technique.</p>

<h2>Signs it is time, whatever the calendar says</h2>
<ul>
<li>Bristles that are frayed, flattened, or splayed outward</li>
<li>A brush that looks matted rather than crisp</li>
<li>Any buildup at the base of the bristles that rinsing does not remove</li>
</ul>
<p>Children's brushes usually need replacing more often than adults' &mdash; kids tend to chew and scrub harder, so check theirs monthly.</p>

<h2>What about after being sick?</h2>
<p>For most healthy people, rinsing the brush thoroughly and letting it air-dry upright is sufficient. That said, replacing an inexpensive brush after a significant illness is a reasonable, low-cost precaution &mdash; especially after strep throat, or when someone in the household has a weakened immune system.</p>

<h2>Caring for the brush you have</h2>
<p>Rinse it well after each use, store it upright where it can air-dry, and avoid closed containers that trap moisture. And do not share brushes &mdash; even within the family.</p>

<h2>A fresh brush is only half the equation</h2>
<p>Even a brand-new brush cannot reach the plaque that hardens into tartar between teeth and below the gumline &mdash; that is what <a href="/services/teeth-cleaning">professional cleanings</a> are for. Pairing a fresh brush every season with <a href="/services/dental-checkup">regular checkups</a> is one of the simplest ways to protect your smile. If it has been a while since your last visit, our South Austin team would love to see you.</p>`
  }
];
