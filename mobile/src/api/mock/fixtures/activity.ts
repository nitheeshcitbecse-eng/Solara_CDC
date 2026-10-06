import type { ApplicationStatus, StatusEvent } from '../../../lib/types/applications';
import type {
  DbApplication,
  DbConversation,
  DbEngagement,
  DbMessage,
  DbNotification,
} from '../db';
import { JOB_IDS } from './jobs';
import { mediaRef } from './media';
import { ago, dateFromNow } from './time';
import { IDS } from './users';

const VOICE = { url: mediaRef('sampleVoice'), durationSec: 15 };

type ApplicationSeed = {
  id: string;
  jobId: string;
  seekerId: string;
  /** Status changes as [status, daysAgo, hoursAgo]. The first entry is always "applied". */
  history: [ApplicationStatus, number, number][];
  message: string;
  expectedSalary?: number;
  availableInDays?: number;
  sharePhone: boolean;
  conversationId?: string;
  seenByHirer: boolean;
};

function buildApplication(now: number, seed: ApplicationSeed): DbApplication {
  const timeline: StatusEvent[] = seed.history.map(([status, days, hours]) => ({ status, at: ago(now, { days, hours }) }));
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  return {
    id: seed.id,
    jobId: seed.jobId,
    seekerId: seed.seekerId,
    status: last?.status ?? 'applied',
    createdAt: first?.at ?? ago(now, {}),
    message: seed.message,
    voiceIntro: VOICE,
    expectedSalary: seed.expectedSalary ?? null,
    availableFrom: seed.availableInDays === undefined ? null : dateFromNow(now, seed.availableInDays),
    sharePhone: seed.sharePhone,
    timeline,
    conversationId: seed.conversationId ?? null,
    seenByHirer: seed.seenByHirer,
  };
}

export function buildApplications(now: number): DbApplication[] {
  const seeds: ApplicationSeed[] = [
    {
      id: 'app_01',
      jobId: JOB_IDS.homeCook,
      seekerId: IDS.prasina,
      history: [
        ['applied', 2, 1],
        ['shortlisted', 1, 2],
      ],
      message:
        'Vanakkam sir. I have cooked for families for over five years, both South Indian and North Indian meals. I live 3 km from Adyar and can start next week.',
      expectedSalary: 18000,
      availableInDays: 7,
      sharePhone: true,
      conversationId: 'conv_01',
      seenByHirer: true,
    },
    {
      id: 'app_02',
      jobId: JOB_IDS.elderlyCoupleCook,
      seekerId: IDS.prasina,
      history: [['applied', 2, 6]],
      message:
        'Madam, I can cook simple low-salt vegetarian food. I cooked for an elderly lady for two years and understand diet restrictions.',
      expectedSalary: 16000,
      sharePhone: false,
      seenByHirer: false,
    },
    {
      id: 'app_03',
      jobId: JOB_IDS.patientCare,
      seekerId: IDS.prasina,
      history: [
        ['applied', 9, 0],
        ['shortlisted', 8, 0],
        ['hired', 6, 0],
      ],
      message:
        'I have cared for my grandmother after her surgery and know how to help with mobility and medicines. I am comfortable with night shifts.',
      expectedSalary: 22000,
      availableInDays: -5,
      sharePhone: true,
      conversationId: 'conv_02',
      seenByHirer: true,
    },
    {
      id: 'app_04',
      jobId: JOB_IDS.tandoorCook,
      seekerId: IDS.prasina,
      history: [
        ['applied', 18, 0],
        ['rejected', 15, 0],
      ],
      message: 'I have cooked tandoori dishes at home and in a mess kitchen. I learn quickly and work hard.',
      sharePhone: false,
      seenByHirer: true,
    },
    {
      id: 'app_05',
      jobId: JOB_IDS.weddingHelper,
      seekerId: IDS.prasina,
      history: [
        ['applied', 158, 0],
        ['hired', 155, 0],
      ],
      message: 'I have helped with bulk cooking for weddings and festivals in my area.',
      sharePhone: true,
      seenByHirer: true,
    },
    {
      id: 'app_06',
      jobId: JOB_IDS.housekeeping,
      seekerId: IDS.lakshmi,
      history: [['applied', 0, 3]],
      message:
        'I worked as a housekeeper in an apartment complex for eight years. I know deep cleaning and can join immediately.',
      expectedSalary: 14500,
      availableInDays: 1,
      sharePhone: true,
      seenByHirer: false,
    },
    {
      id: 'app_07',
      jobId: JOB_IDS.familyDriver,
      seekerId: IDS.karthik,
      history: [
        ['applied', 3, 0],
        ['shortlisted', 1, 4],
      ],
      message: 'I have nine years of city driving experience with a clean record. I know all routes around Adyar and OMR.',
      expectedSalary: 22000,
      availableInDays: 2,
      sharePhone: true,
      conversationId: 'conv_03',
      seenByHirer: true,
    },
    {
      id: 'app_08',
      jobId: JOB_IDS.elderlyCare,
      seekerId: IDS.anita,
      history: [['applied', 0, 5]],
      message: 'मैं छह साल से बुज़ुर्गों की देखभाल कर रही हूँ। दवाइयाँ समय पर देना और साथ में टहलना मेरा रोज़ का काम है।',
      expectedSalary: 20000,
      sharePhone: false,
      seenByHirer: false,
    },
    {
      id: 'app_09',
      jobId: JOB_IDS.clinicCleaner,
      seekerId: IDS.lakshmi,
      history: [
        ['applied', 3, 0],
        ['hired', 2, 0],
      ],
      message: 'I follow strict hygiene routines and have cleaned clinic-like spaces before.',
      sharePhone: true,
      seenByHirer: true,
    },
    {
      id: 'app_10',
      jobId: JOB_IDS.englishTrainer,
      seekerId: IDS.divya,
      history: [['applied', 2, 0]],
      message: 'I teach spoken English to school students every evening and would love to run weekend batches for adults.',
      sharePhone: false,
      seenByHirer: true,
    },
    {
      id: 'app_11',
      jobId: JOB_IDS.cateringHelper,
      seekerId: IDS.imran,
      history: [['applied', 1, 0]],
      message: 'Nine years in a hotel kitchen. I am fast at prep work and comfortable with large events.',
      expectedSalary: 21000,
      sharePhone: true,
      seenByHirer: false,
    },
    {
      id: 'app_12',
      jobId: JOB_IDS.babysitter,
      seekerId: IDS.pooja,
      history: [['applied', 1, 5]],
      message: 'I have looked after my two young cousins for years and enjoy playing and reading with children.',
      sharePhone: false,
      seenByHirer: false,
    },
    {
      id: 'app_13',
      jobId: JOB_IDS.shuttleDriver,
      seekerId: IDS.karthik,
      history: [
        ['applied', 7, 0],
        ['rejected', 5, 0],
      ],
      message: 'I can relocate to Bengaluru for this role.',
      sharePhone: false,
      seenByHirer: true,
    },
  ];
  return seeds.map((seed) => buildApplication(now, seed));
}

