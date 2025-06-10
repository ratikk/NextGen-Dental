export const services = {
  preventiveCare: {
    title: "Preventive Care",
    description: "Proactive dentistry focused on maintaining oral health and preventing future dental issues.",
    items: [
      {
        name: "Dental Checkup",
        description: "Stay ahead of dental problems with regular exams. Our team checks for cavities, gum disease, and more to ensure long-term oral health.",
        href: "/services/dental-checkup",
        icon: "🦷"
      },
      {
        name: "Teeth Cleaning",
        description: "Remove plaque, tartar, and surface stains with gentle professional cleanings. Keep your smile fresh and gums healthy.",
        href: "/services/teeth-cleaning",
        icon: "✨"
      },
      {
        name: "Oral Cancer Screening",
        description: "Early detection saves lives. We offer quick, non-invasive screenings during routine visits to catch warning signs early.",
        href: "/services/oral-cancer-screening",
        icon: "🔍"
      }
    ]
  },
  cosmeticDentistry: {
    title: "Cosmetic Dentistry",
    description: "Enhance the appearance of your smile with our aesthetic dental treatments.",
    items: [
      {
        name: "Teeth Whitening",
        description: "Brighten your smile by several shades with safe, in-office whitening treatments that deliver immediate results.",
        href: "/services/teeth-whitening",
        icon: "😁"
      },
      {
        name: "Dental Veneers",
        description: "Correct chipped, stained, or uneven teeth with custom-designed porcelain veneers that blend seamlessly with your natural smile.",
        href: "/services/dental-veneers",
        icon: "💎"
      },
      {
        name: "Lumineers",
        description: "A thinner, no-drill alternative to veneers that preserves your natural tooth enamel while transforming your smile.",
        href: "/services/lumineers",
        icon: "✨"
      }
    ]
  },
  restorativeCare: {
    title: "Restorative Care",
    description: "Repair damaged or missing teeth to restore function, comfort, and confidence.",
    items: [
      {
        name: "Dental Implants",
        description: "Permanently replace missing teeth with secure, natural-looking implants designed to last a lifetime.",
        href: "/services/dental-implants",
        icon: "🦿"
      },
      {
        name: "Root Canal",
        description: "Save infected or damaged teeth with precise root canal therapy that relieves pain and protects your smile.",
        href: "/services/root-canal",
        icon: "🔧"
      },
      {
        name: "Dentures",
        description: "Custom-fit full or partial dentures to restore your bite and facial structure with comfort and confidence.",
        href: "/services/dentures",
        icon: "😄"
      }
    ]
  }
};

export type ServiceItem = {
  name: string;
  description: string;
  href: string;
  icon: string;
};

export type ServiceCategory = {
  title: string;
  description: string;
  items: ServiceItem[];
};

export type Services = {
  [key: string]: ServiceCategory;
};

export default services;