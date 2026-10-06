// Real photos for each job category (see assets/images/CREDITS.md).
const IMAGES = {
  construction: require("../../assets/images/sectors/construction.jpg"),
  houseHelp: require("../../assets/images/sectors/house-help.jpg"),
  cooking: require("../../assets/images/sectors/cooking.jpg"),
  driving: require("../../assets/images/sectors/driving.jpg"),
  caretaking: require("../../assets/images/sectors/caretaking.jpg"),
  security: require("../../assets/images/sectors/security.jpg"),
  delivery: require("../../assets/images/sectors/delivery.jpg"),
  healthcare: require("../../assets/images/sectors/healthcare.jpg"),
  engineering: require("../../assets/images/sectors/engineering.jpg"),
  it: require("../../assets/images/sectors/it.jpg"),
  education: require("../../assets/images/sectors/education.jpg"),
  finance: require("../../assets/images/sectors/finance.jpg"),
  legal: require("../../assets/images/sectors/legal.jpg"),
  office: require("../../assets/images/sectors/office.jpg"),
  workers: require("../../assets/images/tier-normal.jpg"),
  city: require("../../assets/images/landing.jpg"),
  sunriseRiver: require("../../assets/images/sunrise-river.jpg"),
  sunriseHills: require("../../assets/images/sunrise-hills.jpg"),
  sunriseCity: require("../../assets/images/sunrise-city.jpg"),
};

// Matched on the sector name, so sectors the admin adds later still get a fitting photo.
const RULES = [
  [/construct|mason|build|labou?r|carpent|paint|plumb|electric/, "construction"],
  [/house|maid|clean|domestic|laundry/, "houseHelp"],
  [/cook|chef|kitchen|food|restaurant/, "cooking"],
  [/driv|chauffeur|cab|taxi/, "driving"],
  [/care|nanny|elder|baby|child/, "caretaking"],
  [/secur|guard|watch/, "security"],
  [/deliver|courier|logistic|rider/, "delivery"],
  [/health|medic|doctor|nurs|hospital|pharma|clinic/, "healthcare"],
  [/engineer|civil|mechanic/, "engineering"],
  [/\bit\b|software|tech|developer|computer|data/, "it"],
  [/educat|teach|school|tutor|college/, "education"],
  [/financ|account|bank|audit|tax/, "finance"],
  [/legal|law|advocate/, "legal"],
];

export function sectorImage(sectorName, tier = "normal") {
  const name = (sectorName || "").toLowerCase();
  const match = RULES.find(([pattern]) => pattern.test(name));
  if (match) return IMAGES[match[1]];
  return tier === "premium" ? IMAGES.office : IMAGES.workers;
}

// Sunrise header photo for each kind of user: river (Normal), hills (Premium), city (Admin).
export function heroImage(name) {
  if (name === "premium") return IMAGES.sunriseHills;
  if (name === "admin") return IMAGES.sunriseCity;
  if (name === "city") return IMAGES.city;
  return IMAGES.sunriseRiver;
}
