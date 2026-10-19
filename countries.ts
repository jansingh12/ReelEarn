export type Country = { name: string; dial: string; flag: string; min: number; max: number };
// India first (default). National-number length rules: India is exactly 10 digits starting 6-9.
export const COUNTRIES: Country[] = [
  { name: 'India', dial: '+91', flag: '🇮🇳', min: 10, max: 10 },
  { name: 'United States', dial: '+1', flag: '🇺🇸', min: 10, max: 10 },
  { name: 'Canada', dial: '+1', flag: '🇨🇦', min: 10, max: 10 },
  { name: 'United Kingdom', dial: '+44', flag: '🇬🇧', min: 9, max: 10 },
  { name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', min: 8, max: 9 },
  { name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', min: 9, max: 9 },
  { name: 'Singapore', dial: '+65', flag: '🇸🇬', min: 8, max: 8 },
  { name: 'Australia', dial: '+61', flag: '🇦🇺', min: 9, max: 9 },
  { name: 'Bangladesh', dial: '+880', flag: '🇧🇩', min: 10, max: 10 },
  { name: 'Nepal', dial: '+977', flag: '🇳🇵', min: 10, max: 10 },
  { name: 'Sri Lanka', dial: '+94', flag: '🇱🇰', min: 9, max: 9 },
  { name: 'Pakistan', dial: '+92', flag: '🇵🇰', min: 10, max: 10 },
  { name: 'Malaysia', dial: '+60', flag: '🇲🇾', min: 9, max: 10 },
  { name: 'Indonesia', dial: '+62', flag: '🇮🇩', min: 9, max: 12 },
  { name: 'Germany', dial: '+49', flag: '🇩🇪', min: 10, max: 11 },
  { name: 'France', dial: '+33', flag: '🇫🇷', min: 9, max: 9 },
  { name: 'Qatar', dial: '+974', flag: '🇶🇦', min: 8, max: 8 },
  { name: 'Kuwait', dial: '+965', flag: '🇰🇼', min: 8, max: 8 },
  { name: 'Oman', dial: '+968', flag: '🇴🇲', min: 8, max: 8 },
  { name: 'South Africa', dial: '+27', flag: '🇿🇦', min: 9, max: 9 },
];
export function validNational(c: Country, digits: string): boolean {
  if (digits.length < c.min || digits.length > c.max) return false;
  return c.dial === '+91' ? /^[6-9]\d{9}$/.test(digits) : true;
}
