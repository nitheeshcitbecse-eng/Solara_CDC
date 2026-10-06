import type { AadhaarInfo, HirerProfile, SeekerProfile, Settings } from '../../../lib/types/profile';
import type { DbDocument, DbUser } from '../db';
import { mediaRef } from './media';
import { ago } from './time';

export const IDS = {
  prasina: 'usr_prasina',
  karthik: 'usr_karthik',
  anita: 'usr_anita',
  lakshmi: 'usr_lakshmi',
  divya: 'usr_divya',
  suresh: 'usr_suresh',
  imran: 'usr_imran',
  pooja: 'usr_pooja',
  arun: 'usr_arun',
  meena: 'usr_meena',
  rahul: 'usr_rahul',
  fatima: 'usr_fatima',
  vikram: 'usr_vikram',
  joseph: 'usr_joseph',
  owner: 'usr_owner',
} as const;

const SUPERADMIN_CREDENTIALS = { email: 'owner@solara.app', password: 'Solara@123' } as const;

export function defaultSettings(language: Settings['language'] = 'en'): Settings {
  return {
    language,
    notifications: { applications: true, messages: true, jobAlerts: true },
    privacy: { profileVisibleToVerifiedHirers: true, sharePhoneByDefault: false },
  };
}

const NO_AADHAAR: AadhaarInfo = { status: 'none', last4: null, rejectionReason: null, uploadedAt: null };

export function emptySeekerProfile(): SeekerProfile {
  return {
    fullName: null,
    gender: null,
    dateOfBirth: null,
    email: null,
    languagesKnown: [],
    qualification: null,
    state: null,
    district: null,
    city: null,
    pincode: null,
    workHistory: [],
    currentWork: null,
    skills: [],
    preferredSectorIds: [],
    expectedSalary: null,
    availability: null,
    onboardingStep: 1,
    aadhaar: { ...NO_AADHAAR },
  };
}

export function emptyHirerProfile(): HirerProfile {
  return {
    hirerType: null,
    name: null,
    businessName: null,
    address: null,
    gstin: null,
    onboardingStep: 1,
    aadhaar: { ...NO_AADHAAR },
  };
}

type SeekerSeed = Omit<SeekerProfile, 'onboardingStep' | 'aadhaar'> & { aadhaar: AadhaarInfo };

function seeker(
  now: number,
  id: string,
  phone: string,
  createdDaysAgo: number,
  profile: SeekerSeed,
  status: DbUser['status'] = 'active',
  statusReason: string | null = null,
): DbUser {
  return {
    id,
    role: 'user',
    phone,
    email: profile.email,
    password: null,
    name: profile.fullName,
    status,
    statusReason,
    createdAt: ago(now, { days: createdDaysAgo }),
    profileComplete: true,
    seeker: { ...profile, onboardingStep: 3 },
    hirer: null,
    settings: defaultSettings(profile.languagesKnown[0] ?? 'en'),
    deletionRequestedAt: null,
    savedJobIds: [],
  };
}

function hirer(
  now: number,
  id: string,
  phone: string,
  createdDaysAgo: number,
  profile: Omit<HirerProfile, 'onboardingStep'>,
): DbUser {
  return {
    id,
    role: 'admin',
    phone,
    email: null,
    password: null,
    name: profile.name,
    status: 'active',
    statusReason: null,
    createdAt: ago(now, { days: createdDaysAgo }),
    profileComplete: true,
    seeker: null,
    hirer: { ...profile, onboardingStep: 4 },
    settings: defaultSettings(),
    deletionRequestedAt: null,
    savedJobIds: [],
  };
}

const verified = (now: number, last4: string, daysAgo: number): AadhaarInfo => ({
  status: 'verified',
  last4,
  rejectionReason: null,
  uploadedAt: ago(now, { days: daysAgo }),
});