export function buildEngagements(now: number): DbEngagement[] {
  return [
    { id: 'eng_01', applicationId: 'app_03', jobId: JOB_IDS.patientCare, seekerId: IDS.prasina, startedOn: dateFromNow(now, -5), endedOn: null },
    {
      id: 'eng_02',
      applicationId: 'app_05',
      jobId: JOB_IDS.weddingHelper,
      seekerId: IDS.prasina,
      startedOn: dateFromNow(now, -150),
      endedOn: dateFromNow(now, -120),
    },
    { id: 'eng_03', applicationId: 'app_09', jobId: JOB_IDS.clinicCleaner, seekerId: IDS.lakshmi, startedOn: dateFromNow(now, -1), endedOn: null },
  ];
}

export function buildConversations(now: number): { conversations: DbConversation[]; messages: DbMessage[] } {
  const conversations: DbConversation[] = [
    {
      id: 'conv_01',
      seekerId: IDS.prasina,
      hirerId: IDS.arun,
      jobId: JOB_IDS.homeCook,
      applicationId: 'app_01',
      createdAt: ago(now, { days: 1, hours: 2 }),
      lastReadAt: { [IDS.prasina]: ago(now, { hours: 20 }), [IDS.arun]: ago(now, { hours: 2 }) },
    },
    {
      id: 'conv_02',
      seekerId: IDS.prasina,
      hirerId: IDS.rahul,
      jobId: JOB_IDS.patientCare,
      applicationId: 'app_03',
      createdAt: ago(now, { days: 6 }),
      lastReadAt: { [IDS.prasina]: ago(now, { days: 5 }), [IDS.rahul]: ago(now, { days: 5 }) },
    },
    {
      id: 'conv_03',
      seekerId: IDS.karthik,
      hirerId: IDS.arun,
      jobId: JOB_IDS.familyDriver,
      applicationId: 'app_07',
      createdAt: ago(now, { days: 1, hours: 4 }),
      lastReadAt: { [IDS.karthik]: ago(now, { hours: 3 }), [IDS.arun]: ago(now, { hours: 20 }) },
    },
  ];
  const messages: DbMessage[] = [
    { id: 'msg_c1_1', conversationId: 'conv_01', senderId: IDS.arun, text: 'Hello Prasina, thank you for applying. Your voice introduction was very clear.', createdAt: ago(now, { days: 1, hours: 2 }) },
    { id: 'msg_c1_2', conversationId: 'conv_01', senderId: IDS.arun, text: 'Could you come for a short trial cooking session on Thursday at 10 am?', createdAt: ago(now, { days: 1, hours: 1 }) },
    { id: 'msg_c1_3', conversationId: 'conv_01', senderId: IDS.prasina, text: 'Thank you, sir. Thursday 10 am works for me. Should I bring anything?', createdAt: ago(now, { hours: 21 }) },
    { id: 'msg_c1_4', conversationId: 'conv_01', senderId: IDS.arun, text: 'Nothing needed. The address is 12, 2nd Cross Street, Adyar. See you then.', createdAt: ago(now, { hours: 2 }) },
    { id: 'msg_c2_1', conversationId: 'conv_02', senderId: IDS.rahul, text: 'Congratulations! You have been selected for the patient care role.', createdAt: ago(now, { days: 6 }) },
    { id: 'msg_c2_2', conversationId: 'conv_02', senderId: IDS.prasina, text: 'Thank you so much. I will join on Monday.', createdAt: ago(now, { days: 5, hours: 23 }) },
    { id: 'msg_c3_1', conversationId: 'conv_03', senderId: IDS.arun, text: 'Hi Karthik, please bring your driving licence when we meet.', createdAt: ago(now, { days: 1, hours: 3 }) },
    { id: 'msg_c3_2', conversationId: 'conv_03', senderId: IDS.karthik, text: 'Yes sir, I will bring the original licence.', createdAt: ago(now, { hours: 20 }) },
    { id: 'msg_c3_3', conversationId: 'conv_03', senderId: IDS.karthik, text: 'What time should I come tomorrow?', createdAt: ago(now, { hours: 3 }) },
  ];
  return { conversations, messages };
}

