import workbookData from '../data/dashboardWorkbookData.json';
import { parseChartLabel } from './chartFilters';

const SERIES_ALIAS_MAP = {
  'gst': 'GST Collections',
  'gst collections': 'GST Collections',
  'cpi': 'Retail Inflation (CPI)',
  'retail inflation cpi': 'Retail Inflation (CPI)',
  'trade balance': 'India Trade Balance',
  'india trade balance': 'India Trade Balance',
  'composite pmi': 'Composite PMI',
  'india vix': 'India VIX',
  'repo rate': 'India Interest Rate',
  'interest rate': 'India Interest Rate',
  'usd inr': 'Dollar Rupee Exchange Rate',
  'dxy': 'DXY Index',
  'deposit growth': 'India Deposit Growth Rate',
  'credit growth': 'India Credit growth rate',
  'mfg pmi': 'Manufacturing PMI',
  'manufacturing pmi': 'Manufacturing PMI',
  'iip overall': 'IIP Overall Growth',
  'capital goods': 'IIP Capital Goods',
  'consumer dur': 'IIP Consumer Durables',
  'consumer durables': 'IIP Consumer Durables',
  'steel production': 'Steel Production',
  'cement production': 'Cement Production',
  'electricity production': 'Electricity Production',
  'coal production': 'Coal Production',
  'natural gas production': 'Natural Gas Production',
  'crude oil production': 'Crude Oil Production',
  'fertilizer production': 'Fertilizer Production',
  'petro refinery': 'Petroleum Refinery Production',
  'petroleum refinery output': 'Petroleum Refinery Production',
  '2w': '2W Registration',
  '2 wheeler': '2W Registration',
  '3w': '3W Registration',
  '3 wheeler': '3W Registration',
  'pv': 'PV Registration',
  'cv': 'CV Registration',
  'tractor': 'Tractor Registration',
  'services pmi': 'Service PMI',
  'service pmi': 'Service PMI',
  'service exports': 'Service Exports',
  'merch exports': 'Merchandise Exports',
  'merchandise exports': 'Merchandise Exports',
  'electronics': 'Electronics Goods',
  'non food credit': 'Non-Food Credit',
  'm1': 'Money Supply',
  'money supply': 'Money Supply',
  'liquidity': 'Banking Liquidity',
  'cc outstanding': 'Credit Card Outstanding',
  'credit card outstanding': 'Credit Card Outstanding',
  'agriculture': 'Credit Deployed (Agri)',
  'industry': 'Credit Deployed (Industries)',
  'services': 'Credit Deployed (Services)',
  'vehicle loans': 'Vehicle Loans',
  'gold loans': 'Loan against gold jewellery',
  'personal credit': 'Credit Deployed (Personal)',
  'other pers loans': 'Other Personal Loans',
  'other personal loans': 'Other Personal Loans',
  'gold price': 'Gold',
  'silver price': 'Silver',
  'copper price': 'Copper',
  'aluminium price': 'Aluminium',
  'steel price': 'Steel',
  'lithium price': 'Lithium',
  'iron ore price': 'Iron',
  'freight': 'Freight Rate',
  'bdi': 'Freight Rate',
  'baltic dry index': 'Freight Rate',
  'cobalt price': 'Cobalt',
  'nickel price': 'Nickel',
  'zinc price': 'Zinc',
  'platinum price': 'Platinum',
  'palladium price': 'Palladium',
  'tin price': 'Tin',
  'india 10y': 'India-10Y',
  'india 2y': 'India-2Y',
  'us 10y': 'US-10Y',
  'us 2y': 'US-2Y',
  'india': 'India-10Y',
  'us': 'US-10Y',
  'china': 'China-10Y',
  'japan': 'Japan-10Y',
  'china 10y': 'China-10Y',
  'china 2y': 'China-2Y',
  'japan 10y': 'Japan-10Y',
  'japan 2y': 'Japan-2Y',
  'jpy usd': 'Japanese Yen/USD',
  'cny usd': 'CNY/USD',
  'inr euro': 'INR/Euro',
  'nifty 50': 'Nifty 50',
  'nse 500': 'NSE 500',
  'midcap 150': 'Nifty midcap 150',
  'midcap 100': 'Nifty midcap 100',
  'smallcap 250': 'Nifty smallcap 250',
  'smallcap 100': 'Nifty smallcap 100',
  's&p 500': 'S&P 500',
  'nasdaq': 'Nasdaq',
  'nikkei 225': 'Nikkei 225',
  'topix': 'TOPIX',
  'shanghai': 'Shanghai Composite Index',
  'csi 300': 'CSI 300',
  'euro stoxx 50': 'EURO STOXX 50',
  'stoxx 600': 'STOXX Europe 600',
};

