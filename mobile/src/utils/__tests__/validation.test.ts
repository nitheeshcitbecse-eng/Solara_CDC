import { toIsoDate } from '../format';
import {
  aboutSchema,
  applySchema,
  educationSchema,
  hirerDetailsSchema,
  jobDetailsSchema,
  phoneSchema,
  reasonSchema,
  workExperienceSchema,
} from '../validation';

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

describe('validation schemas', () => {
  it('accepts only valid Indian mobile numbers', () => {
    expect(phoneSchema.safeParse({ phone: '9876543210' }).success).toBe(true);
    expect(firstMessage(phoneSchema.safeParse({ phone: '5876543210' }))).toBe('validation.phone');
    expect(phoneSchema.safeParse({ phone: '987654321' }).success).toBe(false);
  });

  it('validates pincodes', () => {
    const base = { qualification: 'graduate', state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai' } as const;
    expect(educationSchema.safeParse({ ...base, pincode: '600042' }).success).toBe(true);
    expect(firstMessage(educationSchema.safeParse({ ...base, pincode: '060042' }))).toBe('validation.pincode');
  });

  it('requires adults for job seekers', () => {
    const base = { fullName: 'Prasina Selvam', gender: 'female', email: '', languagesKnown: ['ta'] } as const;
    expect(aboutSchema.safeParse({ ...base, dateOfBirth: '1996-05-14' }).success).toBe(true);
    const thisYear = new Date().getFullYear();
    expect(firstMessage(aboutSchema.safeParse({ ...base, dateOfBirth: `${thisYear - 10}-01-01` }))).toBe('validation.minAge');
    expect(firstMessage(aboutSchema.safeParse({ ...base, dateOfBirth: '1996-05-14', email: 'bad' }))).toBe('validation.email');
    expect(aboutSchema.safeParse({ ...base, dateOfBirth: '1996-05-14', fullName: 'பிரசினா' }).success).toBe(true);
  });

  it('orders work experience months', () => {
    const entry = { id: 'x', title: 'Cook', employer: 'Mess', from: '2020-05', to: '2019-01' };
    expect(firstMessage(workExperienceSchema.safeParse(entry))).toBe('validation.monthOrder');
    expect(workExperienceSchema.safeParse({ ...entry, to: '' }).success).toBe(true);
  });

  it('enforces the 20–500 character apply message', () => {
    const base = { expectedSalary: '', availableFrom: '', sharePhone: false };
    expect(firstMessage(applySchema.safeParse({ ...base, message: 'Too short' }))).toBe('validation.tooShort');
    expect(applySchema.safeParse({ ...base, message: 'I have five years of cooking experience.' }).success).toBe(true);
    expect(applySchema.safeParse({ ...base, message: 'x'.repeat(501) }).success).toBe(false);
    expect(
      firstMessage(applySchema.safeParse({ ...base, message: 'I have five years of cooking experience.', availableFrom: '2000-01-01' })),
    ).toBe('validation.pastDate');
    expect(
      applySchema.safeParse({ ...base, message: 'I have five years of cooking experience.', availableFrom: toIsoDate(new Date()) }).success,
    ).toBe(true);
  });

  it('checks salary ranges per pay type and timing pairs', () => {
    const base = {
      title: 'Home cook',
      description: 'Cook breakfast and lunch for a family of four in Adyar.',
      salaryType: 'monthly',
      salaryAmount: '18000',
      shift: 'day',
      timingStart: '08:00',
      timingEnd: '14:00',
      openings: '1',
      area: '',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600020',
      requirements: [],
      languages: ['ta'],
      benefits: [],
    } as const;
    expect(jobDetailsSchema.safeParse(base).success).toBe(true);
    expect(firstMessage(jobDetailsSchema.safeParse({ ...base, salaryType: 'daily' }))).toBe('validation.salaryRange');
    expect(firstMessage(jobDetailsSchema.safeParse({ ...base, timingEnd: '' }))).toBe('validation.timingPair');
    expect(firstMessage(jobDetailsSchema.safeParse({ ...base, openings: '0' }))).toBe('validation.openings');
  });

  it('requires a business name for businesses but not individuals', () => {
    const base = {
      hirerType: 'individual',
      name: 'Meena Iyer',
      businessName: '',
      line1: '4, Race Course Road',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641018',
      gstin: '',
    } as const;
    expect(hirerDetailsSchema.safeParse(base).success).toBe(true);
    expect(hirerDetailsSchema.safeParse({ ...base, hirerType: 'business' }).success).toBe(false);
    expect(firstMessage(hirerDetailsSchema.safeParse({ ...base, gstin: '1234' }))).toBe('validation.gstin');
    expect(hirerDetailsSchema.safeParse({ ...base, gstin: '33abcde1234f1z5' }).success).toBe(true);
  });

  it('requires a reason for destructive moderation actions', () => {
    expect(reasonSchema.safeParse({ reason: 'ok' }).success).toBe(false);
    expect(reasonSchema.safeParse({ reason: 'Repeated no-shows' }).success).toBe(true);
  });
});
