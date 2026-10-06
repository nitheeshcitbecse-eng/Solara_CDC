import { Image } from 'expo-image';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { Skeleton } from '../../Components/ui/Skeleton';
import { Text } from '../../Components/ui/Text';
import { useDocumentUrl } from '../../api/queries/superadmin';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';

const DOCUMENT_ASPECT = 1.6;

/**
 * Shows an identity document through a short-lived signed URL. Screenshots and
 * screen recording are blocked, the image is never written to the disk cache, and
 * the document is hidden as soon as the link expires.
 */
export function DocumentViewerScreen({ route }: RootScreenProps<'DocumentViewer'>) {
  usePreventScreenCapture();
  const { title, documentId } = route.params;
  const { t } = useTranslation();
  const document = useDocumentUrl(documentId);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second so the expiry countdown stays live.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expiresAt = document.data ? new Date(document.data.expiresAt).getTime() : 0;
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const expired = document.data !== undefined && secondsLeft === 0;
  const url = document.data?.url ?? '';
  const isPdf = /\.pdf($|\?)/i.test(url);

  return (
    <Screen header={<Header title={title} />}>
      <View style={styles.notice}>
        <ShieldCheck size={sizes.iconSm} color={colors.success} strokeWidth={2} />
        <Text variant="caption" color="textMuted" style={styles.flex}>
          {t('superadmin.documentNotice')}
        </Text>
      </View>

      {document.isPending ? (
        <Skeleton height={sizes.chartHeight * 2} radius={radius.lg} />
      ) : document.isError ? (
        <ErrorState error={document.error} onRetry={() => void document.refetch()} />
      ) : expired ? (
        <>
          <InlineAlert tone="warning" message={t('superadmin.linkExpired')} />
          <Button label={t('superadmin.refreshLink')} icon={RefreshCw} variant="secondary" onPress={() => void document.refetch()} />
        </>
      ) : isPdf ? (
        <>
          <InlineAlert tone="info" message={t('superadmin.pdfNotice')} />
          <Button label={t('superadmin.openPdf')} variant="secondary" onPress={() => void Linking.openURL(url)} />
        </>
      ) : (
        <Image
          source={{ uri: url }}
          style={styles.document}
          contentFit="contain"
          cachePolicy="none"
          accessibilityLabel={title}
        />
      )}

      {document.data && !expired ? (
        <Text variant="caption" color="textSubtle" align="center" accessibilityLiveRegion="polite">
          {t('superadmin.linkExpiresIn', { seconds: secondsLeft })}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  document: { width: '100%', aspectRatio: DOCUMENT_ASPECT, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
});
