import React from 'react';

/**
 * Splits a KPI value string into prefix, numeric part, and suffix.
 * Replaces standard hyphens with the proper minus symbol '−' for professional typography.
 */
function parseValueParts(value) {
  const text = String(value ?? '').trim();
  
  // Regex to capture:
  // 1. Any leading non-numeric chars (currency symbols, etc.)
  // 2. The main number (including sign, commas, dots)
  // 3. Any trailing chars (units like 'B', 'M', 'bps', etc.)
  const match = text.match(/^([^0-9+−-]*)([+−-]?[0-9][0-9,.-]*)(.*)$/);

  if (!match) {
    return { 
      prefix: '', 
      number: text.replace(/-/g, '−'), 
      suffix: '' 
    };
  }

  return {
    prefix: match[1].trim(),
    number: match[2].trim().replace(/-/g, '−'),
    suffix: match[3].trim(),
  };
}

export default function KPICard({ name, label, value, mom, yoy }) {
  const { prefix, number, suffix } = parseValueParts(value);
  const title = String(name || label || '').trim();

  const renderGrowthItem = (data, labelText) => {
    const isNA = !data || data.isNA;
    const up = data?.up;
    const change = String(data?.change || 'N/A').replace(/-/g, '−');
    
    let statusClass = 'neutral';
    let arrow = '−';

    if (!isNA) {
      if (up === true) {
        statusClass = 'positive';
        arrow = '↑';
      } else if (up === false) {
        statusClass = 'negative';
        arrow = '↓';
      }
    }

    return (
      <div className="growth-item">
        <span className="growth-label">{labelText}</span>
        <div className={`growth-pill ${statusClass}`}>
          <span className="growth-arrow" aria-hidden="true">{arrow}</span>
          <span className="growth-value">{change}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="kpi-card fade-up">
      <div className="kpi-accent" />
      
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
      </div>

      <div className="kpi-value-row">
        {prefix && <span className="kpi-unit kpi-unit--prefix">{prefix}</span>}
        <span className="kpi-value-number">{number}</span>
        {suffix && <span className="kpi-unit kpi-unit--suffix">{suffix}</span>}
      </div>

      <div className="kpi-growth-row">
        {renderGrowthItem(mom, 'MoM Growth')}
        {renderGrowthItem(yoy, 'YoY Growth')}
      </div>
    </div>
  );
}
