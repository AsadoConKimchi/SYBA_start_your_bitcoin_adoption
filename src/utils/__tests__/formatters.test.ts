import {
  formatKrw,
  formatKrwPlain,
  formatSats,
  formatPercent,
  formatPercentPlain,
  getTodayString,
  getCurrentYearMonth,
} from '../formatters';

describe('formatKrw', () => {
  it('should format positive amounts', () => {
    const result = formatKrw(50000);
    expect(result).toContain('50,000');
  });

  it('should format zero', () => {
    const result = formatKrw(0);
    expect(result).toContain('0');
  });

  it('should format negative amounts', () => {
    const result = formatKrw(-10000);
    expect(result).toContain('10,000');
  });
});

describe('formatKrwPlain', () => {
  it('should format without currency symbol', () => {
    expect(formatKrwPlain(1234567)).toBe('1,234,567');
  });

  it('should format zero', () => {
    expect(formatKrwPlain(0)).toBe('0');
  });
});

describe('formatSats', () => {
  it('should format with sats suffix', () => {
    expect(formatSats(100000)).toBe('100,000 sats');
  });

  it('should format zero', () => {
    expect(formatSats(0)).toBe('0 sats');
  });

  it('should format large numbers with commas', () => {
    expect(formatSats(1234567)).toBe('1,234,567 sats');
  });
});

describe('formatPercent', () => {
  it('should format positive with + sign', () => {
    expect(formatPercent(5.5)).toBe('+5.50%');
  });

  it('should format negative with - sign', () => {
    expect(formatPercent(-3.2)).toBe('-3.20%');
  });

  it('should format zero with + sign', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('formatPercentPlain', () => {
  it('should format without sign', () => {
    expect(formatPercentPlain(5.5)).toBe('5.5%');
  });
});

describe('getTodayString', () => {
  it('should return YYYY-MM-DD format', () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getCurrentYearMonth', () => {
  it('should return YYYY-MM format', () => {
    const ym = getCurrentYearMonth();
    expect(ym).toMatch(/^\d{4}-\d{2}$/);
  });
});
