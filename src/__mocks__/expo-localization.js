// Jest mock for expo-localization (Node test environment)
module.exports = {
  getLocales: () => [
    {
      languageCode: 'ko',
      regionCode: 'KR',
      languageTag: 'ko-KR',
      textDirection: 'ltr',
    },
  ],
  getCalendars: () => [
    {
      calendar: 'gregorian',
      timeZone: 'Asia/Seoul',
      uses24hourClock: true,
      firstWeekday: 1,
    },
  ],
  locale: 'ko-KR',
  locales: ['ko-KR'],
  timezone: 'Asia/Seoul',
  isRTL: false,
};
