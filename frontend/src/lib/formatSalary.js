const rupees = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;

// 1800000 → "18", 650000 → "6.5"
const lakhs = (amount) => String(Math.round((amount / 100000) * 10) / 10);

// "₹700 – ₹850 / day", "₹12,000 / month", "₹18 – 24 LPA"
export default function formatSalary(job) {
  if (!job) return "";
  if (job.salaryPeriod === "year" && job.salaryMin >= 100000) {
    const range = job.salaryMin === job.salaryMax ? lakhs(job.salaryMin) : `${lakhs(job.salaryMin)} – ${lakhs(job.salaryMax)}`;
    return `₹${range} LPA`;
  }
  const range = job.salaryMin === job.salaryMax
    ? rupees(job.salaryMin)
    : `${rupees(job.salaryMin)} – ${rupees(job.salaryMax)}`;
  return `${range} / ${job.salaryPeriod || "month"}`;
}

export const EMPLOYMENT_LABELS = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export { rupees };
