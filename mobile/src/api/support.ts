import type {
  Faq,
  ReportBody,
  ReportResponse,
  SupportTicketBody,
  SupportTicketResponse,
} from '../lib/types/support';
import { api } from './client';

export async function getFaqs(): Promise<Faq[]> {
  const { data } = await api.get<Faq[]>('/help/faqs');
  return data;
}

export async function createSupportTicket(body: SupportTicketBody): Promise<SupportTicketResponse> {
  const { data } = await api.post<SupportTicketResponse>('/support/tickets', body);
  return data;
}

export async function createReport(body: ReportBody): Promise<ReportResponse> {
  const { data } = await api.post<ReportResponse>('/reports', body);
  return data;
}
