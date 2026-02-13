import { PixelRatio } from 'react-native';

/**
 * 시스템 폰트 스케일을 반영한 폰트 크기 계산.
 * maxScale로 최대 배율을 제한하여 레이아웃 깨짐 방지.
 *
 * RN <Text>는 기본적으로 allowFontScaling={true}이므로,
 * 이 유틸은 비-Text 요소의 높이 계산이나 레이아웃 조정에 사용.
 */
export function scaledFontSize(size: number, maxScale: number = 1.4): number {
  const fontScale = PixelRatio.getFontScale();
  const clampedScale = Math.min(fontScale, maxScale);
  return Math.round(size * clampedScale);
}

/**
 * 폰트 스케일링을 적용하지 않는 고정 크기.
 * 차트 라벨, 고정 너비 숫자 표시 등에 사용.
 */
export function fixedFontSize(size: number): number {
  return size;
}

/**
 * 현재 시스템 폰트 스케일 값 조회.
 * 1.0 = 기본, > 1.0 = 사용자가 크게 설정.
 */
export function getFontScale(): number {
  return PixelRatio.getFontScale();
}
