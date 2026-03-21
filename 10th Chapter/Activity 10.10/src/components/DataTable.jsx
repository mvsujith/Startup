import { useMemo } from 'react';
import './DataTable.css';

const PRESET_WINDINGS = [5, 10, 15, 20];

export default function DataTable({ results }) {
  // Group results by winding count
  const groups = useMemo(() => {
    const map = {};
    results.forEach(r => {
      if (!map[r.windings]) map[r.windings] = [];
      map[r.windings].push(r);
    });
    return map;
  }, [results]);

  // Compute averages per winding
  const avgs = useMemo(() => {
    const out = {};
    Object.entries(groups).forEach(([w, rows]) => {
      if (rows.length >= 1) {
        out[w] = rows.reduce((s, r) => s + r.distance, 0) / rows.length;
      }
    });
    return out;
  }, [groups]);

  // Bar chart max
  const maxAvg = Math.max(1, ...Object.values(avgs));

  // Flatten rows for the table
  const rows = useMemo(() => {
    const out = [];
    const allWindings = Object.keys(groups).map(Number).sort((a,b) => a - b);
    allWindings.forEach(w => {
      groups[w].forEach((r, i) => {
        out.push({ ...r, trialIdx: i + 1 });
      });
      if (groups[w].length >= 2) {
        out.push({ isAvg: true, windings: w, distance: avgs[w], speed: groups[w].reduce((s, r) => s + r.speed, 0) / groups[w].length });
      }
    });
    return out;
  }, [groups, avgs]);

  return (
    <div className="data-table-section">
      {/* Table */}
      <div className="data-table-wrap">
        {rows.length === 0 ? (
          <div className="table-empty">
            No data yet.<br />
            Wind the car and release<br />to record results! 🚗
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Windings</th>
                <th>Trial</th>
                <th>Dist (cm)</th>
                <th>Speed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) =>
                r.isAvg ? (
                  <tr key={`avg-${r.windings}`} className="avg-row">
                    <td>{r.windings}×</td>
                    <td>AVG</td>
                    <td>{r.distance.toFixed(1)}</td>
                    <td>{r.speed.toFixed(1)}</td>
                  </tr>
                ) : (
                  <tr key={i}>
                    <td>{r.windings}×</td>
                    <td>T{r.trialIdx}</td>
                    <td>{r.distance.toFixed(1)}</td>
                    <td>{r.speed.toFixed(1)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>


    </div>
  );
}
