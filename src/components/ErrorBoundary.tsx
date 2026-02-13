import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, Appearance } from 'react-native';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const colorScheme = Appearance.getColorScheme();
      const isDark = colorScheme === 'dark';

      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 16 }}>{'⚠️'}</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: isDark ? '#F5F5F5' : '#1A1A1A',
              marginBottom: 8,
            }}
          >
            {i18n.t('errorBoundary.title')}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: isDark ? '#A0A0A0' : '#666666',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}
          >
            {i18n.t('errorBoundary.description')}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7931A',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={this.handleRetry}
          >
            <Text style={{ color: isDark ? '#0F0F0F' : '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {i18n.t('errorBoundary.retry')}
            </Text>
          </TouchableOpacity>
          {__DEV__ && this.state.error && (
            <View
              style={{
                marginTop: 24,
                padding: 12,
                backgroundColor: isDark ? '#3D1515' : '#FEF2F2',
                borderRadius: 8,
                maxWidth: '100%',
              }}
            >
              <Text style={{ fontSize: 10, color: isDark ? '#F87171' : '#DC2626', fontFamily: 'monospace' }}>
                {this.state.error.message}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
