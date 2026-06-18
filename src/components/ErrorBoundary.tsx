import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const PADDING = 24;
const FONT_SIZE = 16;
const TITLE_SIZE = 22;

/** Root-level error boundary that catches unhandled render errors. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Text style={[styles.title, { color: '#D7393B' }]}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PADDING,
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: TITLE_SIZE, fontWeight: '700', lineHeight: 28 },
  message: {
    fontSize: FONT_SIZE,
    lineHeight: 23,
    color: '#6B6B70',
    marginTop: 16,
    textAlign: 'center',
  },
});
