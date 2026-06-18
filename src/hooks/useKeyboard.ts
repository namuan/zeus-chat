import { useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent } from 'react-native';

/**
 * Tracks the on-screen keyboard height so the input bar can sit just above it.
 * Subscribes to both `Will` (iOS) and `Did` (Android) events.
 */
export function useKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      setKeyboardVisible(true);
    };
    const onHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    };

    const subs = [
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardDidShow', onShow),
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];

    return () => subs.forEach((s) => s.remove());
  }, []);

  return { keyboardHeight, keyboardVisible };
}
