import { useState, useEffect, useCallback } from 'react';

import DashboardLayout from '../components/layout/DashboardLayout';
import IndustrySelect from '../components/dashboard/IndustrySelect';
import KPICard from '../components/dashboard/KPICard';
import SummaryTable from '../components/dashboard/SummaryTable';
import ChartGrid from '../components/dashboard/ChartGrid';
import CollapsibleSection from '../components/dashboard/CollapsibleSection';
import {
  discardTempDataset,
  getDashboardData,
  getDatasetStatus,
  setDefaultDataset,
} from '../api/dashboard';
import INDUSTRIES from '../data/industries';
import SUMMARY_GROWTH_CATALOG from '../data/summaryGrowthCatalog';
import KPI_METRIC_REFERENCE from '../data/kpiMetricReference';

const DEFAULT_INDUSTRY = INDUSTRIES[0].id;

function enrichIndustryData(industry) {
  if (!industry?.id) return industry;

  if (Array.isArray(industry.summaryGrowthMetrics) && industry.summaryGrowthMetrics.length) {
    return industry;
  }

  const catalogMetrics = SUMMARY_GROWTH_CATALOG[industry.id];
  if (!Array.isArray(catalogMetrics) || !catalogMetrics.length) {
    return industry;
  }

  return {
    ...industry,
    summaryGrowthMetrics: catalogMetrics,
  };
}

function enrichIndustryList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(enrichIndustryData);
}

function normalizeMetricName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[().,/%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnit(unit) {
  const normalized = String(unit || '').trim().toLowerCase();

  const unitAliases = {
    '%': '%',
    'p/e': 'P/E',
    index: 'index',
    pts: 'index',
    units: 'units',
    rs: 'Rs.',
    'rs.': 'Rs.',
    'rs.b': 'Rs.B',
    'rs.billion': 'Rs.B',
    'rs.cr': 'Rs.Cr',
    'rs./mt': 'Rs./MT',
    'rs./kilogram': 'Rs./Kilogram',
    'rs./10 grams': 'Rs./10 grams',
    'rs./50kg': 'INR/50Kg',
    '$m': '$M',
    '$million': '$M',
    '$b': '$B',
    '$billion': '$B',
    '$/mt': '$/MT',
    'usd/mt': 'USD/MT',
    'usd/mmbtu': 'USD/MMBtu',
    'usd/pound': 'USD/Pound',
    'usd/ounce': 'USD/Ounce',
    'cny/mt': 'CNY/MT',
    'pln/mt': 'PLN/MT',
    yen: 'Yen',
    jpy: 'JPY',
    cny: 'CNY',
    'inr/50kg': 'INR/50Kg',
    'inr/quintal': 'INR/Quintal',
    'usd/ barrel': 'USD/ barrel',
  };

  return unitAliases[normalized] || String(unit || '').trim();
}

function toTitleCase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseMetricIdentity(metricName, fallbackUnit) {
  const rawMetricName = String(metricName || '').trim();

  // Do not strip specific metric names to avoid duplicate "Credit Deployed" labels
  const preserveFullNames = {
    'Credit Deployed (Agri)': 'Credit Deployed (Agri)',
    'Credit Deployed (Personal)': 'Credit Deployed (Personal)',
    'Credit Deployed (Industries)': 'Credit Deployed (Industries)',
    'Credit Deployed (Services)': 'Credit Deployed (Services)',
    'Natural gas (US)': 'Natural Gas (US)',
    'Natural gas (india)': 'Natural Gas (India)',
    'Crude Oil (Brent)': 'Crude Oil (Brent)',
    'TVS MOTOR': 'TVS MOTOR (E-2w Market Share)',
    'BAJAJ AUTO': 'BAJAJ AUTO (E-2w Market Share)',
    'OLA ELECTRIC': 'OLA ELECTRIC (E-2w Market Share)',
    'ATHER ENERGY': 'ATHER ENERGY (E-2w Market Share)',
    'HERO MOTOCORP': 'HERO MOTOCORP (E-2w Market Share)',
    'Other EV Penetration (PV, CV & Tractor)': 'Other EV Penetration (PV, CV & Tractor)',
    'India Real GDP (YOY %)': 'India Real GDP (YOY %)',
    'India Nominal GDP (YOY %)': 'India Nominal GDP (YOY %)',
    'China Gold import (Volume)': 'China Gold Import (Volume)',
    'China Gold import (Value)': 'China Gold Import (Value)',
    'India Gold Import (Value)': 'India Gold Import (Value)',
    'India Gold Import (Volume)': 'India Gold Import (Volume)'
  };

  if (preserveFullNames[rawMetricName]) {
    return {
      name: preserveFullNames[rawMetricName],
      unit: normalizeUnit(fallbackUnit),
    };
  }

  const matchedUnit = rawMetricName.match(/\s*\(([^)]+)\)\s*$/);
  const extractedUnit = normalizeUnit(matchedUnit?.[1] || '');
  const referenceUnit = normalizeUnit(fallbackUnit);
  const unit = referenceUnit || extractedUnit;
  const nameWithoutTrailingUnit = matchedUnit
    ? rawMetricName.slice(0, matchedUnit.index).trim()
    : rawMetricName;

  return {
    name: toTitleCase(nameWithoutTrailingUnit),
    unit,
  };
}

