import { StyleSheet, View } from 'react-native';

import { colors, sizes } from '../../lib/theme/tokens';

export function Divider() {
  return <View style={styles.line} accessibilityElementsHidden importantForAccessibility="no" />;
}

const styles = StyleSheet.create({
  line: { height: sizes.hairline, backgroundColor: colors.border, alignSelf: 'stretch' },
});
