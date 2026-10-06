import { render } from '@testing-library/react-native';

import { App } from '../../App';
import { pressText, setupJourney, waitText } from './helpers';

/** Picking Hindi previews the UI live and keeps it after Continue. */
setupJourney();

it('previews and saves Hindi on first launch', async () => {
  await render(<App />);
  await waitText('Choose your language');
  await pressText('हिन्दी');
  await waitText('अपनी भाषा चुनें'); // live preview
  await pressText('आगे बढ़ें');
  await waitText('काम ढूँढें');
  await waitText('सिर्फ़ सत्यापित नियोक्ता');
  await pressText('मुझे कर्मचारी चाहिए');
  await waitText('भरोसेमंद कर्मचारी रखें');
}, 60_000);
