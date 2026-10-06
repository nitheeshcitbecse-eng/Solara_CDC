import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useRef } from 'react';

import type { RootStackParamList } from '../types/navigation';

type StepRoute = keyof RootStackParamList;

/**
 * Save-and-resume for multi-screen wizards. Called from the FIRST step: once the
 * saved step is known, it rebuilds the stack as [step1, …, savedStep] in one reset,
 * so the user lands where they left off and "back" still walks through earlier steps.
 */
export function useResumeSteps(steps: readonly StepRoute[], savedStep: number | null): void {
  const navigation = useNavigation();
  const resumed = useRef(false);

  useLayoutEffect(() => {
    if (resumed.current || savedStep === null) return;
    resumed.current = true;
    const index = Math.min(Math.max(savedStep, 1), steps.length) - 1;
    if (index === 0) return;
    navigation.reset({ index, routes: steps.slice(0, index + 1).map((name) => ({ name })) });
  }, [navigation, savedStep, steps]);
}
