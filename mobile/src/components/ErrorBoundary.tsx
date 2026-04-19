import { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@i18n/index';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    const t = i18n.t.bind(i18n);
    const message = this.state.error.message;

    return (
      <View style={styles.root}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={56} color="#e65a5a" />
        </View>
        <Text style={styles.title}>{t('errors.boundaryTitle')}</Text>
        <Text style={styles.subtitle}>{t('errors.boundarySubtitle')}</Text>
        {__DEV__ && message ? (
          <Text style={styles.detail} numberOfLines={5}>
            {message}
          </Text>
        ) : null}
        <Pressable onPress={this.reset} style={styles.btn}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.btnText}>{t('errors.boundaryRetry')}</Text>
        </Pressable>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: '#fafafa',
  },
  iconWrap: { marginBottom: 8 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  detail: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#8a1f1f',
    backgroundColor: '#fde8e8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
    maxWidth: '100%',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: '#1f8a8a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
