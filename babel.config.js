/**
 * Babel 설정
 * - NativeWind JSX 변환 (jsxImportSource: 'nativewind')
 * - Reanimated 플러그인 (애니메이션)
 * - 프로덕션 빌드 시 console.log 자동 제거
 */
module.exports = function (api) {
  api.cache(true);

  const plugins = ['react-native-reanimated/plugin'];

  // 프로덕션 빌드에서 console.log/debug/info 자동 제거 (error, warn은 유지)
  if (process.env.NODE_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins,
  };
};
