import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { filterChartSeriesByRange } from '../../utils/chartFilters';

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;

  const [entry] = payload.reduce((items, item) => {
    const key = item.dataKey ?? item.name;
    if (!items.some((existing) => (existing.dataKey ?? existing.name) === key)) {
      items.push(item);
    }
    return items;
  }, []);

  if (!entry) return null;

  const formattedLabel = String(label || '').replace(/\b20(\d{2})\b/g, '$1');

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>{formattedLabel}</p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '12px',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: entry.color }} />
        <span style={{ fontWeight: 700, color: '#0f172a' }}>
          {entry.value.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
};

const formatTick = (v) => {
  if (v == null || !Number.isFinite(v)) return v;
  const absV = Math.abs(v);

  if (absV >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (absV >= 1_000) {
    return `${(v / 1_000).toFixed(2).replace(/\.?0+$/, '')}K`;
  }

  return Math.round(v * 100) / 100;
};

function dedupeSeries(series = []) {
  const seen = new Set();

  return series.filter((seriesItem) => {
    const data = Array.isArray(seriesItem?.data) ? seriesItem.data : [];
    const key = JSON.stringify({
      name: String(seriesItem?.name || '').trim(),
      data,
    });

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function LineChartCard({
  chartId,
  title,
  unit,
  labels,
  series,
  trendFilter,
  emptyState = false,
  isExpanded = false,
  onToggleExpand,
}) {
  const { isDark } = useTheme();

  // Corporate styling colors
  const titleColor = '#0f172a'; // Dark Navy
  const axisLabelColor = '#64748b'; // Muted Grey-Blue
  const axisLineColor = '#cbd5e1'; // Light Grey
  const gridLineColor = '#f1f5f9'; // Very Light Grey

  const { labels: visibleLabels, series: visibleSeries } = filterChartSeriesByRange(labels, series, trendFilter);
  const chartSeries = dedupeSeries(visibleSeries).map((seriesItem, index) => ({
    ...seriesItem,
    dataKey: `series_${index}`,
  }));
  const data = visibleLabels.map((label, i) => {
    const point = { label };
    chartSeries.forEach((seriesItem) => {
      point[seriesItem.dataKey] = seriesItem.data[i];
    });
    return point;
  });

  const chartHeight = isExpanded ? 400 : 200;

  return (
    <div
      className={`chart-card rounded-sm flex flex-col overflow-hidden${isExpanded ? ' chart-card--expanded' : ''}`}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '16px'
      }}
      id={chartId}
    >
      <div
        className="chart-card__header"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.4,
            margin: 0
          }}>
            {title}
          </h3>
        </div>

        <div className="chart-card__header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {unit && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: axisLabelColor,
              letterSpacing: '0.02em'
            }}>
              ({unit})
            </span>
          )}
          <button
            type="button"
            className="chart-card__resize-btn"
            onClick={() => onToggleExpand?.(chartId)}
            aria-pressed={isExpanded}
            title={isExpanded ? 'Minimize' : 'Resize'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isExpanded ? (
                <path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7" />
              ) : (
                <path d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="chart-card__body flex-1" style={{ minHeight: chartHeight }}>
        {emptyState ? (
          <div style={{
            height: chartHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            Data not available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke={gridLineColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 500 }}
                tickLine={{ stroke: axisLineColor }}
                axisLine={{ stroke: axisLineColor }}
                interval="preserveStartEnd"
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 500 }}
                tickLine={{ stroke: axisLineColor }}
                axisLine={{ stroke: axisLineColor }}
                width={45}
                tickFormatter={formatTick}
                domain={['auto', 'auto']}
                allowDecimals={true}
                nice={true}
              />
              <Tooltip
                content={<CustomTooltip unit={unit} />}
                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
              />
              {chartSeries.length > 1 && (
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{
                    fontSize: '10px',
                    paddingBottom: 20,
                    fontWeight: 600,
                    color: axisLabelColor
                  }}
                  iconType="circle"
                  iconSize={6}
                />
              )}

              {chartSeries.map((seriesItem) => (
                <Line
                  key={seriesItem.dataKey}
                  type="monotone"
                  dataKey={seriesItem.dataKey}
                  name={seriesItem.name}
                  stroke={seriesItem.color}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: '#fff',
                    fill: seriesItem.color,
                  }}
                  isAnimationActive={true}
                  animationDuration={500}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
