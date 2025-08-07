export const clinicInfo = {
  name: "NextGen Dental",
  address: {
    line1: "10001 S I-35 Frontage Rd Ste 350",
    city: "Austin",
    state: "TX",
    zip: "78747",
    full: "10001 S I-35 Frontage Rd Ste 350, Austin, TX 78747"
  },
  phone: "+(512) 649-4419",
  displayPhone: "(512) 649-4419",
  email: "ismile@nextgendentaltx.com",
  mapLink: "https://www.google.com/maps/place/NextGen+Dental/@30.400525,-97.6750384,15z/data=!4m2!3m1!1s0x0:0xefc0b389042e9c61?sa=X&ved=1t:2428&hl=en-US&gl=us&ictx=111",
  coordinates: {
    latitude: 30.400525,
    longitude: -97.6750384
  },
  hours: {
    Monday: "08:30 AM – 5:00 PM",
    Tuesday: "08:30 AM – 5:00 PM",
    Wednesday: "Closed",
    Thursday: "08:30 AM – 5:00 PM",
    Friday: "08:30 AM – 5:00 PM",
    Saturday: "By Appointment Only",
    Sunday: "Closed"
  },
  social: {
    facebook: "https://www.facebook.com/people/Next-Gen-Dental/61558752512764/",
    yelp: "https://www.yelp.com/biz/next-gen-dental-no-title"
  },
  booking: {
    url: "https://book.modento.io/nextgen-dental/patient-details"
  }
};

export type ClinicInfo = typeof clinicInfo;
export type BusinessHours = typeof clinicInfo.hours;

export default clinicInfo;

