export default function RoleTabs({ roles, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="tabs tabs-box grid bg-base-200 p-1" style={{ gridTemplateColumns: `repeat(${roles.length}, minmax(0,1fr))` }}>
      {roles.map((r) => (
        <button
          key={r.value}
          role="tab"
          type="button"
          aria-selected={value === r.value}
          onClick={() => onChange(r.value)}
          className={`tab h-9 px-1 text-[13px] font-medium sm:text-sm ${value === r.value ? 'tab-active' : ''}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
