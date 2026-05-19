import INDUSTRIES from '../../data/industries';

export default function IndustrySelect({ value, onChange, loading, industries = INDUSTRIES }) {
  const options = Array.isArray(industries) && industries.length ? industries : INDUSTRIES;

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap hidden sm:block">
        Instruments
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className="premium-select disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {options.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
        {/* Custom chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