function normalizeDisplayUnitText(value) {
  return String(value || '')
    .replace(/\//g, ' ')
    .replace(/\bkg\b/gi, 'Kilogram')
    .replace(/\bmmbtu\b/gi, 'MMBtu')
    .replace(/\bmt\b/gi, 'MT')
    .replace(/\bquintal\b/gi, 'Quintal')
    .replace(/\bpound\b/gi, 'Pound')
    .replace(/\bounce\b/gi, 'Ounce')
    .replace(/\bgrams\b/gi, 'Grams')
    .replace(/\bgram\b/gi, 'Gram')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMetricValueParts(value, rawUnit) {
  const numericValue = Number(value);
  const normalizedUnit = normalizeUnit(rawUnit);

  if (!Number.isFinite(numericValue)) {
    return {
      value: null,
      currency: '',
      unit: '',
      displayValue: '—',
    };
  }

  const abs = Math.abs(numericValue);
  const sign = numericValue < 0 ? '-' : '';
  const formattedNumber = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: abs >= 100 ? 0 : 2,
  });

  if (normalizedUnit === '%') {
    return {
      value: numericValue,
      currency: '',
      unit: '%',
      displayValue: `${numericValue.toFixed(2)}%`,
    };
  }

  if (normalizedUnit === 'P/E') {
    return {
      value: numericValue,
      currency: '',
      unit: 'P/E',
      displayValue: `${sign}${formattedNumber} P/E`,
    };
  }

  if (normalizedUnit === 'index' || normalizedUnit === 'units') {
    const displayUnit = normalizedUnit === 'index' ? 'Index' : 'Units';
    return {
      value: numericValue,
      currency: '',
      unit: displayUnit,
      displayValue: normalizedUnit === 'index' ? `${sign}${formattedNumber}` : `${sign}${formattedNumber} ${displayUnit}`,
    };
  }

  const compactUnitMap = {
    'Rs.B': { currency: 'Rs.', unit: 'Billion' },
    'Rs.Cr': { currency: 'Rs.', unit: 'Crore' },
    '$M': { currency: '$', unit: 'Million' },
    '$B': { currency: '$', unit: 'Billion' },
    'Rs.': { currency: 'Rs.', unit: '' },
    Rs: { currency: 'Rs.', unit: '' },
    CNY: { currency: 'CNY', unit: '' },
    JPY: { currency: 'JPY', unit: '' },
    Yen: { currency: 'Yen', unit: '' },
  };

  const compactUnit = compactUnitMap[normalizedUnit];
  if (compactUnit) {
    return {
      value: numericValue,
      currency: compactUnit.currency,
      unit: compactUnit.unit,
      displayValue: [compactUnit.currency, `${sign}${formattedNumber}`, compactUnit.unit].filter(Boolean).join(' '),
    };
  }

  const slashMatch = normalizedUnit.match(/^([^/]+)\/(.+)$/);
  if (slashMatch) {
    const currency = normalizeDisplayUnitText(slashMatch[1]);
    const unit = normalizeDisplayUnitText(slashMatch[2]);

    return {
      value: numericValue,
      currency,
      unit,
      displayValue: [currency, `${sign}${formattedNumber}`, unit].filter(Boolean).join(' '),
    };
  }

  const unit = normalizeDisplayUnitText(normalizedUnit);

  return {
    value: numericValue,
    currency: '',
    unit,
    displayValue: [`${sign}${formattedNumber}`, unit].filter(Boolean).join(' '),
  };
}

