import type { Category } from '../types';
import { CATEGORY_LOWER_F, QT_TO_L, WORK_REST_TABLE, WORKLOADS } from '../science/heatCategory';
import { DOSE_BASE_C } from '../planner/plan';

const fToC = (f: number) => ((f - 32) * 5) / 9;
const FLAGS = ['Below flag', 'White', 'Green', 'Yellow', 'Red', 'Black'];
const LOAD_NAMES = { easy: 'Easy', moderate: 'Moderate', heavy: 'Heavy', veryHeavy: 'Very heavy' };
const qt = (q: number) => ({ 0.5: '½', 0.75: '¾', 1: '1' })[q] ?? String(q);

function range(c: Category) {
  if (c === 0) return `< ${CATEGORY_LOWER_F[0]} °F (< ${fToC(CATEGORY_LOWER_F[0]).toFixed(1)} °C)`;
  const lo = CATEGORY_LOWER_F[c - 1];
  const hi = (CATEGORY_LOWER_F as readonly number[])[c];
  return hi ? `${lo}–${(hi - 0.1).toFixed(1)} °F (${fToC(lo).toFixed(1)}–${fToC(hi - 0.1).toFixed(1)} °C)` : `≥ ${lo} °F (≥ ${fToC(lo).toFixed(1)} °C)`;
}

const SOURCES = [
  ['US Army TB MED 507, Heat Stress Control and Heat Casualty Management (12 Apr 2022), Table 3-2', 'https://www.govinfo.gov/content/pkg/GOVPUB-D101-PURL-gpo216616/pdf/GOVPUB-D101-PURL-gpo216616.pdf'],
  ['Australian Bureau of Meteorology: About the WBGT and Apparent Temperature indices', 'https://www.bom.gov.au/info/thermal_stress/'],
  ['Evaluation of simple WBGT approximations, including this formula (PMC9941479)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9941479'],
  ['NIOSH: Acclimatization recommendations', 'https://www.cdc.gov/niosh/heat-stress/recommendations/acclimatization.html'],
  ['OSHA: Heat-related illnesses and first aid', 'https://www.osha.gov/heat-exposure/illness-first-aid'],
  ['ILO (22 Apr 2024): Ensuring safety and health at work in a changing climate', 'https://www.ilo.org/resource/news/climate-change-creates-cocktail-serious-health-hazards-70-cent-worlds'],
  ['Open-Meteo forecast, historical weather and geocoding APIs (CC BY 4.0)', 'https://open-meteo.com/en/docs'],
] as const;

