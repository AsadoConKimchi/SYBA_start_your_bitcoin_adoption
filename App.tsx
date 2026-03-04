/**
 * 폴백 App 컴포넌트
 * 실제 앱은 expo-router를 통해 app/_layout.tsx에서 시작됨
 * 이 파일은 expo-router 없이 실행될 때의 폴백용으로만 존재
 */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>SYBA — 나만의 비트코인 가계부</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