export function buildNotifications(now: number): DbNotification[] {
  const n = (
    id: string,
    userId: string,
    type: DbNotification['type'],
    params: Record<string, string>,
    target: DbNotification['target'],
    when: { days?: number; hours?: number },
    read: boolean,
  ): DbNotification => ({ id, userId, type, params, target, createdAt: ago(now, when), read });

  return [
    n('ntf_01', IDS.prasina, 'message', { name: 'Arun Kumar' }, { kind: 'conversation', id: 'conv_01' }, { hours: 2 }, false),
    n('ntf_02', IDS.prasina, 'application_status', { jobTitle: 'Home cook for family of four', status: 'shortlisted' }, { kind: 'application', id: 'app_01' }, { days: 1, hours: 2 }, false),
    n('ntf_03', IDS.prasina, 'system', { topic: 'safety_tip' }, { kind: 'none', id: null }, { days: 3 }, false),
    n('ntf_04', IDS.prasina, 'application_status', { jobTitle: 'Patient care attendant', status: 'hired' }, { kind: 'application', id: 'app_03' }, { days: 6 }, true),
    n('ntf_05', IDS.prasina, 'application_status', { jobTitle: 'Tandoor cook – restaurant client', status: 'rejected' }, { kind: 'application', id: 'app_04' }, { days: 15 }, true),
    n('ntf_06', IDS.prasina, 'verification', { status: 'verified' }, { kind: 'verification', id: null }, { days: 118 }, true),
    n('ntf_07', IDS.arun, 'new_applicant', { name: 'Lakshmi Narayanan', jobTitle: 'Housekeeping staff – apartment complex' }, { kind: 'application', id: 'app_06' }, { hours: 3 }, false),
    n('ntf_08', IDS.arun, 'message', { name: 'Karthik Raja' }, { kind: 'conversation', id: 'conv_03' }, { hours: 3 }, false),
    n('ntf_09', IDS.arun, 'new_applicant', { name: 'Anita Devi', jobTitle: 'Elderly caretaker (day shift)' }, { kind: 'application', id: 'app_08' }, { hours: 5 }, false),
    n('ntf_10', IDS.arun, 'new_applicant', { name: 'Imran Shaikh', jobTitle: 'Kitchen helper – catering' }, { kind: 'application', id: 'app_11' }, { days: 1 }, false),
    n('ntf_11', IDS.arun, 'job_review', { jobTitle: 'Pantry assistant – IT office', status: 'pending_review' }, { kind: 'job', id: JOB_IDS.pantry }, { days: 1 }, true),
    n('ntf_12', IDS.arun, 'verification', { status: 'verified' }, { kind: 'verification', id: null }, { days: 149 }, true),
  ];
}
