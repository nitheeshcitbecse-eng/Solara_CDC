import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { SeekerAboutFields } from '../../Components/domain/SeekerAboutFields';
import { SeekerEducationFields } from '../../Components/domain/SeekerEducationFields';
import { SeekerWorkFields } from '../../Components/domain/SeekerWorkFields';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Button } from '../../Components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useMe, useUpdateSeekerProfile } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import type { RootScreenProps } from '../../lib/types/navigation';
import type { SeekerProfile, SeekerProfilePatch } from '../../lib/types/profile';
import {
  aboutFormFrom,
  aboutPatch,
  educationFormFrom,
  educationPatch,
  EMPTY_ABOUT,
  EMPTY_EDUCATION,
  EMPTY_WORK,
  workFormFrom,
  workPatch,
} from '../../utils/profileForms';
import { aboutSchema, educationSchema, workSchema, type AboutForm, type EducationForm, type WorkForm } from '../../utils/validation';

type SectionProps = {
  seeker: SeekerProfile;
  accountEmail: string | null;
  saving: boolean;
  onSave: (patch: SeekerProfilePatch, markClean: () => void) => void;
  saveLabel: string;
};

function AboutEditor({ seeker, accountEmail, saving, onSave, saveLabel }: SectionProps) {
  const { control, handleSubmit, reset, formState } = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    defaultValues: EMPTY_ABOUT,
    values: aboutFormFrom(seeker, accountEmail),
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !saving);
  const submit = handleSubmit((values) => onSave(aboutPatch(values), () => reset(values)));
  return (
    <>
      <SeekerAboutFields control={control} />
      <Button label={saveLabel} onPress={() => void submit()} loading={saving} />
    </>
  );
}

function EducationEditor({ seeker, saving, onSave, saveLabel }: SectionProps) {
  const { control, handleSubmit, reset, setValue, formState } = useForm<EducationForm>({
    resolver: zodResolver(educationSchema),
    defaultValues: EMPTY_EDUCATION,
    values: educationFormFrom(seeker),
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !saving);
  const submit = handleSubmit((values) => onSave(educationPatch(values), () => reset(values)));
  return (
    <>
      <SeekerEducationFields control={control} setValue={setValue} />
      <Button label={saveLabel} onPress={() => void submit()} loading={saving} />
    </>
  );
}

function WorkEditor({ seeker, saving, onSave, saveLabel }: SectionProps) {
  const { control, handleSubmit, reset, formState } = useForm<WorkForm>({
    resolver: zodResolver(workSchema),
    defaultValues: EMPTY_WORK,
    values: workFormFrom(seeker),
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !saving);
  const submit = handleSubmit((values) => onSave(workPatch(values), () => reset(values)));
  return (
    <>
      <SeekerWorkFields control={control} />
      <Button label={saveLabel} onPress={() => void submit()} loading={saving} />
    </>
  );
}

const TITLES = { about: 'onboarding.stepAbout', education: 'onboarding.stepEducation', work: 'profile.workSection' } as const;

/** Edits one section of the job seeker profile with the same fields as onboarding. */
export function ProfileEditScreen({ navigation, route }: RootScreenProps<'ProfileEdit'>) {
  const { section } = route.params;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const save = useUpdateSeekerProfile();
  const seeker = me.data?.seeker;
  const [saved, setSaved] = useState(false);

  // Leave only after the form has re-rendered as clean, so the unsaved-changes guard is off.
  useEffect(() => {
    if (saved) navigation.goBack();
  }, [saved, navigation]);

  const onSave = (patch: SeekerProfilePatch, markClean: () => void) => {
    save.mutate(patch, {
      onSuccess: () => {
        markClean();
        showToast(t('profile.saved'), 'success');
        setSaved(true);
      },
    });
  };

  if (me.isPending || me.isError || !seeker) {
    return (
      <Screen header={<Header title={t(TITLES[section])} />}>
        {me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : <ScreenSkeleton />}
      </Screen>
    );
  }

  const props: SectionProps = {
    seeker,
    accountEmail: me.data.user.email,
    saving: save.isPending,
    onSave,
    saveLabel: t('common.saveChanges'),
  };

  return (
    <Screen header={<Header title={t(TITLES[section])} />}>
      {section === 'about' ? <AboutEditor {...props} /> : null}
      {section === 'education' ? <EducationEditor {...props} /> : null}
      {section === 'work' ? <WorkEditor {...props} /> : null}
      {save.error ? <InlineAlert tone="danger" message={errorMessage(save.error)} /> : null}
    </Screen>
  );
}
