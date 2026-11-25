export interface OfficeLocation {
  country: string;
  address: string;
}

export const REGISTERED_OFFICE: OfficeLocation & { label: string } = {
  label: "Registered Office — Oxford, United Kingdom",
  country: "United Kingdom",
  address: "171 Crescent Road, Oxford, England, OX4 2NX",
};

export const GLOBAL_OFFICES: readonly OfficeLocation[] = [
  {
    country: "Netherlands",
    address: "Herengracht 168, Amsterdam, North Holland",
  },
  {
    country: "United Kingdom",
    address: "One London Wall, Barbican, London",
  },
  {
    country: "United States",
    address: "1440 G St. NW #900, Washington, D.C.",
  },
  {
    country: "Japan",
    address: "6-chōme-5-1 Nishishinjuku, Shinjuku City, Tokyo",
  },
  {
    country: "South Korea",
    address: "311 Gangnam-daero, Seocho-gu, Seoul",
  },
  {
    country: "Hong Kong",
    address: "15 Wing Kin Rd, Tsuen Wan",
  },
  {
    country: "United Arab Emirates",
    address: "Dubai",
  },
  {
    country: "Russia",
    address: "Presnenskaya Naberezhnaya 6, Building 2, Moscow",
  },
] as const;
