import { useMemo, useState } from 'react';
import KPI_METRIC_REFERENCE from '../../data/kpiMetricReference';
import LineChartCard from './LineChartCard';

const CHART_COLORS = ['#0d9488', '#1e40af', '#475569', '#166534', '#b45309', '#991b1b', '#334155'];

function normalizeMetricName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[().,/%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMetricUnit(sectorReference, metricName) {
  if (!sectorReference || typeof sectorReference !== 'object') return '';

  let unit = '';
  const exactUnit = sectorReference[metricName];
  if (exactUnit) {
    unit = exactUnit;
  } else {
    const normalizedMetricName = normalizeMetricName(metricName);
    const matchedEntry = Object.entries(sectorReference).find(([referenceMetricName]) => (
      normalizeMetricName(referenceMetricName) === normalizedMetricName
    ));
    unit = matchedEntry?.[1] || '';
  }

  if (unit.toLowerCase() === 'pts') return 'Index';
  return unit;
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
    'stoxx europe 600': 'STOXX Europe 600 (Europe)',
    'natural gas (india)': 'Natural Gas (India)',
    'natural gas (us)': 'Natural Gas (US)'
  };
  
  return mapping[lower] || metric;
}

function dedupeRawSeries(series) {
  const seen = new Set();

  return series.filter((seriesItem) => {
    const key = JSON.stringify({
      name: String(seriesItem?.name || '').trim(),
      data: Array.isArray(seriesItem?.data) ? seriesItem.data : [],
    });

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildChartCards(summaryMetrics, industryId) {
  const sectorReference = KPI_METRIC_REFERENCE[industryId] || {};

  return (Array.isArray(summaryMetrics) ? summaryMetrics : []).map((metric, index) => {
    const rawTitle = String(metric?.title || metric?.series?.[0]?.name || `Metric ${index + 1}`).trim();
    const title = formatDisplayMetricName(rawTitle);
    const labels = Array.isArray(metric?.labels) ? metric.labels : [];
    const rawSeries = Array.isArray(metric?.series) && metric.series.length
      ? metric.series
      : [{ name: title, data: [] }];
    const uniqueSeries = dedupeRawSeries(rawSeries);
    const hasData = labels.length > 0 && rawSeries.some((seriesItem) => (
      Array.isArray(seriesItem?.data)
      && seriesItem.data.some((value) => typeof value === 'number' && Number.isFinite(value))
    ));

    return {
      id: `${industryId}-${normalizeMetricName(rawTitle)}-${index}`,
      title,
      unit: getMetricUnit(sectorReference, rawTitle),
      labels,
      series: uniqueSeries.map((seriesItem, seriesIndex) => ({
        name: String(seriesItem?.name ? formatDisplayMetricName(seriesItem.name) : (seriesIndex === 0 ? title : `Series ${seriesIndex + 1}`)).trim(),
        data: Array.isArray(seriesItem?.data) ? seriesItem.data : [],
        color: CHART_COLORS[seriesIndex % CHART_COLORS.length],
      })),
      hasData,
    };
  });
}

export default function ChartGrid({ summaryMetrics, trendFilter, industryId }) {
  const [activeChartId, setActiveChartId] = useState(null);
  const chartCards = useMemo(
    () => buildChartCards(summaryMetrics, industryId),
    [summaryMetrics, industryId]
  );

  function handleToggleExpand(chartId) {
    setActiveChartId((current) => (current === chartId ? null : chartId));
  }

  return (
    <div className="chart-grid">
      {chartCards.map((chart) => (
        <LineChartCard
          key={chart.id}
          chartId={chart.id}
          title={chart.title}
          unit={chart.unit}
          labels={chart.labels}
          series={chart.series}
          trendFilter={trendFilter}
          emptyState={!chart.hasData}
          isExpanded={activeChartId === chart.id}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  );
}
