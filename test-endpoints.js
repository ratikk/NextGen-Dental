const endpoints = [
  // Main pages
  '/',
  '/about',
  '/services',
  '/patient-education',
  '/contact',
  '/book-appointment',
  
  // Services
  '/services/dental-checkup',
  '/services/dental-veneers',
  '/services/dental-laminates',
  '/services/full-mouth-reconstruction',
  '/services/laser-dentistry',
  '/services/smile-makeover',
  '/services/zoom-teeth-whitening',
  '/services/dental-crowns',
  '/services/dental-bridges',
  '/services/dentures',
  '/services/partial-dentures',
  '/services/invisalign',
  '/services/lumineers',
  '/services/snap-on-smile',
  '/services/dental-implants',
  '/services/emergency-dentist',
  '/services/kid-friendly-dentist',
  '/services/root-canal-treatment',
  '/services/teeth-whitening',
  
  // Patient Education
  '/patient-education/oral-hygiene-basics',
  '/patient-education/do-i-have-sleep-apnea',
  '/patient-education/improve-your-smile-for-senior-pictures',
  '/patient-education/what-should-i-do-if-i-chip-my-tooth',
  '/patient-education/why-are-my-gums-bleeding',
  '/patient-education/wisdom-teeth-extraction',
  '/patient-education/alternative-to-braces-for-teens',
  '/patient-education/do-i-need-a-root-canal',
  '/patient-education/options-for-replacing-missing-teeth',
  '/patient-education/what-can-i-do-to-improve-my-smile',
  '/patient-education/when-is-a-tooth-extraction-necessary',
  '/patient-education/will-i-need-a-bone-graft-for-dental-implants',
  '/patient-education/dental-anxiety',
  '/patient-education/i-think-my-gums-are-receding',
  '/patient-education/oral-cancer-screening',
  '/patient-education/what-do-i-do-if-i-damage-my-dentures',
  '/patient-education/which-is-better-invisalign-or-braces',
  '/blog'
];

async function testEndpoints() {
  const baseUrl = 'http://localhost:4321';
  
  console.log('Starting endpoint tests...\n');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      const status = response.status;
      const color = status === 200 ? '\x1b[32m' : '\x1b[31m'; // Green for 200, Red for others
      console.log(`${color}${status}\x1b[0m - ${endpoint}`);
    } catch (error) {
      console.log(`\x1b[31mERROR\x1b[0m - ${endpoint} - ${error.message}`);
    }
  }
}

testEndpoints();