import { useMutation, useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { createReport, createSupportTicket, getFaqs } from '../support';
import type { ReportBody, SupportTicketBody } from '../../lib/types/support';

/** FAQs are localised by the server, so the active language is part of the key. */
export function useFaqs(language: string) {
  return useQuery({ queryKey: queryKeys.help.faqs(language), queryFn: getFaqs, staleTime: 60 * 60_000 });
}

export function useCreateSupportTicket() {
  return useMutation({ mutationFn: (body: SupportTicketBody) => createSupportTicket(body) });
}

export function useCreateReport() {
  return useMutation({ mutationFn: (body: ReportBody) => createReport(body) });
}
