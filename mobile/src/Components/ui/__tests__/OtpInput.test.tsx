import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { LanguageProvider } from '../../../context/LanguageContext';
import { OtpInput } from '../OtpInput';

function Harness({ onComplete }: { onComplete: (code: string) => void }) {
  const [value, setValue] = useState('');
  return <OtpInput value={value} onChange={setValue} onComplete={onComplete} autoFocus={false} />;
}

async function renderOtp(onComplete = jest.fn()) {
  await render(
    <LanguageProvider>
      <Harness onComplete={onComplete} />
    </LanguageProvider>,
  );
  // One hidden TextInput receives all typing, paste and SMS autofill.
  const input = screen.getByTestId('otp-input');
  return { input, onComplete };
}

describe('OtpInput', () => {
  it('keeps digits only and shows them in the boxes', async () => {
    const { input } = await renderOtp();
    await fireEvent.changeText(input, '12a3');
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('a')).toBeNull();
  });

  it('auto-submits once when the sixth digit is entered', async () => {
    const { input, onComplete } = await renderOtp();
    await fireEvent.changeText(input, '12345');
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.changeText(input, '123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('accepts a pasted SMS code and ignores anything beyond six digits', async () => {
    const { input, onComplete } = await renderOtp();
    await fireEvent.changeText(input, ' 987 654 321 ');
    expect(onComplete).toHaveBeenCalledWith('987654');
  });

  it('fires again after the code is cleared and re-entered', async () => {
    const { input, onComplete } = await renderOtp();
    await fireEvent.changeText(input, '111111');
    await fireEvent.changeText(input, '');
    await fireEvent.changeText(input, '111111');
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
