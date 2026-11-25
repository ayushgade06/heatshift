import type { Place } from './types';

export const DELHI: Place = { name: 'Delhi', country: 'India', admin1: 'National Capital Territory of Delhi', lat: 28.65195, lon: 77.23149, timezone: 'Asia/Kolkata' };

/** Demo day and season (inside the bundled Open-Meteo snapshot). */
export const DEMO_DAY = '2024-05-13';
export const DEMO_SEASON = { start: '2024-05-01', end: '2024-05-31' };

export const PRESETS: Place[] = [
  DELHI,
  { name: 'Ahmedabad', country: 'India', admin1: 'Gujarat', lat: 23.02579, lon: 72.58727, timezone: 'Asia/Kolkata' },
  { name: 'Darwin', country: 'Australia', admin1: 'Northern Territory', lat: -12.46113, lon: 130.84185, timezone: 'Australia/Darwin' },
  { name: 'Phoenix', country: 'United States', admin1: 'Arizona', lat: 33.44838, lon: -112.07404, timezone: 'America/Phoenix' },
  { name: 'Dubai', country: 'United Arab Emirates', admin1: 'Dubai', lat: 25.07725, lon: 55.30927, timezone: 'Asia/Dubai' },
];
