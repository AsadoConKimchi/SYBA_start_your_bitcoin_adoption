import { registerRootComponent } from 'expo';

import App from './App';

// 실제 앱 진입점은 expo-router (package.json "main": "expo-router/entry")
// 이 파일은 expo-router를 사용하지 않는 환경에서의 폴백용
registerRootComponent(App);
