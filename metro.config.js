/**
 * Metro 번들러 설정
 * NativeWind v4 통합 — global.css를 진입점으로 사용
 */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