export function MethodologyView() {
  return (
    <article className="doc" lang="en">
      <section>
        <h1>How HeatShift decides</h1>
        <p>
          HeatShift turns an hourly weather forecast into a work schedule. Every number it shows comes from four steps: estimate heat stress for each hour, look up the published work/rest limit for that hour, search every possible shift, and compare the best one with your usual shift. All of it runs in your browser; nothing is sent anywhere except the weather request.
        </p>
      </section>

      <section>
        <h2>1. Heat stress for each hour</h2>
        <p>
          Occupational heat limits use the <b>wet bulb globe temperature (WBGT)</b>, which combines air temperature, humidity, sun and wind. Weather forecasts do not include WBGT, so HeatShift estimates it from forecast air temperature <var>T</var> (°C) and relative humidity <var>RH</var> (%) with the Australian Bureau of Meteorology approximation:
        </p>
        <div className="formula">
          <var>e</var> = (<var>RH</var> / 100) × 6.105 × exp(17.27 <var>T</var> / (237.7 + <var>T</var>)) hPa
        </div>
        <div className="formula">
          WBGT ≈ 0.567 <var>T</var> + 0.393 <var>e</var> + 3.94 °C
        </div>
        <p>For example, 30 °C at 50 % humidity gives <var>e</var> ≈ 21.1 hPa and WBGT ≈ 29.3 °C, which is heat level 3 (yellow).</p>
      </section>

      <section>
        <h2>2. Heat level and work/rest limits</h2>
        <p>
          Each hour's WBGT maps to a heat level, and each level and workload has a work/rest cycle and a water intake from US Army TB MED 507 (2022), Table 3-2. This table is rendered from the exact constant the planner uses. "No limit" means 60 minutes of work per hour; "50/10" means 50 minutes of work, then 10 minutes of rest in shade. Water is per hour.
        </p>
        <div className="table-wrap">
          <table className="wr">
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th scope="col">WBGT</th>
                {WORKLOADS.map((w) => (
                  <th key={w} scope="col">
                    {LOAD_NAMES[w]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([0, 1, 2, 3, 4, 5] as Category[]).map((c) => (
                <tr key={c}>
                  <th scope="row" className={`catcell cat-${c}`}>
                    {c} {FLAGS[c]}
                  </th>
                  <td>{range(c)}</td>
                  {WORKLOADS.map((w) => {
                    const cell = WORK_REST_TABLE[c][w];
                    return (
                      <td key={w}>
                        {cell.work === 60 ? 'No limit' : `${cell.work}/${60 - cell.work}`}, {qt(cell.waterQt)} qt ({(cell.waterQt * QT_TO_L).toFixed(1)} L)
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Never drink more than 1½ qt (about 1.4 L) in an hour or 12 qt (about 11 L) in a day (TB MED 507). Level 0 is below the table; HeatShift treats it as no limit with ½ qt per hour.</p>
      </section>

      <section>
        <h2>3. Finding the shift</h2>
        <p>HeatShift tries every possible shift inside your allowed working hours: one block, or two blocks with at least an hour between them, each at least 2 hours long, never including an hour without data. For each candidate it adds up the work minutes the rest rules allow. The last hour may be partial, so a plan can end at, say, 10:40.</p>
        <p>From the shifts that get all the required work done, it picks the one with, in order:</p>
        <ol>
          <li>the fewest hours at level 4 or 5 (Red/Black);</li>
          <li>the lowest heat dose: the sum of WBGT degrees above {DOSE_BASE_C} °C (where level 1 starts) over the hours worked. This is a ranking heuristic, not a medical measure;</li>
          <li>the fewest clock hours on site;</li>
          <li>fewer blocks;</li>
          <li>the earliest start.</li>
        </ol>
        <p>
          <b>Safety cap.</b> A plan never has more Red/Black hours than your usual shift. If the full job cannot fit under that cap, HeatShift shows the most work that does fit and says so, instead of adding dangerous hours to finish it. A two-block search over a 13-hour window checks about a thousand candidates in a few milliseconds.
        </p>
      </section>

      <section>
        <h2>4. Before and after</h2>
        <p>Your usual shift is scored with the same rules. "Work done within rest rules" is how much real work it delivers once the required breaks are taken. On hot days, a 9-to-5 shift often delivers far less than 8 hours, which is the hidden cost a planned shift recovers. Season replay repeats this for every day of a past period on Open-Meteo historical data.</p>
      </section>

      <section>
        <h2>Limits you should know</h2>
        <ul>
          <li>
            <b>Estimate, not measurement.</b> The BoM formula assumes moderate sun and light wind and ignores actual radiation and wind. It tends to overestimate heat stress in cloud, wind or low sun and can underestimate it in full midday sun. Independent studies find it less accurate than physical models. Treat it as a planning estimate; a WBGT meter on site is better.
          </li>
          <li>
            <b>Fit, acclimatised adults.</b> TB MED 507 was written for acclimatised soldiers. New or returning workers need to build up over 1–2 weeks (NIOSH: at most 20 % of usual heat exposure on day 1, adding at most 20 % a day). Older workers and people with health conditions need more caution.
          </li>
          <li>
            <b>Conservative table.</b> We use Table 3-2 (activities up to 4 hours) for every hour, which is stricter than the continuous-work table.
          </li>
          <li>
            <b>Hourly resolution and forecast error.</b> Forecasts can be wrong, and conditions change within an hour.
          </li>
          <li>
            <b>Not medical advice.</b> HeatShift is planning guidance. If someone shows signs of heat illness, stop work and call emergency services.
          </li>
        </ul>
      </section>

      <section>
        <h2>Sources</h2>
        <ul>
          {SOURCES.map(([label, url]) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <p>HeatShift was built during Code for Change (November 2026). Source code is MIT-licensed. AI assistance was used in development.</p>
      </section>
    </article>
  );
}
