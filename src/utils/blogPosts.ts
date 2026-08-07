// src/utils/blogPosts.ts
import { type ImageMetadata } from 'astro';

// Featured images (best topical match available in the current asset library)
import dental1 from '../assets/images/hero/dental-1.jpg';
import dental2 from '../assets/images/hero/dental-2.jpg';
import dental3 from '../assets/images/hero/dental-3.jpg'; // two people holding clear aligners
import dental4 from '../assets/images/hero/dental-4.jpg'; // bright smiles close together
import dental6 from '../assets/images/hero/dental-6.jpg'; // multigenerational family outdoors

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
    id: 'dental-implant-process-recovery',
    title: 'The Dental Implant Process: Timeline, Recovery, and What to Expect',
    seoTitle: 'Dental Implant Process & Recovery: What to Expect',
    seoDescription: 'From consultation to final crown: a South Austin dentist walks through the dental implant timeline, healing stages, and practical recovery tips.',
    excerpt: 'Thinking about a dental implant but unsure what the journey involves? Here is the full timeline — consultation to final crown — and what recovery really feels like.',
    date: '2026-08-07',
    author: 'Dr. Kiranmayee Yanala',
    category: 'Restorative',
    image: dental6,
    imageAlt: 'Multigenerational family smiling and walking together outdoors',
    tags: ['Dental Implants', 'Restorative'],
    content: `<p>Dental implants have a reputation for being a big, intimidating procedure &mdash; and then patients go through it and tell us the waiting was harder than the treatment. If you are considering an implant, knowing the actual timeline and what recovery feels like takes most of the anxiety out of the decision. Here is the honest walkthrough we give patients at our South Austin practice.</p>

<h2>What an implant actually is</h2>
<p>A dental implant has three parts: a small titanium post that takes the place of the tooth root, an abutment that connects to it, and a custom crown that becomes your visible tooth. Because the post integrates with your jawbone, the finished tooth is stable, does not rely on neighboring teeth (unlike a bridge), and helps preserve the bone that would otherwise shrink where a tooth is missing.</p>

<h2>Step 1: Consultation and planning</h2>
<p>Everything starts with an exam, digital X-rays, and 3D imaging. We are checking two things: the health of your gums and whether there is enough bone to anchor the post. Most people are candidates; if bone has thinned where a tooth has been missing a while, a grafting step can rebuild it &mdash; that adds time but rarely rules anyone out. This is also where we map the full timeline and <a href="/financing">cost and financing options</a>, so there are no surprises later.</p>

<h2>Step 2: Placing the implant</h2>
<p>The placement itself is a routine surgical visit under local anesthesia &mdash; most patients are surprised to find it gentler than a tooth extraction. Sedation options are available if dental visits make you anxious. You will leave with the post in place under the gum and, in visible areas, a temporary tooth so you are never without a smile.</p>

<h2>Step 3: The healing months</h2>
<p>This is the part that takes patience: over the next three to six months the bone grows onto the titanium post &mdash; a process called osseointegration &mdash; creating the foundation that makes implants so durable. The good news is that this phase is mostly uneventful for you: normal eating (with some early caution on that side), normal routines, occasional quick check-ins with us.</p>

<h2>Step 4: Abutment and crown</h2>
<p>Once the post is solid, we attach the abutment and take impressions for your final crown, matched to the shade and shape of your natural teeth. When it is fitted &mdash; usually a couple of visits later &mdash; the process is complete: a tooth you bite, chew, and brush like the one you were born with.</p>

<h2>What recovery really feels like</h2>
<ul>
<li><strong>First 48 hours:</strong> some swelling and soreness, managed well with over-the-counter pain relief and ice. Stick to soft foods, skip straws and smoking (both interfere with healing), and take it easy.</li>
<li><strong>First week:</strong> most patients are back to work the next day or the day after. Tenderness fades steadily; stitches, if any, dissolve or come out at a quick follow-up.</li>
<li><strong>Long term:</strong> care for an implant exactly like a natural tooth &mdash; brushing, flossing, and <a href="/services/dental-checkup">regular checkups</a>. There is no special maintenance, and with good hygiene implants routinely last decades.</li>
</ul>

<h2>Is it worth the months of waiting?</h2>
<p>Implants are among the most predictable procedures in modern dentistry, and they are the only tooth replacement that protects your jawbone long-term. That said, they are not the only option &mdash; bridges and dentures each have their place, and the right answer depends on your mouth, timeline, and budget. That conversation is exactly what a consultation is for: you can read more on our <a href="/services/dental-implants">dental implants page</a>, or come in and we will look at your specific situation together.</p>`
  },
  {
    id: 'dental-emergency-what-to-do',
    title: 'Dental Emergency in South Austin: What to Do First',
    seoTitle: 'Dental Emergency in South Austin: What to Do First',
    seoDescription: 'Knocked-out tooth, severe toothache, or swelling? A South Austin dentist explains what to do in the first hour and when to go to the ER.',
    excerpt: 'The first hour matters most in a dental emergency. Here is exactly what to do for the most common situations — and when to skip the dentist and go straight to the ER.',
    date: '2026-08-07',
    author: 'Dr. Suman Kondragunta',
    category: 'Emergency',
    image: dental1,
    imageAlt: 'Group of smiling young adults pointing toward the camera',
    tags: ['Emergency', 'Oral Health'],
    content: `<p>Dental emergencies rarely pick a convenient moment &mdash; a knocked-out tooth at Saturday soccer practice, a toothache that goes from annoying to unbearable overnight. What you do in the first hour often determines whether a tooth can be saved. Here is our practical guide for the most common situations we see at our South Austin practice.</p>

<h2>First: is it a dentist emergency or an ER emergency?</h2>
<p>Most dental emergencies belong at the dentist, where the tooth can actually be treated. But <strong>go to the emergency room first</strong> if you have facial swelling that affects breathing or swallowing, trauma to the head or neck, a possible broken jaw, or bleeding that will not stop. Those are medical emergencies; the tooth comes second. For everything below, call us &mdash; we hold time in our schedule every day for <a href="/services/emergency-dentistry">emergency appointments</a>.</p>

<h2>Knocked-out permanent tooth: the one-hour window</h2>
<p>This is the true race against the clock. A knocked-out adult tooth has the best chance of being saved if it is back in professional hands within 30 to 60 minutes.</p>
<ul>
<li>Pick the tooth up <strong>by the crown</strong> (the white chewing part) &mdash; never the root.</li>
<li>If it is dirty, rinse it gently with water for a few seconds. Do not scrub, and do not wrap it in tissue.</li>
<li>If you can, place it back into its socket and bite gently on a clean cloth to hold it there.</li>
<li>If you cannot, keep it moist: a cup of cold milk is ideal; holding it inside your cheek works in a pinch for adults.</li>
<li>Call a dentist immediately and say the words "knocked-out tooth" &mdash; that moves you to the front of any schedule.</li>
</ul>
<p>One important exception: <strong>do not reinsert a baby tooth.</strong> Pushing it back can damage the adult tooth developing underneath. Keep the tooth, comfort your child, and call us.</p>

<h2>Severe toothache</h2>
<p>Rinse with warm water and gently floss around the tooth &mdash; a surprising number of "emergencies" turn out to be a popcorn hull or seed lodged below the gumline. Take over-the-counter pain relief as directed, but <strong>never place aspirin directly on the gum</strong>; it burns the tissue. A cold compress on the outside of the cheek helps with swelling. A toothache that wakes you at night, is triggered by heat, or comes with swelling usually means the nerve is involved &mdash; that will not resolve on its own, so call rather than wait it out.</p>

<h2>Chipped, cracked, or broken tooth</h2>
<p>Save any pieces you can find, rinse your mouth with warm water, and cover any sharp edge with dental wax or sugar-free gum to protect your tongue. A small chip can often wait a day or two; a crack that hurts when you bite or release should be seen promptly, because cracks tend to spread.</p>

<h2>Swelling or a bump on the gum</h2>
<p>Swelling in the gum or face often signals an abscess &mdash; an infection that needs treatment, not just antibiotics from an urgent care clinic. Rinse with mild salt water and see a dentist quickly. If the swelling is spreading toward your eye or neck, or you develop fever and difficulty swallowing, that is ER territory &mdash; go now.</p>

<h2>Lost crown or filling</h2>
<p>Uncomfortable, but rarely urgent. Keep the crown if you have it, avoid chewing on that side, and drugstore temporary dental cement can protect the tooth for a few days until your visit.</p>

<h2>What happens when you call us</h2>
<p>Tell us what happened, when, and what hurts. We will tell you exactly what to do in the meantime and get you in the same day whenever possible. If your emergency happens outside office hours, our phone message includes instructions &mdash; and the guidance above covers the critical first steps for every situation.</p>

<p>The best emergency, of course, is the one that never happens: most cracked teeth and abscesses start as small problems that a <a href="/services/dental-checkup">routine checkup</a> would have caught months earlier. If it has been a while, that is the cheapest emergency insurance there is.</p>`
  },
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
