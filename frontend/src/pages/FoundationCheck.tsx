/**
 * NWIS Phase 1 Foundation Check Page
 * =====================================
 * Verifies frontend → backend → database connectivity.
 * Displays system health, well list, X17 status, active alerts,
 * and risk predictions from the seeded database.
 *
 * This is NOT the final UI. It is the Phase 1 connectivity proof.
 * The real Command Center, Map, and Intelligence modules are Phase 2+.
 */

import { useEffect, useState } from 'react';
import { wellsApi } from '../services/wellsApi';
import { eventsApi } from '../services/eventsApi';
import { riskApi, healthApi } from '../services/riskApi';
import type {
  WellSummary, WellDetail, OperationalEventDetail,
  RiskPrediction, Alert, Recommendation
} from '../types/domain';
import styles from './FoundationCheck.module.css';

interface HealthData {
  status: string;
  service: string;
  database: string;
}

interface CheckResult {
  label: string;
  status: 'pass' | 'fail' | 'loading';
  detail?: string;
}

export function FoundationCheck() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [wells, setWells] = useState<WellSummary[]>([]);
  const [x17, setX17] = useState<WellDetail | null>(null);
  const [x12Events, setX12Events] = useState<OperationalEventDetail[]>([]);
  const [riskPredictions, setRiskPredictions] = useState<RiskPrediction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runChecks();
  }, []);

  const addCheck = (label: string, status: 'pass' | 'fail', detail?: string) => {
    setChecks(prev => [...prev, { label, status, detail }]);
  };

  const runChecks = async () => {
    setLoading(true);
    setChecks([]);

    try {
      // 1. Health check
      try {
        const h = await healthApi.check();
        setHealth(h);
        addCheck('Backend health endpoint', 'pass', `status=${h.status}, db=${h.database}`);
        addCheck('Database connectivity', h.database === 'connected' ? 'pass' : 'fail', h.database);
      } catch {
        addCheck('Backend health endpoint', 'fail', 'Backend unreachable — is it running?');
        setError('Cannot reach backend. Start it with: cd backend && uvicorn main:app --reload');
        setLoading(false);
        return;
      }

      // 2. Wells
      const allWells = await wellsApi.getAll();
      setWells(allWells);
      addCheck(`Wells count (≥12)`, allWells.length >= 12 ? 'pass' : 'fail', `Found ${allWells.length} wells`);

      const requiredWells = ['X03','X05','X07','X08','X09','X11','X12','X14','X15','X17','X19','X21'];
      const wellNames = allWells.map(w => w.well_name);
      const missing = requiredWells.filter(n => !wellNames.includes(n));
      addCheck('All 12 required wells exist', missing.length === 0 ? 'pass' : 'fail',
        missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'X03–X21 all present');

      // 3. X17 detail
      const x17Well = allWells.find(w => w.well_name === 'X17');
      if (x17Well) {
        const detail = await wellsApi.getById(x17Well.id);
        setX17(detail);
        addCheck('X17 active at 3842m in F3', detail.current_depth === 3842 && detail.formation?.name === 'F3' ? 'pass' : 'fail',
          `depth=${detail.current_depth}m, formation=${detail.formation?.name}`);

        // X17 events (should be empty — X17 is the active well, events are on offsets)
        await eventsApi.getByWell(x17Well.id);

        // Risk predictions
        const preds = await riskApi.getPredictions(x17Well.id);
        setRiskPredictions(preds);
        addCheck('Risk predictions for X17', preds.length >= 3 ? 'pass' : 'fail', `${preds.length} predictions`);

        // Active alerts
        const al = await riskApi.getWellAlerts(x17Well.id);
        setAlerts(al);
        addCheck('Active alerts for X17', al.length >= 1 ? 'pass' : 'fail', `${al.length} active alerts`);

        // Recommendations
        const recs = await riskApi.getRecommendations(x17Well.id);
        setRecommendations(recs);
        addCheck('Recommendations for X17', recs.length >= 1 ? 'pass' : 'fail', `${recs.length} recommendations`);

        // Depth risk check
        const depthCheck = await riskApi.checkDepth(x17Well.id, 3842);
        addCheck('3842m in risk zone (3810–3870m)', depthCheck.in_risk_zone ? 'pass' : 'fail',
          `in_risk_zone=${depthCheck.in_risk_zone}`);
      } else {
        addCheck('X17 exists', 'fail', 'X17 not found in database');
      }

      // 4. X12 events
      const x12Well = allWells.find(w => w.well_name === 'X12');
      if (x12Well) {
        const evts = await eventsApi.getByWell(x12Well.id);
        setX12Events(evts);
        const hasMudLoss = evts.some(e => e.event_type === 'MUD_LOSS' && e.depth === 3845);
        const hasTorque = evts.some(e => e.event_type === 'TORQUE_SPIKE');
        const hasStuck = evts.some(e => e.event_type === 'STUCK_PIPE');
        addCheck('X12 locked events exist', hasMudLoss && hasTorque && hasStuck ? 'pass' : 'fail',
          `MUD_LOSS@3845=${hasMudLoss}, TORQUE_SPIKE=${hasTorque}, STUCK_PIPE=${hasStuck}`);

        const hasMitigations = evts.some(e => e.mitigations.length > 0);
        addCheck('X12 events have mitigations', hasMitigations ? 'pass' : 'fail',
          hasMitigations ? 'Mitigation relationships intact' : 'No mitigations found');
      }

      // 5. Nearby wells
      if (x17Well) {
        const detail = await wellsApi.getById(x17Well.id);
        if (detail.latitude && detail.longitude) {
          const nearby = await wellsApi.getNearby({
            latitude: detail.latitude,
            longitude: detail.longitude,
            radius_km: 10,
            exclude_well_id: x17Well.id,
          });
          addCheck('Nearby wells within 10km of X17', nearby.length > 0 ? 'pass' : 'fail',
            `${nearby.length} wells found`);
        }
      }

      // 6. 404 handling
      try {
        await wellsApi.getById(999999);
        addCheck('404 for invalid well ID', 'fail', 'Should have returned 404');
      } catch (err: any) {
        addCheck('404 for invalid well ID', err.response?.status === 404 ? 'pass' : 'fail',
          `HTTP ${err.response?.status}`);
      }

    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
      addCheck('Phase 1 checks', 'fail', err.message);
    }

    setLoading(false);
  };

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.badge}>SIH PS 26121 · Phase 1 Foundation</div>
        <h1>NWIS — Nearby Wells Intelligence System</h1>
        <p className={styles.subtitle}>
          eRTMAC-NWIS: AI-Powered Offset Well Knowledge and Decision Support Platform
        </p>
        <p className={styles.disclaimer}>
          ⚠️ Prototype using entirely synthetic data. Not real well data. Not validated predictions.
        </p>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <strong>⚠️ Connection Error:</strong> {error}
        </div>
      )}

      {/* ── Verification Checklist ──────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Phase 1 Verification Checks</h2>
          {!loading && (
            <span className={`${styles.scoreBadge} ${failCount === 0 ? styles.scorePass : styles.scoreMixed}`}>
              {passCount}/{passCount + failCount} PASS
            </span>
          )}
        </div>
        <div className={styles.checkList}>
          {checks.map((c, i) => (
            <div key={i} className={`${styles.checkItem} ${styles[c.status]}`}>
              <span className={styles.checkIcon}>{c.status === 'pass' ? '✓' : '✗'}</span>
              <span className={styles.checkLabel}>{c.label}</span>
              {c.detail && <span className={styles.checkDetail}>{c.detail}</span>}
            </div>
          ))}
          {loading && <div className={styles.loading}>Running checks...</div>}
        </div>
      </section>

      {/* ── Backend Status ──────────────────────────────────────────────── */}
      {health && (
        <section className={styles.section}>
          <h2>Backend Status</h2>
          <div className={styles.statusGrid}>
            <div className={`${styles.statusCard} ${health.status === 'ok' ? styles.statusOk : styles.statusDegraded}`}>
              <div className={styles.statusLabel}>Service Status</div>
              <div className={styles.statusValue}>{health.status.toUpperCase()}</div>
            </div>
            <div className={`${styles.statusCard} ${health.database === 'connected' ? styles.statusOk : styles.statusDegraded}`}>
              <div className={styles.statusLabel}>Database</div>
              <div className={styles.statusValue}>{health.database}</div>
            </div>
            <div className={styles.statusCard}>
              <div className={styles.statusLabel}>Service</div>
              <div className={styles.statusValue}>{health.service}</div>
            </div>
            <div className={styles.statusCard}>
              <div className={styles.statusLabel}>Total Wells</div>
              <div className={styles.statusValue}>{wells.length}</div>
            </div>
          </div>
        </section>
      )}

      {/* ── X17 Active Well ─────────────────────────────────────────────── */}
      {x17 && (
        <section className={styles.section}>
          <h2>Active Well: X17 (Demo Well)</h2>
          <div className={styles.wellCard}>
            <div className={styles.wellHeader}>
              <span className={styles.wellName}>{x17.well_name}</span>
              <span className={`${styles.statusPill} ${styles[`status_${x17.status}`]}`}>{x17.status}</span>
            </div>
            <div className={styles.wellFields}>
              <div className={styles.field}><span>Current Depth</span><strong>{x17.current_depth}m</strong></div>
              <div className={styles.field}><span>Total Depth</span><strong>{x17.total_depth}m</strong></div>
              <div className={styles.field}><span>Formation</span><strong>{x17.formation?.name ?? '—'}</strong></div>
              <div className={styles.field}><span>Reservoir</span><strong>{x17.reservoir?.name ?? '—'}</strong></div>
              <div className={styles.field}><span>Operator</span><strong>{x17.operator}</strong></div>
              <div className={styles.field}><span>Spud Date</span><strong>{x17.spud_date}</strong></div>
            </div>
          </div>
        </section>
      )}

      {/* ── Active Alerts ───────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <section className={styles.section}>
          <h2>Active Alerts for X17</h2>
          {alerts.map(a => (
            <div key={a.id} className={`${styles.alertCard} ${styles[`sev_${a.severity}`]}`}>
              <div className={styles.alertHeader}>
                <span className={styles.alertType}>{a.risk_type.replace('_', ' ')}</span>
                <span className={styles.alertSev}>{a.severity}</span>
              </div>
              <p className={styles.alertMsg}>{a.message}</p>
            </div>
          ))}
        </section>
      )}

      {/* ── Synthetic Risk Profile ──────────────────────────────────────── */}
      {riskPredictions.length > 0 && (
        <section className={styles.section}>
          <h2>Synthetic Risk Profile — X17 @ 3842m</h2>
          <p className={styles.note}>
            ℹ️ These are synthetic prototype scores. Not validated real-world probabilities.
          </p>
          {riskPredictions.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map(r => (
            <div key={r.id} className={styles.riskRow}>
              <span className={styles.riskType}>{r.risk_type}</span>
              <div className={styles.riskBarWrap}>
                <div className={styles.riskBar} style={{ width: `${(r.score ?? 0) * 100}%` }} />
              </div>
              <span className={styles.riskScore}>{((r.score ?? 0) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </section>
      )}

      {/* ── X12 Historical Events ───────────────────────────────────────── */}
      {x12Events.length > 0 && (
        <section className={styles.section}>
          <h2>X12 Historical Events (Primary Offset Well)</h2>
          {x12Events.map(e => (
            <div key={e.id} className={styles.eventCard}>
              <div className={styles.eventHeader}>
                <span className={styles.eventType}>{e.event_type.replace('_', ' ')}</span>
                <span className={styles.eventDepth}>@ {e.depth}m</span>
                <span className={`${styles.eventSev} ${styles[`sev_${e.severity}`]}`}>{e.severity}</span>
              </div>
              <p className={styles.eventDesc}>{e.description?.substring(0, 200)}...</p>
              {e.mitigations.length > 0 && (
                <div className={styles.mitigations}>
                  <strong>Mitigations ({e.mitigations.length}):</strong>
                  {e.mitigations.map(m => (
                    <div key={m.id} className={styles.mitigation}>
                      <span className={`${styles.mitSuc} ${styles[`mit_${m.success_indicator}`]}`}>
                        {m.success_indicator}
                      </span>
                      {m.mitigation.substring(0, 120)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ── Recommendations ─────────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <section className={styles.section}>
          <h2>Evidence-Backed Recommendations for X17</h2>
          {recommendations.map(r => (
            <div key={r.id} className={styles.recCard}>
              <div className={styles.recHeader}>
                <span>{r.risk_type.replace('_', ' ')} — Priority {r.priority}</span>
                {r.source_event_id && (
                  <span className={styles.evidenceBadge}>← Event #{r.source_event_id}</span>
                )}
              </div>
              <p className={styles.recText}>{r.recommendation}</p>
              {r.evidence && <p className={styles.recEvidence}>Evidence: {r.evidence.substring(0, 180)}...</p>}
            </div>
          ))}
        </section>
      )}

      {/* ── Well Inventory ──────────────────────────────────────────────── */}
      {wells.length > 0 && (
        <section className={styles.section}>
          <h2>Well Inventory ({wells.length} wells)</h2>
          <div className={styles.wellGrid}>
            {wells.map(w => (
              <div key={w.id} className={`${styles.wellChip} ${styles[`status_${w.status}`]}`}>
                <strong>{w.well_name}</strong>
                <span>{w.status}</span>
                {w.current_depth && <span>{w.current_depth}m</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <p>NWIS Phase 1 Foundation · SIH PS 26121 · Prototype — Synthetic Data Only</p>
        <button className={styles.rerunBtn} onClick={runChecks}>Re-run Checks</button>
      </footer>
    </div>
  );
}
