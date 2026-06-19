import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { hasAnyApiKey } from '@/lib/securestore';
import { useTheme } from '@/hooks/useTheme';

/**
 * Entry route. Decides where to go based on whether any API key is stored.
 * The check is async (SecureStore), so we render a blank themed view until
 * the decision is made to avoid a flash of the wrong screen.
 */
export default function Index() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await hasAnyApiKey();
      setHasKey(ok);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <Redirect href={hasKey ? '/(tabs)/chats' : '/onboarding/api-key'} />;
}
