export default function StatCard({ label, value, unit, color = '#E85D3A', icon }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="label" style={{ marginBottom: 12 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>{value}</span>
            {unit && <span style={{ fontSize: 14, color: 'rgba(232, 230, 225, 0.4)', fontWeight: 500 }}>{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className="hide-mobile" style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
