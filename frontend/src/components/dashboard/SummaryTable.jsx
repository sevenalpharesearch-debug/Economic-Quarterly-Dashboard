import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SUMMARY_GROWTH_CATALOG from '../../data/summaryGrowthCatalog';
import KPI_METRIC_REFERENCE from '../../data/kpiMetricReference';


const FILTER_MONTH_COUNTS = {
  '3M': 4,
  '6M': 7,
  '9M': 10,
  '12M': 13,
  '24M': 25,
};

const MONTH_INDEX = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function parseMonthLabel(label) {
  if (typeof label !== 'string') return null;

  const cleaned = label.trim().replace(/\s+/g, ' ');
  const parts = cleaned
    .split(/[\s/-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  const monthToken = parts[0].toLowerCase();
  const month = MONTH_INDEX[monthToken];
  if (month == null) return null;

  const yearToken = parts[parts.length - 1];
  const numericYear = Number.parseInt(yearToken, 10);
  if (Number.isNaN(numericYear)) return null;

  const year = yearToken.length <= 2 ? 2000 + numericYear : numericYear;
  const monthDate = new Date(Date.UTC(year, month, 1));

  return {
    key: monthDate.toISOString(),
    date: monthDate,
    shortLabel: monthDate.toLocaleDateString('en-GB', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }).replace(' ', '-'),
  };
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === '—') return false;
  }
  return !Number.isNaN(Number(value));
}

function toNumber(value) {
  return isValidValue(value) ? Number(value) : null;
}

