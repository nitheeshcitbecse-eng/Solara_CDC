import { SHIFTS, type Salary, type Sector } from '../../../lib/types/jobs';
import type { DbJob, DbUser, MockDb } from '../db';
import { byNewest, caller, fail, noContent, ok, paginate, route, type Route } from '../http';
import { toJobDetail, toJobSummary, toSector } from '../serializers';

/** Monthly-equivalent pay so the "minimum salary" filter compares like with like. */
function monthlyEquivalent(salary: Salary): number {
  if (salary.type === 'daily') return salary.amount * 26;
  if (salary.type === 'hourly') return salary.amount * 8 * 26;
  return salary.amount;
}

export function sortedSectors(db: MockDb): Sector[] {
  return db.sectors.map((sector) => toSector(sector, db)).sort((a, b) => a.name.localeCompare(b.name));
}

function matchesQuery(job: DbJob, db: MockDb, q: string): boolean {
  const sector = db.sectors.find((candidate) => candidate.id === job.sectorId);
  const haystack = [job.title, job.description, sector?.name, job.location.city, job.location.area]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/** Jobs a viewer may open: active ones, plus their own (hirer), applied-to ones (seeker) and everything for the owner. */
function canView(job: DbJob, db: MockDb, viewer: DbUser): boolean {
  if (job.status === 'active') return true;
  if (viewer.role === 'superadmin' || job.hirerId === viewer.id) return true;
  return db.applications.some((app) => app.jobId === job.id && app.seekerId === viewer.id);
}

export const jobRoutes: Route[] = [
  route('GET', '/sectors', 'any', ({ db }) => ok(sortedSectors(db))),

  route('GET', '/jobs', 'any', (request) => {
    const viewer = caller(request);
    const { db, query } = request;
    const minSalary = Number(query.minSalary) || 0;
    const shift = SHIFTS.find((candidate) => candidate === query.shift);
    const city = query.city?.trim().toLowerCase();
    const viewerCity = viewer.seeker?.city?.toLowerCase();

    const jobs = db.jobs
      .filter((job) => job.status === 'active')
      .filter((job) => !query.sectorId || job.sectorId === query.sectorId)
      .filter((job) => !query.q || matchesQuery(job, db, query.q))
      .filter((job) => !city || job.location.city.toLowerCase().includes(city))
      .filter((job) => !shift || job.shift === shift)
      .filter((job) => monthlyEquivalent(job.salary) >= minSalary)
      // Jobs in the seeker's own city first, then newest.
      .sort((a, b) => {
        const aLocal = a.location.city.toLowerCase() === viewerCity ? 0 : 1;
        const bLocal = b.location.city.toLowerCase() === viewerCity ? 0 : 1;
        return aLocal - bLocal || byNewest(a, b);
      });

    const page = paginate(jobs, query);
    return ok({ ...page, items: page.items.map((job) => toJobSummary(job, db, viewer)) });
  }),

  route('GET', '/jobs/:id', 'any', (request) => {
    const viewer = caller(request);
    const job = request.db.jobs.find((candidate) => candidate.id === request.params.id);
    if (!job || !canView(job, request.db, viewer)) throw fail.notFound();
    return ok(toJobDetail(job, request.db, viewer));
  }),

  route('POST', '/me/saved-jobs/:id', ['user'], (request) => {
    const viewer = caller(request);
    const job = request.db.jobs.find((candidate) => candidate.id === request.params.id);
    if (!job) throw fail.notFound();
    if (!viewer.savedJobIds.includes(job.id)) viewer.savedJobIds = [job.id, ...viewer.savedJobIds];
    return noContent();
  }),

  route('DELETE', '/me/saved-jobs/:id', ['user'], (request) => {
    const viewer = caller(request);
    viewer.savedJobIds = viewer.savedJobIds.filter((id) => id !== request.params.id);
    return noContent();
  }),

  route('GET', '/me/saved-jobs', ['user'], (request) => {
    const viewer = caller(request);
    const { db } = request;
    const jobs = viewer.savedJobIds
      .map((id) => db.jobs.find((job) => job.id === id))
      .filter((job): job is DbJob => job !== undefined && canView(job, db, viewer));
    const page = paginate(jobs, request.query);
    return ok({ ...page, items: page.items.map((job) => toJobSummary(job, db, viewer)) });
  }),

  route('GET', '/me/jobs', ['user'], (request) => {
    const viewer = caller(request);
    const { db, query } = request;
    const state = query.state === 'past' ? 'past' : 'current';
    const engagements = db.engagements
      .filter((engagement) => engagement.seekerId === viewer.id)
      .filter((engagement) => (state === 'current' ? engagement.endedOn === null : engagement.endedOn !== null))
      .sort((a, b) => b.startedOn.localeCompare(a.startedOn));
    const page = paginate(engagements, query);
    const items = page.items.flatMap((engagement) => {
      const job = db.jobs.find((candidate) => candidate.id === engagement.jobId);
      if (!job) return [];
      return [
        {
          id: engagement.id,
          job: toJobSummary(job, db, viewer),
          startedOn: engagement.startedOn,
          endedOn: engagement.endedOn,
          applicationId: engagement.applicationId,
        },
      ];
    });
    return ok({ ...page, items });
  }),
];
