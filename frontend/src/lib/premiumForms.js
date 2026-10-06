// Form state, validation and API payloads for the premium (professional) profiles.
// Used by the premium setup wizards and by EditProfileScreen.

export const PROFESSIONS = ["Doctor", "Nurse", "Engineer", "Software Developer", "Teacher", "Accountant", "Lawyer", "Pharmacist", "Architect", "Other"];

export const NOTICE_PERIODS = [
  { label: "Immediately", value: "immediate" },
  { label: "15 days", value: "15_days" },
  { label: "1 month", value: "1_month" },
  { label: "2 months", value: "2_months" },
  { label: "3 months", value: "3_months" },
];

export const ORGANIZATION_TYPES = [
  { label: "Hospital", value: "hospital" },
  { label: "Clinic", value: "clinic" },
  { label: "Company", value: "company" },
  { label: "Startup", value: "startup" },
  { label: "School / College", value: "school" },
  { label: "Government", value: "government" },
  { label: "Other", value: "other" },
];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"].map((size) => ({ label: `${size} people`, value: size }));

const list = (text) => text.split(",").map((item) => item.trim()).filter(Boolean);
const joined = (items) => (items || []).join(", ");
const numberOrNull = (text) => (text === "" ? null : Number(text));

// ── Seeker ───────────────────────────────────────────────────────────────────

export function initSeekerForm(user) {
  const details = user.details || {};
  const known = PROFESSIONS.includes(details.profession);
  return {
    profession: details.profession ? (known ? details.profession : "Other") : "",
    otherProfession: details.profession && !known ? details.profession : "",
    specialization: details.specialization || "",
    qualification: details.qualification || "",
    institution: details.institution || "",
    graduationYear: details.graduationYear ? String(details.graduationYear) : "",
    experienceYears: user.experienceYears !== null && user.experienceYears !== undefined ? String(user.experienceYears) : "",
    currentEmployer: details.currentEmployer || "",
    currentDesignation: details.currentDesignation || "",
    licenseNumber: details.licenseNumber || "",
    skills: joined(user.skills),
    city: user.city || "",
    preferredCities: joined(details.preferredCities),
    languages: joined(details.languages),
    expectedSalary: details.expectedSalary ? String(details.expectedSalary) : "",
    noticePeriod: details.noticePeriod || null,
    linkedinUrl: details.linkedinUrl || "",
    about: user.about || "",
  };
}

// Returns an error message, or "" when the section is complete.
export function validateSeekerSection(form, section) {
  if (section === "profession" || section === "all") {
    const profession = form.profession === "Other" ? form.otherProfession.trim() : form.profession;
    if (!profession) return "Choose your profession";
    if (!form.qualification.trim()) return "Enter your highest qualification";
    const year = Number(form.graduationYear);
    if (form.graduationYear && (year < 1950 || year > 2035)) return "Enter a valid graduation year";
  }
  if (section === "experience" || section === "all") {
    if (form.experienceYears === "") return "Enter your years of experience";
    if (!list(form.skills).length) return "Add at least one skill";
  }
  if (section === "preferences" || section === "all") {
    if (!form.city.trim()) return "Enter the city you live in";
    if (!list(form.languages).length) return "Add the languages you speak";
  }
  return "";
}

export function seekerPayload(form) {
  return {
    city: form.city.trim(),
    about: form.about.trim(),
    skills: list(form.skills),
    experienceYears: numberOrNull(form.experienceYears),
    details: {
      profession: form.profession === "Other" ? form.otherProfession.trim() : form.profession,
      specialization: form.specialization.trim(),
      qualification: form.qualification.trim(),
      institution: form.institution.trim(),
      graduationYear: numberOrNull(form.graduationYear),
      currentEmployer: form.currentEmployer.trim(),
      currentDesignation: form.currentDesignation.trim(),
      licenseNumber: form.licenseNumber.trim(),
      preferredCities: list(form.preferredCities),
      languages: list(form.languages),
      expectedSalary: numberOrNull(form.expectedSalary),
      noticePeriod: form.noticePeriod,
      linkedinUrl: form.linkedinUrl.trim(),
    },
  };
}

// ── Hirer ────────────────────────────────────────────────────────────────────

export function initHirerForm(user) {
  const details = user.details || {};
  return {
    businessName: user.businessName || "",
    organizationType: details.organizationType || null,
    companySize: details.companySize || null,
    registrationNumber: details.registrationNumber || "",
    city: user.city || "",
    designation: details.designation || "",
    officeAddress: details.officeAddress || "",
    website: details.website || "",
    about: user.about || "",
  };
}

export function validateHirerSection(form, section) {
  if (section === "organization" || section === "all") {
    if (!form.businessName.trim()) return "Enter your organisation's name";
    if (!form.organizationType) return "Choose the organisation type";
    if (!form.companySize) return "Choose the organisation size";
    if (!form.city.trim()) return "Enter the city";
  }
  if (section === "contact" || section === "all") {
    if (!form.designation.trim()) return "Enter your designation";
    if (!form.officeAddress.trim()) return "Enter the office address";
  }
  return "";
}

export function hirerPayload(form) {
  return {
    businessName: form.businessName.trim(),
    city: form.city.trim(),
    about: form.about.trim(),
    details: {
      organizationType: form.organizationType,
      companySize: form.companySize,
      registrationNumber: form.registrationNumber.trim(),
      designation: form.designation.trim(),
      officeAddress: form.officeAddress.trim(),
      website: form.website.trim(),
    },
  };
}