function UNUSED_fmtKpiVal(val, unit) {
  if (val == null || isNaN(val)) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (unit === '%') return `${val.toFixed(2)}%`;
  if (unit === 'Rs.B') return `${sign}Rs.${abs >= 1000 ? (abs / 1000).toFixed(1) + 'T' : abs.toFixed(0)}B`;
  if (unit === 'Rs.' || unit === 'Rs') return `${sign}Rs.${abs.toFixed(2)}`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 10) return `${sign}${abs.toFixed(1)} ${unit}`;
  return `${sign}${abs.toFixed(2)} ${unit}`;
}

function UNUSED_formatAllMetricKpiValueLegacy(val, unit) {
  if (val == null || isNaN(val)) return 'â€”';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  const localized = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: abs >= 100 ? 0 : 2,
  });

  if (unit === '%') return `${val.toFixed(2)}%`;
  if (unit === 'index') return abs >= 100 ? `${sign}${abs.toFixed(0)}` : `${sign}${abs.toFixed(2)}`;
  if (unit === 'Rs.B') return `${sign}Rs.${abs.toFixed(0)}B`;
  if (unit === 'Rs.' || unit === 'Rs') return `${sign}Rs.${localized}`;
  if (unit === 'Rs.Cr') return `${sign}Rs.${localized} Cr`;
  if (unit === 'Rs./MT') return `${sign}Rs.${localized}/MT`;
  if (unit === '$M') return `${sign}$${localized}M`;
  if (unit === '$/MT') return `${sign}$${localized}/MT`;
  if (unit === 'pts' || unit === 'units') return `${sign}${localized}`;
  if (unit) return `${sign}${localized} ${unit}`;
  return `${sign}${localized}`;
}

function UNUSED_calculateKpiChangeLegacy(values, unit) {
  const series = Array.isArray(values)
    ? values.filter((value) => typeof value === 'number' && Number.isFinite(value))
    : [];

  if (series.length < 2) {
    return { change: '0.0%', up: true };
  }

  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const delta = current - previous;
  const up = delta >= 0;
  const sign = up ? '+' : '';

  if (unit === '%' || unit === 'index' || unit === 'pts' || unit === 'units') {
    return { change: `${sign}${delta.toFixed(2)}`, up };
  }

  if (previous !== 0) {
    return { change: `${sign}${((delta / Math.abs(previous)) * 100).toFixed(1)}%`, up };
  }

  return { change: `${sign}${delta.toFixed(2)}`, up };
}

function UNUSED_formatKpiLabelLegacy(metricName, unit) {
  if (!unit || unit === 'index' || metricName.includes(`(${unit})`)) {
    return metricName;
  }

  return `${metricName} (${unit})`;
}

function formatAllMetricKpiValue(val, unit) {
  return parseMetricValueParts(val, unit).displayValue;
}

function calculateGrowth(current, previous, unit, metricName = '', industryId = '') {
  if (current == null || previous == null) return { change: 'N/A', up: null, isNA: true };
  const delta = current - previous;
  const normName = normalizeMetricName(metricName);
  const invertColor = industryId === 'commodities' || industryId === 'treasury' ||
    (industryId === 'macro' && ['retail inflation cpi', 'india vix', 'dollar rupee exchange rate', 'dxy index'].includes(normName)) ||
    (industryId === 'transport' && normName === 'crude oil brent');

  let up = invertColor ? delta <= 0 : delta >= 0;
  let sign = delta > 0 ? '+' : '';

  if (unit === '%') {
    const bps = Math.round(delta * 100);
    const displaySign = bps > 0 ? '+' : (bps < 0 ? '-' : '');
    if (invertColor) up = bps <= 0;
    return { change: `${displaySign}${Math.abs(bps)} bps`, up, isNA: false };
  }

  if (previous !== 0) {
    if (normName === 'banking liquidity') {
      const growthVal = ((previous - current) / previous) * 100;
      up = growthVal <= 0;
      sign = growthVal > 0 ? '+' : '';
      return { change: `${sign}${growthVal.toFixed(1)}%`, up, isNA: false };
    }
    const percentGrowth = (delta / Math.abs(previous)) * 100;
    if (invertColor) up = percentGrowth <= 0;
    else up = percentGrowth >= 0;
    sign = percentGrowth > 0 ? '+' : '';
    return { change: `${sign}${percentGrowth.toFixed(1)}%`, up, isNA: false };
  }

  if (invertColor) up = delta <= 0;
  return { change: `${sign}${delta.toFixed(2)}`, up, isNA: false };
}

