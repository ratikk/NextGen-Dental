const services = [
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
  '/services/teeth-whitening'
];

async function testDentalServices() {
  const baseUrl = 'http://localhost:4321';
  
  console.log('Testing dental service endpoints...\n');
  
  for (const service of services) {
    try {
      const response = await fetch(`${baseUrl}${service}`);
      const status = response.status;
      const color = status === 200 ? '\x1b[32m' : '\x1b[31m'; // Green for 200, Red for others
      console.log(`${color}${status}\x1b[0m - ${service}`);
    } catch (error) {
      console.log(`\x1b[31mERROR\x1b[0m - ${service} - ${error.message}`);
    }
  }
}

testDentalServices();