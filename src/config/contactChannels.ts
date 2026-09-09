export const CONTACT_CHANNELS = {
  owner: {
    address: "mduah@astcompass.com",
    label: "Michael B. Duah",
    purpose: "Creator and owner correspondence",
  },
  general: {
    address: "info@astcompass.com",
    label: "General information",
    purpose: "General questions about AST Compass",
  },
  support: {
    address: "support@astcompass.com",
    label: "Technical support",
    purpose: "Access, usability, privacy, and security concerns",
  },
  review: {
    address: "review@astcompass.com",
    label: "Scientific review",
    purpose: "Scientific corrections, source concerns, and expert review",
  },
  research: {
    address: "research@astcompass.com",
    label: "Research correspondence",
    purpose: "Research, literature, and academic collaboration inquiries",
  },
} as const;

export type ContactChannel = keyof typeof CONTACT_CHANNELS;

export const contactHref = (channel: ContactChannel) =>
  `mailto:${CONTACT_CHANNELS[channel].address}`;