function getMetricUnit(sectorReference, metricName) {
  if (!sectorReference || typeof sectorReference !== 'object') return '';

  const exactUnit = sectorReference[metricName];
  if (exactUnit) return exactUnit;

  const normalizedMetricName = normalizeMetricName(metricName);
  const matchedEntry = Object.entries(sectorReference).find(([referenceMetricName]) => (
    normalizeMetricName(referenceMetricName) === normalizedMetricName
  ));

  return matchedEntry?.[1] || '';
}

function buildAllSectorKpis(industry) {
  const metricSeries = Array.isArray(industry?.summaryGrowthMetrics)
    ? industry.summaryGrowthMetrics
    : [];

  if (!metricSeries.length) {
    return Array.isArray(industry?.metrics) ? industry.metrics : [];
  }

  const sectorReference = KPI_METRIC_REFERENCE[industry.id] || {};

  const cards = metricSeries
    .map((metric) => {
      const metricName = String(metric?.title || metric?.series?.[0]?.name || '').trim();
      const values = Array.isArray(metric?.series?.[0]?.data) ? metric.series[0].data : [];
      const numericValues = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
      const latestValue = numericValues[numericValues.length - 1];

      if (!metricName || latestValue == null) return null;

      const parsedMetric = parseMetricIdentity(metricName, getMetricUnit(sectorReference, metricName));
      const parsedValue = parseMetricValueParts(latestValue, parsedMetric.unit);

      const isIndex = normalizeUnit(parsedMetric.unit) === 'index';
      const finalName = isIndex ? `${parsedMetric.name} (Index)` : parsedMetric.name;

      const current = latestValue;
      const previousMom = numericValues.length >= 2 ? numericValues[numericValues.length - 2] : null;
      const previousYoy = numericValues.length >= 13 ? numericValues[numericValues.length - 13] : null;

      const mom = calculateGrowth(current, previousMom, parsedMetric.unit, metricName, industry.id);
      const yoy = calculateGrowth(current, previousYoy, parsedMetric.unit, metricName, industry.id);

      return {
        name: finalName,
        value: parsedValue.value,
        currency: parsedValue.currency,
        unit: parsedValue.unit,
        label: finalName,
        displayValue: parsedValue.displayValue,
        mom,
        yoy,
      };
    })
    .filter(Boolean);

  return cards.length ? cards : (Array.isArray(industry?.metrics) ? industry.metrics : []);
}

