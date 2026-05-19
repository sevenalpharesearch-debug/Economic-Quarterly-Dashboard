const RANGE_TO_YEARS = {
  '1Y': 1,
  '3Y': 3,
  '5Y': 5,
};

const MONTH_LOOKUP = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseChartLabel(label) {
  if (typeof label !== 'string') return null;

  const trimmed = label.trim();
  const monthYearMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = MONTH_LOOKUP[monthYearMatch[1].slice(0, 3).toLowerCase()];
    const year = Number(monthYearMatch[2]);

    if (month != null && Number.isFinite(year)) {
      return new Date(Date.UTC(year, month, 1));
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  return null;
}

export function filterChartSeriesByRange(labels = [], series = [], trendFilter, now = new Date()) {
  if (!Array.isArray(labels) || !Array.isArray(series) || trendFilter === 'Max') {
    return { labels, series };
  }

  const years = RANGE_TO_YEARS[trendFilter];
  if (!years) {
    return { labels, series };
  }

  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  const includedIndexes = labels.reduce((indexes, label, index) => {
    const pointDate = parseChartLabel(label);
    if (!pointDate || pointDate >= cutoff) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  if (!includedIndexes.length) {
    return { labels, series };
  }

  return {
    labels: includedIndexes.map((index) => labels[index]),
    series: series.map((entry) => ({
      ...entry,
      data: includedIndexes.map((index) => entry.data?.[index]),
    })),
  };
}