export function buildUsers(now: number): DbUser[] {
  return [
    seeker(now, IDS.prasina, '+919876543210', 120, {
      fullName: 'Prasina Selvam',
      gender: 'female',
      dateOfBirth: '1996-05-14',
      email: 'prasina.selvam@example.com',
      languagesKnown: ['ta', 'en'],
      qualification: 'higher_secondary',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      pincode: '600042',
      workHistory: [
        { id: 'wx_p1', title: 'Family cook', employer: 'Lakshmi Residence', from: '2019-06', to: '2023-03' },
        { id: 'wx_p2', title: 'Kitchen helper', employer: 'Saravana Mess', from: '2017-01', to: '2019-05' },
      ],
      currentWork: 'Part-time cook for two families',
      skills: ['South Indian cooking', 'North Indian cooking', 'Meal planning', 'Kitchen hygiene'],
      preferredSectorIds: ['sec_cooking', 'sec_caretaking'],
      expectedSalary: 18000,
      availability: 'within_week',
      aadhaar: verified(now, '4821', 118),
    }),
    seeker(now, IDS.karthik, '+919845012345', 60, {
      fullName: 'Karthik Raja',
      gender: 'male',
      dateOfBirth: '1990-11-02',
      email: null,
      languagesKnown: ['ta', 'en'],
      qualification: 'secondary',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      pincode: '600020',
      workHistory: [{ id: 'wx_k1', title: 'Cab driver', employer: 'City Cabs', from: '2015-02', to: '2024-08' }],
      currentWork: null,
      skills: ['Car driving', 'City routes', 'Vehicle care'],
      preferredSectorIds: ['sec_driving'],
      expectedSalary: 22000,
      availability: 'immediate',
      aadhaar: verified(now, '3390', 58),
    }),
    seeker(now, IDS.anita, '+919810098100', 9, {
      fullName: 'Anita Devi',
      gender: 'female',
      dateOfBirth: '1988-03-21',
      email: null,
      languagesKnown: ['hi'],
      qualification: 'diploma',
      state: 'Delhi',
      district: 'South Delhi',
      city: 'New Delhi',
      pincode: '110017',
      workHistory: [{ id: 'wx_a1', title: 'Home nurse aide', employer: 'Sewa Care', from: '2018-07', to: null }],
      currentWork: 'Home nurse aide',
      skills: ['Patient care', 'First aid', 'Elderly care'],
      preferredSectorIds: ['sec_caretaking'],
      expectedSalary: 20000,
      availability: 'within_month',
      aadhaar: { status: 'pending', last4: '6612', rejectionReason: null, uploadedAt: ago(now, { days: 2 }) },
    }),
    seeker(now, IDS.lakshmi, '+919884455667', 40, {
      fullName: 'Lakshmi Narayanan',
      gender: 'female',
      dateOfBirth: '1985-08-09',
      email: null,
      languagesKnown: ['ta'],
      qualification: 'primary',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      pincode: '600041',
      workHistory: [{ id: 'wx_l1', title: 'Housekeeper', employer: 'Sea View Apartments', from: '2016-04', to: '2024-12' }],
      currentWork: null,
      skills: ['Deep cleaning', 'Laundry', 'Elderly care'],
      preferredSectorIds: ['sec_cleaning', 'sec_caretaking'],
      expectedSalary: 14000,
      availability: 'immediate',
      aadhaar: verified(now, '1187', 39),
    }),
    seeker(now, IDS.divya, '+919900112233', 25, {
      fullName: 'Divya Ramesh',
      gender: 'female',
      dateOfBirth: '1998-01-30',
      email: 'divya.r@example.com',
      languagesKnown: ['kn', 'en', 'hi'],
      qualification: 'graduate',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city: 'Bengaluru',
      pincode: '560034',
      workHistory: [{ id: 'wx_d1', title: 'Tuition teacher', employer: 'Bright Minds Tuition', from: '2021-06', to: null }],
      currentWork: 'Evening tuition for classes 6–10',
      skills: ['Mathematics', 'Spoken English', 'Science'],
      preferredSectorIds: ['sec_teaching'],
      expectedSalary: 25000,
      availability: 'part_time',
      aadhaar: verified(now, '9045', 24),
    }),
    seeker(
      now,
      IDS.suresh,
      '+919123456780',
      80,
      {
        fullName: 'Suresh Babu',
        gender: 'male',
        dateOfBirth: '1979-12-12',
        email: null,
        languagesKnown: ['te', 'en'],
        qualification: 'secondary',
        state: 'Telangana',
        district: 'Hyderabad',
        city: 'Hyderabad',
        pincode: '500032',
        workHistory: [],
        currentWork: null,
        skills: ['Driving'],
        preferredSectorIds: ['sec_driving'],
        expectedSalary: 19000,
        availability: 'immediate',
        aadhaar: { ...NO_AADHAAR },
      },
      'suspended',
      'Repeated no-shows reported by three hirers.',
    ),
    seeker(now, IDS.imran, '+919867001122', 14, {
      fullName: 'Imran Shaikh',
      gender: 'male',
      dateOfBirth: '1993-06-18',
      email: null,
      languagesKnown: ['ur', 'hi', 'mr'],
      qualification: 'higher_secondary',
      state: 'Maharashtra',
      district: 'Mumbai Suburban',
      city: 'Mumbai',
      pincode: '400070',
      workHistory: [{ id: 'wx_i1', title: 'Line cook', employer: 'Hotel Sagar', from: '2014-09', to: '2023-11' }],
      currentWork: null,
      skills: ['Tandoor', 'Mughlai cooking'],
      preferredSectorIds: ['sec_cooking'],
      expectedSalary: 21000,
      availability: 'within_week',
      aadhaar: verified(now, '5530', 13),
    }),
    seeker(now, IDS.pooja, '+919822334455', 5, {
      fullName: 'Pooja Kulkarni',
      gender: 'female',
      dateOfBirth: '2000-09-05',
      email: null,
      languagesKnown: ['mr', 'hi', 'en'],
      qualification: 'graduate',
      state: 'Maharashtra',
      district: 'Pune',
      city: 'Pune',
      pincode: '411038',
      workHistory: [],
      currentWork: null,
      skills: ['Childcare', 'Spoken English'],
      preferredSectorIds: ['sec_caretaking', 'sec_teaching'],
      expectedSalary: 16000,
      availability: 'immediate',
      aadhaar: { ...NO_AADHAAR },
    }),
    hirer(now, IDS.arun, '+919876500001', 150, {
      hirerType: 'business',
      name: 'Arun Kumar',
      businessName: 'Arun Home Services',
      address: { line1: '12, 2nd Cross Street, Adyar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600020' },
      gstin: '33ABCDE1234F1Z5',
      aadhaar: verified(now, '7712', 149),
    }),
    hirer(now, IDS.meena, '+919443322110', 90, {
      hirerType: 'individual',
      name: 'Meena Iyer',
      businessName: null,
      address: { line1: '4, Race Course Road', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641018' },
      gstin: null,
      aadhaar: verified(now, '2045', 89),
    }),
    hirer(now, IDS.rahul, '+919811122233', 70, {
      hirerType: 'agency',
      name: 'Rahul Sharma',
      businessName: 'CareFirst Staffing',
      address: { line1: 'B-14, Lajpat Nagar II', city: 'New Delhi', state: 'Delhi', pincode: '110024' },
      gstin: '07FGHIJ5678K1Z2',
      aadhaar: verified(now, '8801', 69),
    }),
    hirer(now, IDS.fatima, '+919700011122', 3, {
      hirerType: 'business',
      name: 'Fatima Begum',
      businessName: 'Green Leaf Restaurant',
      address: { line1: 'Road No. 12, Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
      gstin: null,
      aadhaar: { status: 'pending', last4: '3378', rejectionReason: null, uploadedAt: ago(now, { days: 3 }) },
    }),
    hirer(now, IDS.vikram, '+919845500099', 20, {
      hirerType: 'business',
      name: 'Vikram Rao',
      businessName: 'Vikram Logistics',
      address: { line1: 'Plot 7, Peenya Industrial Area', city: 'Bengaluru', state: 'Karnataka', pincode: '560058' },
      gstin: null,
      aadhaar: {
        status: 'rejected',
        last4: '0000',
        rejectionReason: 'The document photo is blurred. Please upload a clear photo of the front side.',
        uploadedAt: ago(now, { days: 19 }),
      },
    }),
    hirer(now, IDS.joseph, '+919895566778', 45, {
      hirerType: 'individual',
      name: 'Joseph Mathew',
      businessName: null,
      address: { line1: 'Panampilly Nagar', city: 'Kochi', state: 'Kerala', pincode: '682036' },
      gstin: null,
      aadhaar: verified(now, '4410', 44),
    }),
    {
      id: IDS.owner,
      role: 'superadmin',
      phone: null,
      email: SUPERADMIN_CREDENTIALS.email,
      password: SUPERADMIN_CREDENTIALS.password,
      name: 'Solara Owner',
      status: 'active',
      statusReason: null,
      createdAt: ago(now, { days: 365 }),
      profileComplete: true,
      seeker: null,
      hirer: null,
      settings: defaultSettings(),
      deletionRequestedAt: null,
      savedJobIds: [],
    },
  ];
}

/** Every seeded account with an uploaded Aadhaar gets a sample (clearly fake) document. */
export function buildDocuments(users: readonly DbUser[]): DbDocument[] {
  return users.flatMap((user) => {
    const aadhaar = user.seeker?.aadhaar ?? user.hirer?.aadhaar;
    if (!aadhaar || aadhaar.status === 'none' || !aadhaar.uploadedAt) return [];
    return [
      {
        id: `doc_${user.id}_front`,
        ownerId: user.id,
        kind: 'aadhaar_front' as const,
        mimeType: 'image/jpeg',
        uri: mediaRef('sampleDocument'),
        uploadedAt: aadhaar.uploadedAt,
      },
    ];
  });
}
