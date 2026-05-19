import workbookData from './dashboardWorkbookData.json';
import SUMMARY_GROWTH_CONFIG from './summaryGrowthConfig';

function normalizeMetricName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[().,/%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMetricSeries(metricName, sheetData) {
  const normalizedMetricName = normalizeMetricName(metricName);
  const series = Object.entries(sheetData || {}).find(([name]) => (
    normalizeMetricName(name) === normalizedMetricName
  ));
  if (!series) {
    return {
      title: metricName,
      labels: [],
      series: [
        {
          name: metricName,
          data: [],
        },
      ],
    };
  }

  const [, points] = series;

  return {
    title: metricName,
    labels: points.map(([label]) => label),
    series: [
      {
        name: metricName,
        data: points.map(([, value]) => value),
      },
    ],
  };
}

const SUMMARY_GROWTH_CATALOG = Object.fromEntries(
  Object.entries(SUMMARY_GROWTH_CONFIG).map(([sectorId, sectorConfig]) => {
    const sheetData = workbookData[sectorConfig.sheet] || {};
    const metrics = sectorConfig.metrics
      .map((metricName) => buildMetricSeries(metricName, sheetData));

    return [sectorId, metrics];
  })
);

export default SUMMARY_GROWTH_CATALOG;