const SPECIAL_CHART_SOURCES = {
  'US Yield Curve Spread 10Y-2Y (%)': [{ type: 'spread', name: '10Y-2Y', minuend: 'US-10Y', subtrahend: 'US-2Y' }],
  'India Yield Spread 10Y-2Y (%)': [{ type: 'spread', name: 'India Spread', minuend: 'India-10Y', subtrahend: 'India-2Y' }],
  'China Yield Spread 10Y-2Y (%)': [{ type: 'spread', name: 'China Spread', minuend: 'China-10Y', subtrahend: 'China-2Y' }],
  'Japan Yield Spread 10Y-2Y (%)': [{ type: 'spread', name: 'Japan Spread', minuend: 'Japan-10Y', subtrahend: 'Japan-2Y' }],
};

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(exchange|rate|rates|index|indices|price|prices|comparison|overview|combined|registrations|registration|output)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const workbookSeriesIndex = Object.values(workbookData).reduce((acc, sheet) => {
  Object.entries(sheet || {}).forEach(([metricName, points]) => {
    acc[metricName] = points;
    acc[normalize(metricName)] = points;
  });
  return acc;
}, {});

function resolveMetricPoints(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    const alias = SERIES_ALIAS_MAP[normalized];
    if (alias && workbookSeriesIndex[alias]) {
      return workbookSeriesIndex[alias];
    }

    if (workbookSeriesIndex[candidate]) {
      return workbookSeriesIndex[candidate];
    }

    if (workbookSeriesIndex[normalized]) {
      return workbookSeriesIndex[normalized];
    }
  }

  return null;
}

function buildSpreadSeries(name, minuendMetric, subtrahendMetric, color) {
  const minuend = resolveMetricPoints(minuendMetric);
  const subtrahend = resolveMetricPoints(subtrahendMetric);
  if (!minuend || !subtrahend) return null;

  const subtrahendMap = new Map(subtrahend);
  const points = minuend
    .filter(([label]) => subtrahendMap.has(label))
    .map(([label, value]) => [label, Number((value - subtrahendMap.get(label)).toFixed(4))]);

  if (!points.length) return null;

  return {
    name,
    color,
    points,
  };
}

function sortLabels(labels) {
  return [...labels].sort((left, right) => {
    const leftDate = parseChartLabel(left);
    const rightDate = parseChartLabel(right);

    if (!leftDate || !rightDate) return 0;
    return leftDate - rightDate;
  });
}

function hydrateChart(chart) {
  const specialSources = SPECIAL_CHART_SOURCES[chart.title];
  const resolvedSeries = specialSources
    ? specialSources.map((source, index) =>
        buildSpreadSeries(
          source.name,
          source.minuend,
          source.subtrahend,
          chart.series[index]?.color
        )
      ).filter(Boolean)
    : chart.series.map((seriesEntry) => {
        const points = resolveMetricPoints(
          chart.title,
          seriesEntry.name,
          `${seriesEntry.name} ${chart.unit}`,
          `${chart.title} ${seriesEntry.name}`
        );

        if (!points) return null;

        return {
          name: seriesEntry.name,
          color: seriesEntry.color,
          points,
        };
      }).filter(Boolean);

  if (!resolvedSeries.length) {
    return chart;
  }

  const labels = sortLabels(
    Array.from(new Set(resolvedSeries.flatMap((seriesEntry) => seriesEntry.points.map(([label]) => label))))
  );

  const hydratedSeries = resolvedSeries.map((seriesEntry) => {
    const pointMap = new Map(seriesEntry.points);
    return {
      ...chart.series.find((item) => item.name === seriesEntry.name),
      name: seriesEntry.name,
      color: seriesEntry.color,
      data: labels.map((label) => pointMap.get(label)),
    };
  });

  return {
    ...chart,
    labels,
    series: hydratedSeries,
  };
}

export function hydrateChartsFromWorkbook(industry) {
  if (!industry || !Array.isArray(industry.charts)) {
    return industry;
  }

  return {
    ...industry,
    charts: industry.charts.map(hydrateChart),
  };
}
