import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../lib/types/navigation';

/**
 * The single root stack. It lives in its own module so RootNavigator and the role
 * navigators (which contribute screen groups to it) can share it without a cycle.
 */
export const RootStack = createNativeStackNavigator<RootStackParamList>();
