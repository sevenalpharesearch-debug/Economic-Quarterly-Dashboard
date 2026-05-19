import { useId, useState } from 'react';

export default function CollapsibleSection({
  title,
  actions,
  children,
  defaultExpanded = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <div className="dashboard-section__title-row">
          <div className="dashboard-section__accent" />
          <span className="dashboard-section__title">{title}</span>
          <div className="dashboard-section__divider" />
        </div>

        <div className="dashboard-section__controls">
          {actions ? <div className="dashboard-section__actions">{actions}</div> : null}
          <button
            type="button"
            className="dashboard-section__toggle"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            aria-controls={contentId}
          >
            <span className="dashboard-section__toggle-icon" aria-hidden="true">
              {isExpanded ? '-' : '+'}
            </span>
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      <div
        id={contentId}
        className={`dashboard-section__body-shell${isExpanded ? ' is-expanded' : ''}`}
        aria-hidden={!isExpanded}
      >
        {/* The shell animates between 0fr and 1fr so content can collapse smoothly at any height. */}
        <div className="dashboard-section__body">
          {children}
        </div>
      </div>
    </section>
  );
}
