import type { HirerProfile, HirerProfilePatch } from '../lib/types/profile';
import type { JobDetail, JobInput } from '../lib/types/jobs';
import { normalizeMultiline, normalizeText } from './format';
import type { HirerDetailsForm, JobDetailsForm } from './validation';

/** Form ⇄ API mapping for the hirer's job and business forms. */

export function emptyJobDetails(hirer: HirerProfile | null): JobDetailsForm {
  const address = hirer?.address;
  return {
    title: '',
    description: '',
    salaryType: 'monthly',
    salaryAmount: '',
    shift: 'day',
    timingStart: '',
    timingEnd: '',
    openings: '1',
    area: '',
    // Most hirers post work at their own address, so we start from it.
    city: address?.city ?? '',
    district: address?.city ?? '',
    state: address?.state ?? '',
    pincode: address?.pincode ?? '',
    requirements: [],
    languages: [],
    benefits: [],
  };
}

export function jobDetailsFrom(job: JobDetail): JobDetailsForm {
  return {
    title: job.title,
    description: job.description,
    salaryType: job.salary.type,
    salaryAmount: String(job.salary.amount),
    shift: job.shift,
    timingStart: job.timings?.start ?? '',
    timingEnd: job.timings?.end ?? '',
    openings: String(job.openings),
    area: job.location.area ?? '',
    city: job.location.city,
    district: job.location.district,
    state: job.location.state,
    pincode: job.location.pincode,
    requirements: job.requirements,
    languages: job.languages,
    benefits: job.benefits,
  };
}

export function jobFieldsFrom(values: JobDetailsForm): Omit<JobInput, 'sectorId' | 'proposedSectorName'> {
  return {
    title: normalizeText(values.title),
    description: normalizeMultiline(values.description),
    salary: { type: values.salaryType, amount: Number(values.salaryAmount) },
    shift: values.shift,
    timings: values.timingStart && values.timingEnd ? { start: values.timingStart, end: values.timingEnd } : null,
    openings: Number(values.openings),
    location: {
      area: normalizeText(values.area) || null,
      city: normalizeText(values.city),
      district: normalizeText(values.district),
      state: values.state,
      pincode: values.pincode,
    },
    requirements: values.requirements,
    languages: values.languages,
    benefits: values.benefits,
  };
}

export function hirerDetailsFrom(hirer: HirerProfile): HirerDetailsForm {
  return {
    hirerType: hirer.hirerType ?? 'individual',
    name: hirer.name ?? '',
    businessName: hirer.businessName ?? '',
    line1: hirer.address?.line1 ?? '',
    city: hirer.address?.city ?? '',
    state: hirer.address?.state ?? '',
    pincode: hirer.address?.pincode ?? '',
    gstin: hirer.gstin ?? '',
  };
}

export function hirerPatch(values: HirerDetailsForm): HirerProfilePatch {
  return {
    hirerType: values.hirerType,
    name: normalizeText(values.name),
    businessName: values.hirerType === 'individual' ? null : normalizeText(values.businessName) || null,
    address: {
      line1: normalizeText(values.line1),
      city: normalizeText(values.city),
      state: values.state,
      pincode: values.pincode,
    },
    gstin: values.gstin.trim().toUpperCase() || null,
  };
}
