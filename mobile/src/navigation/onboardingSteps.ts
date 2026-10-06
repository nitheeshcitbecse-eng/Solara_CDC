/** Route order of each onboarding wizard; the server stores the step to resume from. */
export const USER_ONBOARDING_STEPS = ['UserOnboardingAbout', 'UserOnboardingEducation', 'UserOnboardingWork'] as const;

export const ADMIN_ONBOARDING_STEPS = [
  'AdminOnboardingType',
  'AdminOnboardingDetails',
  'AdminOnboardingAadhaar',
  'VerificationStatus',
] as const;
