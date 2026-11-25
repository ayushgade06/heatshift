// Fetches real Open-Meteo archive data for the demo scenario (Delhi, May 2024)
// and writes public/demo/delhi-2024-05.json with provenance. Run: npm run snapshot
import { writeFileSync, mkdirSync } from 'node:fs';

const LAT = 28.65195; // Delhi, as returned by Open-Meteo geocoding
const LON = 77.23149;
const START = '2024-05-01';
const END = '2024-05-31';

const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${START}&end_date=${END}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation&daily=sunrise,sunset&timezone=auto`;

const res = await fetch(url);
const data = await res.json();
if (!res.ok || data.error) throw new Error(`Open-Meteo error: ${data.reason ?? res.status}`);

mkdirSync('public/demo', { recursive: true });
writeFileSync(
  'public/demo/delhi-2024-05.json',
  JSON.stringify({
    source_url: url,
    fetched_at: new Date().toISOString(),
    attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
    lat: LAT,
    lon: LON,
    start: START,
    end: END,
    data,
  }),
);
console.log(`Wrote ${data.hourly.time.length} hours for Delhi ${START}..${END}`);
