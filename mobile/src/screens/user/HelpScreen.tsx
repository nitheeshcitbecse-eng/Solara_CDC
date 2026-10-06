import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Mail } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { ChipGroup } from '../../Components/ui/ChipGroup';
import { Skeleton } from '../../Components/ui/Skeleton';
import { Text } from '../../Components/ui/Text';
import { TextField } from '../../Components/ui/TextField';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useCreateSupportTicket, useFaqs } from '../../api/queries/support';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { colors, MIN_TOUCH, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { SUPPORT_TOPICS, type Faq } from '../../lib/types/support';
import { normalizeMultiline } from '../../utils/format';
import { LIMITS, supportSchema, type SupportForm } from '../../utils/validation';

type FaqItemProps = { faq: Faq; expanded: boolean; onToggle: (id: string) => void };

const FaqItem = memo(function FaqItem({ faq, expanded, onToggle }: FaqItemProps) {
  return (
    <View style={styles.faq}>
      <Pressable
        onPress={() => onToggle(faq.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.faqHeader, pressed ? styles.pressed : null]}
      >
        <Text variant="bodyStrong" style={styles.flex}>
          {faq.question}
        </Text>
        {expanded ? (
          <ChevronUp size={sizes.icon} color={colors.textMuted} strokeWidth={2} />
        ) : (
          <ChevronDown size={sizes.icon} color={colors.textMuted} strokeWidth={2} />
        )}
      </Pressable>
      {expanded ? (
        <Text variant="body" color="textMuted" style={styles.answer}>
          {faq.answer}
        </Text>
      ) : null}
    </View>
  );
});

export function HelpScreen(_props: RootScreenProps<'Help'>) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const faqs = useFaqs(activeLanguage);
  const ticket = useCreateSupportTicket();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { control, handleSubmit, reset } = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
    defaultValues: { topic: 'jobs', message: '' },
  });

  const toggle = useCallback((id: string) => setExpanded((current) => (current === id ? null : id)), []);

  const submit = handleSubmit((values) => {
    ticket.mutate(
      { topic: values.topic, message: normalizeMultiline(values.message) },
      {
        onSuccess: () => {
          reset();
          showToast(t('help.sent'), 'success');
        },
      },
    );
  });

  const contactForm = (
    <View style={styles.contact}>
      <Text variant="heading" accessibilityRole="header">
        {t('help.contactTitle')}
      </Text>
      <Text variant="body" color="textMuted">
        {t('help.contactSubtitle')}
      </Text>
      <Controller
        control={control}
        name="topic"
        render={({ field, fieldState }) => (
          <ChipGroup
            label={t('help.topic')}
            options={SUPPORT_TOPICS.map((topic) => ({ value: topic, label: t(`enums.supportTopic.${topic}`) }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="message"
        render={({ field, fieldState }) => (
          <TextField
            label={t('help.message')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            maxLength={LIMITS.supportMessageMax}
            showCounter
          />
        )}
      />
      {ticket.error ? <InlineAlert tone="danger" message={errorMessage(ticket.error)} /> : null}
      <Button label={t('help.send')} onPress={() => void submit()} loading={ticket.isPending} />
      <View style={styles.email}>
        <Mail size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
        <Text variant="caption" color="textMuted">
          {t('help.email')}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen scroll={false} header={<Header title={t('menu.help')} />}>
      <FlatList
        data={faqs.data ?? []}
        keyExtractor={(faq) => faq.id}
        renderItem={({ item }) => <FaqItem faq={item} expanded={expanded === item.id} onToggle={toggle} />}
        extraData={expanded}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text variant="heading" accessibilityRole="header" style={styles.faqTitle}>
            {t('help.faqTitle')}
          </Text>
        }
        ListEmptyComponent={
          faqs.isPending ? (
            <View style={styles.skeletons}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} height={MIN_TOUCH + spacing.sm} radius={radius.md} />
              ))}
            </View>
          ) : faqs.isError ? (
            <ErrorState error={faqs.error} onRetry={() => void faqs.refetch()} />
          ) : null
        }
        ListFooterComponent={contactForm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xs },
  faqTitle: { marginBottom: spacing.xs },
  skeletons: { gap: spacing.xs },
  faq: { borderRadius: radius.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  faqHeader: { minHeight: MIN_TOUCH + spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  pressed: { backgroundColor: colors.surfaceMuted },
  answer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  contact: { marginTop: spacing.xl, gap: spacing.md },
  email: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center' },
});