export default function DashboardPage({ onLogout }) {
  const [selectedId, setSelectedId] = useState(DEFAULT_INDUSTRY);
  const [industryData, setIndustryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendFilter, setTrendFilter] = useState('1Y');
  const [defaultIndustries, setDefaultIndustries] = useState([]);
  const [datasetStatus, setDatasetStatus] = useState({ defaultDataset: null, tempDataset: null, backups: [] });

  const refreshDatasetStatus = useCallback(async () => {
    try {
      const status = await getDatasetStatus();
      setDatasetStatus({
        defaultDataset: status.defaultDataset || null,
        tempDataset: null,
        backups: [],
      });
      return status;
    } catch (err) {
      console.error('Failed to load dataset status:', err);
    }
  }, []);

  const refreshDefaultData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getDashboardData();
      const industries = enrichIndustryList(response.industries || []);
      setDefaultIndustries(industries);
      return industries;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDefaultData();
    refreshDatasetStatus().catch(() => { });
  }, [refreshDefaultData, refreshDatasetStatus]);

  useEffect(() => {
    const activeIndustries = defaultIndustries;
    if (!activeIndustries.length) {
      setIndustryData(null);
      return;
    }

    const nextIndustry = activeIndustries.find((industry) => industry.id === selectedId) || activeIndustries[0];
    setIndustryData(enrichIndustryData(nextIndustry));

    if (nextIndustry.id !== selectedId) {
      setSelectedId(nextIndustry.id);
    }
  }, [selectedId, defaultIndustries]);

  const loadData = useCallback(async (id) => {
    await refreshDefaultData();
    await refreshDatasetStatus();
  }, [refreshDefaultData, refreshDatasetStatus]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const visibleKpis = buildAllSectorKpis(industryData);
  const selectableIndustries = defaultIndustries.length
    ? defaultIndustries
    : INDUSTRIES;

  return (
    <DashboardLayout onLogout={onLogout}>

      {/* ═══════════════════════════════════════��══════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        background: 'var(--c-hero-bg)',
        border: '1px solid var(--c-hero-border)',
        boxShadow: '0 24px 64px var(--c-hero-shadow)',
      }}>
        {/* Top accent line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.7) 30%, rgba(14,165,233,0.5) 70%, transparent 100%)' }} />

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="hero-inner" style={{
          position: 'relative',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          {/* Left: identity */}
          <div className="hero-identity" style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 10, fontWeight: 800, color: 'var(--c-info)',
                background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)',
                borderRadius: 999, padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--c-info)' }} />
                'Analytical Report'
              </span>
              <span style={{ color: 'var(--c-text-5)', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--c-text-4)' }}>{dateStr}</span>
            </div>

            {loading || !industryData ? (
              <div className="skeleton" style={{ width: 280, height: 32, borderRadius: 8, marginBottom: 10 }} />
            ) : (
              <h1 className="hero-title" style={{ color: 'var(--c-text-1)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.2, marginBottom: 8 }}>
                {industryData.title}
              </h1>
            )}

            {industryData && !loading && (
              <p style={{ fontSize: 13, color: 'var(--c-text-3)', lineHeight: 1.6, maxWidth: 560 }}>
                {industryData.subtitle}
              </p>
            )}
          </div>

          {/* Right: controls */}
          <div className="hero-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
            <div className="hero-controls-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div className="hero-dropdown-wrapper" style={{ flexShrink: 0 }}>
                <IndustrySelect
                  value={selectedId}
                  onChange={setSelectedId}
                  loading={loading}
                  industries={selectableIndustries}
                />
              </div>

            </div>

            <div className="hero-status-row" style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: loading ? '#fbbf24' : '#818cf8',
                  boxShadow: loading ? '0 0 6px #fbbf24' : '0 0 6px #818cf8',
                }} />
                <span style={{ fontSize: 11, color: 'var(--c-text-4)', fontWeight: 500 }}>
                  {loading ? 'Loading...' : `Updated · ${timeStr}`}
                </span>
              </div>
              <button
                onClick={() => {
                  loadData(selectedId, null);
                }}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, color: 'var(--c-text-4)', background: 'none', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.4 : 1,
                  fontFamily: 'inherit', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.color = 'var(--c-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-4)'; }}
              >
                <svg style={{ width: 13, height: 13, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-inner {
            padding: 20px 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 24px !important;
          }
          .hero-identity {
            width: 100%;
          }
          .hero-title {
            font-size: 22px !important;
            margin-bottom: 12px !important;
          }
          .hero-controls {
            width: 100% !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .hero-controls-row {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .hero-dropdown-wrapper {
            width: 100% !important;
          }
          .hero-dropdown-wrapper .premium-select {
            width: 100% !important;
            min-width: 0 !important;
          }
          .hero-actions-group {
            width: 100% !important;
            display: flex !important;
            gap: 8px !important;
          }
          .hero-actions-group > button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 0 8px !important;
          }
          .hero-status-row {
            width: 100% !important;
            justify-content: space-between !important;
            gap: 8px !important;
            border-top: 1px solid var(--c-divider);
            padding-top: 12px;
          }
          .hero-btn-text {
            font-size: 11px;
          }
        }
      `}</style>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 12, marginBottom: 20, fontSize: 13, color: '#f87171',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <svg style={{ width: 15, height: 15, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════
          CONTENT
          ═══════════════════════════════════════ */}
      {loading ? (
        <DashboardSkeleton />
      ) : industryData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* KPI Cards */}
          <CollapsibleSection title="Key Performance Indicators">
            <div
              style={{ display: 'grid', gap: 18, marginTop: 14 }}
              className="kpi-grid"
            >
              {visibleKpis.map((metric, i) => {
                return (
                  <KPICard
                    key={i}
                    name={metric.name}
                    label={metric.label}
                    value={metric.displayValue ?? (typeof metric.value === 'string' ? metric.value : formatAllMetricKpiValue(metric.value, metric.unit))}
                    mom={metric.mom}
                    yoy={metric.yoy}
                  />
                );
              })}
            </div>


          </CollapsibleSection>

          {/* Summary Table */}
          <CollapsibleSection title="Summary Growth Table">
            <div style={{ marginTop: 12 }}>
              <SummaryTable
                industryId={industryData.id}
                summaryMetrics={industryData.summaryGrowthMetrics}
                metrics={industryData.charts}
                excludeMetrics={['TVS MOTOR', 'BAJAJ AUTO', 'OLA ELECTRIC', 'ATHER ENERGY', 'HERO MOTOCORP', '2W EV Penetration', '3W EV Penetration', 'Other EV Penetration (PV, CV & Tractor)', 'Overall EV Penetration']}
              />
            </div>
          </CollapsibleSection>

          {industryData.id === 'transport' && (
            <CollapsibleSection title="Top 5 Players - EV 2 Wheeler Market Share">
              <div style={{ marginTop: 12 }}>
                <SummaryTable
                  industryId={industryData.id}
                  summaryMetrics={industryData.summaryGrowthMetrics}
                  metrics={industryData.charts}
                  title="Market Share - EV 2 Wheeler"
                  includeMetrics={['TVS MOTOR', 'BAJAJ AUTO', 'OLA ELECTRIC', 'ATHER ENERGY', 'HERO MOTOCORP']}
                  hideGrowth={true}
                  forceUnit="%"
                  colorScaleRowWise={true}
                  sortByLatest={true}
                />
              </div>
            </CollapsibleSection>
          )}

          {industryData.id === 'transport' && (
            <CollapsibleSection title="Ev Penetration in India">
              <div style={{ marginTop: 12 }}>
                <SummaryTable
                  industryId={industryData.id}
                  summaryMetrics={industryData.summaryGrowthMetrics}
                  metrics={industryData.charts}
                  title="Ev Penetration in India"
                  includeMetrics={['2W EV Penetration', '3W EV Penetration', 'Other EV Penetration (PV, CV & Tractor)', 'Overall EV Penetration']}
                  hideGrowth={true}
                  forceUnit="%"
                  colorScaleRowWise={true}
                  sortByLatest={false}
                />
              </div>
            </CollapsibleSection>
          )}

          {/* Charts */}
          <CollapsibleSection
            title="Trend Analysis"
            actions={
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {['1Y', '3Y', '5Y', 'Max'].map(f => (
                  <button
                    key={f}
                    onClick={() => setTrendFilter(f)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      border: trendFilter === f
                        ? '1px solid rgba(99,102,241,0.5)'
                        : '1px solid var(--c-border)',
                      background: trendFilter === f
                        ? 'rgba(99,102,241,0.15)'
                        : 'transparent',
                      color: trendFilter === f ? '#a5b4fc' : 'var(--c-text-4)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          >
            <div style={{ marginTop: 12 }}>
              <ChartGrid
                summaryMetrics={industryData.summaryGrowthMetrics}
                trendFilter={trendFilter}
                industryId={industryData.id}
              />
            </div>
          </CollapsibleSection>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 16, borderTop: '1px solid var(--c-divider)',
            fontSize: 11, color: 'var(--c-text-4)',
          }}>
            <span>Analytix Intelligence Platform · {dateStr}</span>
            <span>{(datasetStatus.defaultDataset?.originalName || 'All figures are indicative')}</span>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="kpi-grid" style={{ display: 'grid', gap: 18 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="chart-grid-skel">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 240, borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );
}
