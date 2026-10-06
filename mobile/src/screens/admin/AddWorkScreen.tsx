import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AddWorkWizard } from '../../Components/domain/AddWorkWizard';
import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { useJob } from '../../api/queries/jobs';
import { useMe } from '../../api/queries/profile';
import { useSectors } from '../../api/queries/sectors';
import type { RootScreenProps } from '../../lib/types/navigation';

/**
 * Loads what the wizard needs (sectors, the hirer's address, and an existing draft
 * when continuing one), then hands it to <AddWorkWizard> as initial state.
 */
export function AddWorkScreen({ navigation, route }: RootScreenProps<'AddWork'>) {
  const jobId = route.params?.jobId ?? null;
  const { t } = useTranslation();
  const me = useMe();
  const sectors = useSectors();
  const needsDraft = jobId !== null;
  const draft = useJob(jobId ?? '', needsDraft);

  const loading = me.isPending || sectors.isPending || (needsDraft && draft.isPending);
  const error = me.error ?? sectors.error ?? (needsDraft ? draft.error : null);

  if (loading || error) {
    return (
      <Screen header={<Header title={t('addWork.title')} />}>
        {error ? (
          <ErrorState
            error={error}
            onRetry={() => {
              void me.refetch();
              void sectors.refetch();
              if (needsDraft) void draft.refetch();
            }}
          />
        ) : (
          <ScreenSkeleton />
        )}
      </Screen>
    );
  }

  // Only verified hirers can post; the server enforces this too (403).
  if (me.data?.hirer?.aadhaar.status !== 'verified') {
    return (
      <Screen header={<Header title={t('addWork.title')} />}>
        <EmptyState
          icon={ShieldCheck}
          title={t('addWork.verifyFirstTitle')}
          body={t('dashboard.verifyFirst')}
          action={{ label: t('dashboard.viewStatus'), onPress: () => navigation.replace('VerificationStatus') }}
        />
      </Screen>
    );
  }

  return (
    <AddWorkWizard
      sectors={sectors.data ?? []}
      hirer={me.data.hirer}
      initialJob={needsDraft ? (draft.data ?? null) : null}
    />
  );
}
