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
    const sheetData = { ...(workbookData[sectorConfig.sheet] || {}) };

    if (sectorId === 'transport') {
      const marketShareCompanies = ['TVS MOTOR', 'BAJAJ AUTO', 'OLA ELECTRIC', 'ATHER ENERGY', 'HERO MOTOCORP'];
      marketShareCompanies.forEach(company => {
        const normCompany = normalizeMetricName(company);
        const exactKey = Object.keys(sheetData).find(k => normalizeMetricName(k) === normCompany);
        if (exactKey) {
          sheetData[`${company} (Market Share)`] = sheetData[exactKey];
          delete sheetData[exactKey];
        }
      });

      const getSeries = (name) => {
        const normName = normalizeMetricName(name);
        const entry = Object.entries(sheetData).find(([key]) => normalizeMetricName(key) === normName);
        return entry ? entry[1] : [];
      };

      const twoW = getSeries('2W Registration');
      const threeW = getSeries('3W Registration');
      const pv = getSeries('PV Registration');
      const cv = getSeries('CV Registration');
      const tractor = getSeries('Tractor Registration');

      const eTwoW = getSeries('E-2 Wheelers');
      const eThreeW = getSeries('E-3 Wheelers');
      const eFourW = getSeries('E-4 Wheelers');
      const eBuses = getSeries('E- Buses');

      const baseSeries = twoW.length > 0 ? twoW : (eTwoW.length > 0 ? eTwoW : []);

      if (baseSeries.length > 0) {
        const twoWPenetration = [];
        const threeWPenetration = [];
        const fourWPenetration = [];
        const overallPenetration = [];

        baseSeries.forEach(([dateLabel]) => {
          const getVal = (series) => {
            const point = series.find(([label]) => label === dateLabel);
            return point ? point[1] : 0;
          };

          const v2W = getVal(twoW);
          const v3W = getVal(threeW);
          const vPV = getVal(pv);
          const vCV = getVal(cv);
          const vTractor = getVal(tractor);

          const vE2W = getVal(eTwoW);
          const vE3W = getVal(eThreeW);
          const vE4W = getVal(eFourW);
          const vEBuses = getVal(eBuses);

          twoWPenetration.push([dateLabel, v2W ? (vE2W / v2W) * 100 : 0]);
          threeWPenetration.push([dateLabel, v3W ? (vE3W / v3W) * 100 : 0]);
          
          const denOther = vPV + vCV + vTractor;
          const numOther = vE4W; // E-Buses removed
          fourWPenetration.push([dateLabel, denOther ? (numOther / denOther) * 100 : 0]);

          const denOverall = v2W + v3W + vPV + vCV + vTractor;
          const numOverall = vE2W + vE3W + vE4W + vEBuses;
          overallPenetration.push([dateLabel, denOverall ? (numOverall / denOverall) * 100 : 0]);
        });

        sheetData['2W EV Penetration'] = twoWPenetration;
        sheetData['3W EV Penetration'] = threeWPenetration;
        sheetData['Other EV Penetration (PV, CV & Tractor)'] = fourWPenetration;
        sheetData['Overall EV Penetration'] = overallPenetration;
      }
    }

    const added = new Set();
    const metrics = [];

    // Add configured metrics first
    sectorConfig.metrics.forEach((metricName) => {
      added.add(normalizeMetricName(metricName));
      metrics.push(buildMetricSeries(metricName, sheetData));
    });

    // Append any extra unconfigured metrics found in the sheet
    Object.keys(sheetData).forEach((sheetMetricKey) => {
      const normKey = normalizeMetricName(sheetMetricKey);
      if (normKey === normalizeMetricName('India Nominal GDP')) return;
      if (!added.has(normKey)) {
        added.add(normKey);
        metrics.push(buildMetricSeries(sheetMetricKey, sheetData));
      }
    });

    return [sectorId, metrics];
  })
);

export default SUMMARY_GROWTH_CATALOG;