function normalizeMetricName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[().,/%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatMetricName(value) {
  return String(value || '').trim();
}

function formatDisplayMetricName(name) {
  const metric = String(name || '').trim();
  const lower = metric.toLowerCase();

  const mapping = {
    'nifty 50': 'Nifty 50 (India)',
    'nse 500': 'NSE 500 (India)',
    'nifty midcap 150': 'Nifty midcap 150 (India)',
    'nifty midcap 100': 'Nifty midcap 100 (India)',
    'nifty smallcap 250': 'Nifty smallcap 250 (India)',
    'nifty smallcap 100': 'Nifty smallcap 100 (India)',
    's&p 500': 'S&P 500 (USA)',
    'nasdaq': 'Nasdaq (USA)',
    'nikkei 225': 'Nikkei 225 (Japan)',
    'topix': 'TOPIX (Japan)',
    'shanghai composite index': 'Shanghai Composite Index (China)',
    'csi 300': 'CSI 300 (China)',
    'euro stoxx 50': 'EURO STOXX 50 (Europe)',
    'stoxx europe 600': 'STOXX Europe 600 (Europe)'
  };

  return mapping[lower] || metric;
}

function formatMonthlyValue(value) {
  if (!isFiniteNumber(value)) return '—';

  // For large values (1,000 or more), round to nearest whole number and remove decimals
  if (Math.abs(value) >= 1000) {
    return Math.round(value).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  // For small values, keep up to 2 decimals
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatGrowthValue(growth, unit) {
  if (!isFiniteNumber(growth)) return '—';
  if (unit === '%') {
    const displaySign = growth > 0 ? '+' : '';
    return `${displaySign}${Math.round(growth)} bps`;
  }
  return `${growth.toFixed(1)}%`;
}

function calculateGrowth(firstValue, lastValue, unit, metricName = '') {
  if (!isFiniteNumber(firstValue) || !isFiniteNumber(lastValue)) {
    return null;
  }

  if (unit === '%') {
    return (lastValue - firstValue) * 100;
  }

  if (firstValue === 0) return null;

  if (normalizeMetricName(metricName) === 'india trade balance') {
    return ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
  }

  if (normalizeMetricName(metricName) === 'banking liquidity') {
    return ((firstValue - lastValue) / firstValue) * 100;
  }

  return ((lastValue - firstValue) / firstValue) * 100;
}

function buildRowsFromMetricSeries(metrics) {
  if (!Array.isArray(metrics)) return [];

  return metrics
    .map((metric) => {
      const labels = Array.isArray(metric.labels) ? metric.labels : [];
      const values = Array.isArray(metric.series?.[0]?.data) ? metric.series[0].data : [];
      const pointCount = Math.min(labels.length, values.length);

      const valueByMonth = {};
      const availableMonths = [];

      for (let index = 0; index < pointCount; index += 1) {
        const parsedMonth = parseMonthLabel(labels[index]);
        if (!parsedMonth) continue;

        valueByMonth[parsedMonth.key] = values[index];
        availableMonths.push(parsedMonth);
      }

      return {
        metric: formatMetricName(metric.title || metric.series?.[0]?.name || 'Untitled Metric'),
        description: metric.description,
        valueByMonth,
        availableMonths,
      };
    })
    .filter(Boolean);
}

function buildRowsFromCharts(charts) {
  if (!Array.isArray(charts)) return [];

  const rowsByMetric = new Map();

  // Fallback path for uploaded or legacy data: split charts into individual
  // metric rows and de-duplicate by normalized metric name.
  charts.forEach((chart) => {
    const labels = Array.isArray(chart.labels) ? chart.labels : [];
    const seriesList = Array.isArray(chart.series) ? chart.series : [];

    seriesList.forEach((series) => {
      const values = Array.isArray(series.data) ? series.data : [];
      const pointCount = Math.min(labels.length, values.length);
      if (!pointCount) return;

      const metricName = formatMetricName(
        series.name || chart.title || 'Untitled Metric'
      );
      const metricKey = normalizeMetricName(metricName);

      const valueByMonth = {};
      const availableMonths = [];

      for (let index = 0; index < pointCount; index += 1) {
        const parsedMonth = parseMonthLabel(labels[index]);
        if (!parsedMonth) continue;

        valueByMonth[parsedMonth.key] = values[index];
        availableMonths.push(parsedMonth);
      }

      if (!availableMonths.length) return;

      const existing = rowsByMetric.get(metricKey);
      if (!existing || availableMonths.length > existing.availableMonths.length) {
        rowsByMetric.set(metricKey, {
          metric: metricName,
          description: series.description || chart.description,
          valueByMonth,
          availableMonths,
        });
      }
    });
  });

  return Array.from(rowsByMetric.values());
}

function buildVisibleMonths(rows, filter) {
  const allMonths = new Map();

  rows.forEach((row) => {
    row.availableMonths.forEach((month) => {
      allMonths.set(month.key, month);
    });
  });

  const sortedMonths = Array.from(allMonths.values()).sort((a, b) => a.date - b.date);
  const visibleCount = FILTER_MONTH_COUNTS[filter] ?? FILTER_MONTH_COUNTS['12M'];

  // Always anchor the selected filter to the latest month in the dataset.
  return sortedMonths.slice(-visibleCount);
}

function normalizeUnitText(unit) {
  if (!unit) return 'Absolute';

  const unitMap = {
    'Rs.B': 'Rs. Billion',
    'Rs.Cr': 'Rs. Crore',
    '$B': 'Billions ($)',
    '$M': 'Millions ($)',
    'Rs.': 'INR',
    'index': 'Index',
    'pts': 'Index',
    'units': 'Units',
    '%': '%',
    'P/E': 'P/E Ratio',
  };

  return unitMap[unit] || unit;
}

function getMetricUnit(industryId, metricName) {
  // Special case for Monthly IPO Data
  if (normalizeMetricName(metricName) === 'monthly ipo data') {
    return 'IPOs';
  }

  if (!industryId || !KPI_METRIC_REFERENCE[industryId]) return 'Absolute';

  const sectorRef = KPI_METRIC_REFERENCE[industryId];

  // Try exact match
  if (sectorRef[metricName]) return normalizeUnitText(sectorRef[metricName]);

  // Try normalized match
  const normalizedMetricName = normalizeMetricName(metricName);
  const matchedEntry = Object.entries(sectorRef).find(([refName]) => (
    normalizeMetricName(refName) === normalizedMetricName
  ));

  return normalizeUnitText(matchedEntry?.[1]);
}

function buildDisplayRows(rows, visibleMonths, industryId) {
  const distance = visibleMonths.length > 1 ? visibleMonths.length - 1 : 0;

  return rows.map((row) => {
    // Normalize every row against the same visible month model so the
    // rendered table always has one stable column structure.
    const monthCells = visibleMonths.map((month) => ({
      key: month.key,
      label: month.shortLabel,
      value: row.valueByMonth[month.key] ?? null,
    }));

    let startValue = undefined;
    let endValue = undefined;

    if (distance > 0) {
      // Find the most recent available month within the visible range
      for (let i = visibleMonths.length - 1; i >= 0; i--) {
        const month = visibleMonths[i];
        const val = toNumber(monthCells[i].value);

        if (val !== null) {
          endValue = val;

          // Calculate exact date for the corresponding past month
          const targetDate = new Date(month.date);
          targetDate.setUTCMonth(targetDate.getUTCMonth() - distance);
          const targetKey = targetDate.toISOString();

          const pastVal = toNumber(row.valueByMonth[targetKey]);
          if (pastVal !== null) {
            startValue = pastVal;
          }
          break;
        }
      }
    }

    const unit = getMetricUnit(industryId, row.metric);

    return {
      ...row,
      monthCells,
      growth: calculateGrowth(startValue, endValue, unit, row.metric),
      unit,
    };
  });
}

function getTableDensity(monthCount) {
  if (monthCount <= 4) {
    return {
      metricWidthPx: 260,
      unitsWidthPx: 140,
      growthWidthPx: 110,
      headerFontSize: 11,
      cellFontSize: 12.5,
      metricFontSize: 12.5,
      cellPadding: '13px 12px',
      metricPadding: '13px 14px',
      growthPadding: '13px 14px',
      filterPadding: '4px 11px',
    };
  }

  if (monthCount <= 7) {
    return {
      metricWidthPx: 220,
      unitsWidthPx: 130,
      growthWidthPx: 105,
      headerFontSize: 10.5,
      cellFontSize: 11.5,
      metricFontSize: 12,
      cellPadding: '11px 9px',
      metricPadding: '12px 12px',
      growthPadding: '12px 12px',
      filterPadding: '4px 10px',
    };
  }

  return {
    metricWidthPx: 190,
    unitsWidthPx: 120,
    growthWidthPx: 100,
    headerFontSize: 9.5,
    cellFontSize: 10,
    metricFontSize: 11.5,
    cellPadding: '10px 6px',
    metricPadding: '10px 10px',
    growthPadding: '10px 8px',
    filterPadding: '3px 9px',
  };
}

const SOLID_CONTAINER_BG = 'linear-gradient(var(--c-surface-2), var(--c-surface-2)), var(--c-bg)';
const SOLID_HEADER_BG = `linear-gradient(var(--c-surface-hover), var(--c-surface-hover)), linear-gradient(var(--c-surface-hover), var(--c-surface-hover)), ${SOLID_CONTAINER_BG}`;

export default function SummaryTable({ industryId, summaryMetrics, metrics }) {
  const [filter, setFilter] = useState('12M');
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const scrollContainerRef = useRef(null);

  const workbookMetrics = useMemo(() => {
    return industryId ? SUMMARY_GROWTH_CATALOG[industryId] || [] : [];
  }, [industryId]);

  const rows = useMemo(() => {
    const explicitMetricRows = buildRowsFromMetricSeries(summaryMetrics);
    if (explicitMetricRows.length) return explicitMetricRows;

    const workbookRows = buildRowsFromMetricSeries(workbookMetrics);
    if (workbookRows.length) return workbookRows;

    return buildRowsFromCharts(metrics);
  }, [summaryMetrics, workbookMetrics, metrics]);

  const visibleMonths = useMemo(
    () => buildVisibleMonths(rows, filter),
    [rows, filter]
  );
  const density = useMemo(
    () => getTableDensity(visibleMonths.length),
    [visibleMonths.length]
  );
  const monthWidth = useMemo(() => {
    if (visibleMonths.length > 13) return '85px';
    const reservedWidth = density.metricWidthPx + density.unitsWidthPx + density.growthWidthPx;
    return `calc((100% - ${reservedWidth}px) / ${Math.max(visibleMonths.length, 1)})`;
  }, [density.growthWidthPx, density.metricWidthPx, density.unitsWidthPx, visibleMonths.length]);
  const displayRows = useMemo(() => {
    return buildDisplayRows(rows, visibleMonths, industryId);
  }, [rows, visibleMonths, industryId]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
      });
    }
  }, [filter, displayRows.length]);

  if (!displayRows.length) return null;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .mobile-show-block { display: block !important; }
          .mobile-show-flex { display: flex !important; }
          
          .mobile-scroll-x {
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .mobile-scroll-x::-webkit-scrollbar {
            display: none;
          }
          
          .mobile-metric-col {
            width: 140px !important;
            min-width: 140px !important;
            position: sticky !important;
            left: 0 !important;
          }
          
          .mobile-month-col {
            width: 95px !important;
            min-width: 95px !important;
          }
          
          .mobile-growth-col {
            width: 95px !important;
            min-width: 95px !important;
          }

          .mobile-compact-header {
            padding: 10px 14px !important;
            gap: 8px !important;
          }

          .mobile-title-text {
            font-size: 13px !important;
          }
          
          .mobile-metric-text {
            font-size: 11.5px !important;
            font-weight: 700 !important;
          }
          
          .mobile-unit-text {
            font-size: 10px !important;
            color: var(--c-text-3) !important;
            font-weight: 500 !important;
            margin-top: 2px !important;
          }
          
          .mobile-cell-text {
            font-size: 10px !important;
          }
          
          .mobile-header-cell {
            font-size: 9.5px !important;
            padding: 8px 6px !important;
          }
        }
      `}</style>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--c-surface-2)',
          border: '1px solid var(--c-border)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 150px)',
        }}
      >
        <div
          className="mobile-compact-header"
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--c-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'nowrap',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 }}>
            <div
              style={{
                width: 4,
                height: 16,
                borderRadius: 2,
                background: 'linear-gradient(180deg, #6366f1, #4f46e5)',
                flexShrink: 0,
              }}
            />
            <h3
              className="mobile-title-text"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)' }}
            >
              Summary Growth Table
            </h3>
            <span
              className="mobile-hide"
              style={{ fontSize: 11, color: 'var(--c-text-4)', fontWeight: 500 }}
            >
              {displayRows.length} metrics
            </span>
          </div>

          <div
            className="mobile-scroll-x"
            style={{ display: 'flex', gap: 4, flexShrink: 1, minWidth: 0 }}
          >
            {['3M', '6M', '9M', '12M', '24M'].map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                style={{
                  padding: density.filterPadding,
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.06em',
                  border: filter === option
                    ? '1px solid rgba(99,102,241,0.5)'
                    : '1px solid var(--c-border)',
                  background: filter === option ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: filter === option ? '#a5b4fc' : 'var(--c-text-4)',
                  transition: 'all 0.15s ease',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          style={{
            width: '100%',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            flex: 1,
            minHeight: 0,
          }}
        >
          <table
            style={{
              width: filter === '24M' ? 'max-content' : '100%',
              minWidth: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col className="mobile-metric-col" style={{ width: `${density.metricWidthPx}px` }} />
              <col className="mobile-hide" style={{ width: `${density.unitsWidthPx}px` }} />
              {visibleMonths.map((month) => (
                <col className="mobile-month-col" key={month.key} style={{ width: monthWidth }} />
              ))}
              <col className="mobile-growth-col" style={{ width: `${density.growthWidthPx}px` }} />
            </colgroup>

            <thead>
              <tr style={{ background: 'var(--c-surface-hover)' }}>
                <th
                  className="mobile-metric-col mobile-header-cell"
                  style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 40,
                    background: SOLID_HEADER_BG,
                    padding: density.metricPadding,
                    textAlign: 'left',
                    fontSize: density.headerFontSize,
                    fontWeight: 800,
                    color: 'var(--c-text-1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid var(--c-divider)',
                    borderRight: '1px solid var(--c-divider)',
                  }}
                >
                  Metric
                </th>

                <th
                  className="mobile-hide"
                  style={{
                    position: 'sticky',
                    top: 0,
                    left: density.metricWidthPx,
                    zIndex: 40,
                    background: SOLID_HEADER_BG,
                    padding: density.metricPadding,
                    textAlign: 'left',
                    fontSize: density.headerFontSize * 1.1,
                    fontWeight: 800,
                    color: 'var(--c-text-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid var(--c-divider)',
                    borderRight: '1px solid var(--c-divider)',
                    boxShadow: '4px 0 8px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Units
                </th>

                {visibleMonths.map((month) => (
                  <th
                    key={month.key}
                    className="mobile-month-col mobile-header-cell"
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 30,
                      background: SOLID_HEADER_BG,
                      padding: density.cellPadding,
                      textAlign: 'right',
                      fontSize: density.headerFontSize,
                      fontWeight: 800,
                      color: 'var(--c-text-1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      borderBottom: '1px solid var(--c-divider)',
                    }}
                  >
                    {month.shortLabel}
                  </th>
                ))}

                <th
                  className="mobile-growth-col mobile-header-cell"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 30,
                    background: SOLID_HEADER_BG,
                    padding: density.growthPadding,
                    textAlign: 'right',
                    fontSize: density.headerFontSize,
                    fontWeight: 800,
                    color: '#a5b4fc',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--c-divider)',
                  }}
                >
                  % Growth
                </th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, rowIndex) => {
                let isPositive = isFiniteNumber(row.growth) ? row.growth >= 0 : null;
                if (isPositive !== null) {
                  const normName = normalizeMetricName(row.metric);
                  const invertColor = industryId === 'commodities' || industryId === 'treasury' ||
                    (industryId === 'macro' && ['retail inflation cpi', 'india vix', 'dollar rupee exchange rate', 'dxy index'].includes(normName)) ||
                    (industryId === 'transport' && normName === 'crude oil brent');

                  if (normName === 'banking liquidity') {
                    isPositive = row.growth <= 0;
                  } else if (invertColor) {
                    isPositive = row.growth <= 0;
                  }
                }
                const growthColor = isPositive == null
                  ? 'var(--c-text-4)'
                  : isPositive
                    ? '#34d399'
                    : '#f87171';
                const growthBackground = isPositive == null
                  ? 'rgba(148,163,184,0.08)'
                  : isPositive
                    ? 'rgba(16,185,129,0.10)'
                    : 'rgba(239,68,68,0.08)';
                const growthBorder = isPositive == null
                  ? 'rgba(148,163,184,0.16)'
                  : isPositive
                    ? 'rgba(16,185,129,0.20)'
                    : 'rgba(239,68,68,0.18)';
                const rowBackground = rowIndex % 2 === 0
                  ? 'var(--c-surface-2)'
                  : 'var(--c-surface-hover)';
                const stickyCellBackground = `linear-gradient(${rowBackground}, ${rowBackground}), linear-gradient(${rowBackground}, ${rowBackground}), ${SOLID_CONTAINER_BG}`;

                return (
                  <tr key={`${row.metric}-${rowIndex}`} style={{ background: rowBackground }}>
                    <td
                      className="mobile-metric-col"
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                        background: stickyCellBackground,
                        padding: density.metricPadding,
                        fontSize: density.metricFontSize,
                        fontWeight: 700,
                        color: 'var(--c-text-1)',
                        whiteSpace: 'normal',
                        lineHeight: 1.35,
                        overflowWrap: 'break-word',
                        verticalAlign: 'middle',
                        borderBottom: '1px solid var(--c-divider-2)',
                        borderRight: '1px solid var(--c-divider)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                          <span className="mobile-metric-text" style={{ flexShrink: 1 }}>{formatDisplayMetricName(row.metric)}</span>
                          {row.description && (
                            <div className="flex-shrink-0" style={{ height: '14px', display: 'flex', alignItems: 'center' }}>
                              <div
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltipPos({
                                    top: rect.bottom + 8,
                                    left: rect.left + 12
                                  });
                                  setHoveredMetric(row);
                                }}
                                onMouseLeave={() => setHoveredMetric(null)}
                                className="flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 cursor-help"
                                style={{ width: '14px', height: '14px', fontSize: '9px', fontWeight: 'bold', fontFamily: 'serif' }}
                              >
                                i
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mobile-show-block mobile-unit-text" style={{ display: 'none' }}>
                          {row.unit}
                        </div>
                      </div>
                    </td>

                    <td
                      className="mobile-hide"
                      style={{
                        position: 'sticky',
                        left: density.metricWidthPx,
                        zIndex: 20,
                        background: stickyCellBackground,
                        padding: density.metricPadding,
                        fontSize: density.cellFontSize * 1.1,
                        fontWeight: 800,
                        color: 'var(--c-text-2)',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                        borderBottom: '1px solid var(--c-divider-2)',
                        borderRight: '1px solid var(--c-divider)',
                        boxShadow: '4px 0 8px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {row.unit}
                    </td>

                    {row.monthCells.map((cell) => (
                      <td
                        key={`${row.metric}-${cell.key}`}
                        className="mobile-month-col"
                        style={{
                          padding: density.cellPadding,
                          textAlign: 'right',
                          fontSize: density.cellFontSize,
                          color: 'var(--c-text-2)',
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.01em',
                          overflow: 'hidden',
                          verticalAlign: 'middle',
                          borderBottom: '1px solid var(--c-divider-2)',
                        }}
                      >
                        <div className="mobile-cell-text" style={{ width: '100%', overflow: 'hidden' }}>
                          {formatMonthlyValue(cell.value)}
                        </div>
                      </td>
                    ))}

                    <td
                      className="mobile-growth-col"
                      style={{
                        padding: density.growthPadding,
                        textAlign: 'right',
                        verticalAlign: 'middle',
                        borderBottom: '1px solid var(--c-divider-2)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '76px',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: growthColor,
                          background: growthBackground,
                          border: `1px solid ${growthBorder}`,
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1,
                        }}
                      >
                        {formatGrowthValue(row.growth, row.unit)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Portal Tooltip */}
        {hoveredMetric && hoveredMetric.description && createPortal(
          <div
            style={{
              position: 'fixed',
              top: tooltipPos.top,
              left: tooltipPos.left,
              width: '230px',
              background: '#ffffff',
              color: '#1f2937',
              border: '1px solid #cfd6df',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '13px',
              lineHeight: '1.45',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.14)',
              zIndex: 99999,
              pointerEvents: 'none',
              whiteSpace: 'normal',
              wordBreak: 'normal',
            }}
          >
            {hoveredMetric.description}
          </div>,
          document.body
        )}
      </div>
    </>
  );
}
