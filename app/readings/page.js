'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { formatKwh, MONTHS_NL } from '../../lib/utils'

const INITIAL_YEAR = 2025
const INITIAL_MONTH = 7

export default function ReadingsPage() {
  const [tenants, setTenants] = useState([])
  const [readings, setReadings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showInitialForm, setShowInitialForm] = useState(false)
  const [editingMonth, setEditingMonth] = useState(null)
  const [formYear, setFormYear] = useState(new Date().getFullYear())
  const [formMonth, setFormMonth] = useState(new Date().getMonth())
  const [formMeters, setFormMeters] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .order('name')

    setTenants(tenantsData || [])

    const { data: readingsData } = await supabase
      .from('meter_readings')
      .select('*, tenant:tenants(*)')
      .order('year', { ascending: true })
      .order('month', { ascending: true })

    setReadings(readingsData || [])
    setLoading(false)
  }

  const getPreviousReading = (tenantId, space, year, month) => {
    const prevReadings = readings.filter(r => 
      r.tenant_id === tenantId && 
      r.space === space &&
      (r.year < year || (r.year === year && r.month < month))
    ).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })
    
    return prevReadings[0]?.current_reading || 0
  }

  const getMonthlyReadings = () => {
    const grouped = {}
    readings.forEach(r => {
      const key = `${r.year}-${r.month}`
      if (!grouped[key]) {
        grouped[key] = { year: r.year, month: r.month, readings: [], isInitial: false }
      }
      if (r.year === INITIAL_YEAR && r.month === INITIAL_MONTH) {
        grouped[key].isInitial = true
      }
      grouped[key].readings.push(r)
    })
    
    return Object.values(grouped).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })
  }

  const hasInitialReadings = () => {
    return true
  }

  const initForm = (year, month, existingReadings = []) => {
    const meters = {}
    
    const existingGeneral = existingReadings.find(r => r.tenant_id === null && r.space === 'Algemeen')
    const prevGeneral = getPreviousReading(null, 'Algemeen', year, month)
    meters['general_Algemeen'] = {
      tenant_id: null,
      space: 'Algemeen',
      current: existingGeneral?.current_reading ?? '',
      previous: prevGeneral,
      id: existingGeneral?.id
    }
    
    tenants.forEach(t => {
      t.spaces.forEach(space => {
        const key = `${t.id}_${space}`
        const existing = existingReadings.find(r => r.tenant_id === t.id && r.space === space)
        const prev = getPreviousReading(t.id, space, year, month)
        meters[key] = {
          tenant_id: t.id,
          space,
          current: existing?.current_reading ?? '',
          previous: prev,
          id: existing?.id
        }
      })
    })
    setFormMeters(meters)
  }

  const initInitialForm = () => {
    const meters = {}
    
    const existingGeneral = readings.find(r => 
      r.tenant_id === null && 
      r.space === 'Algemeen' && 
      r.year === INITIAL_YEAR && 
      r.month === INITIAL_MONTH
    )
    meters['general_Algemeen'] = {
      tenant_id: null,
      space: 'Algemeen',
      initial: existingGeneral?.current_reading ?? '',
      id: existingGeneral?.id
    }
    
    tenants.forEach(t => {
      t.spaces.forEach(space => {
        const key = `${t.id}_${space}`
        const existing = readings.find(r => 
          r.tenant_id === t.id && 
          r.space === space && 
          r.year === INITIAL_YEAR && 
          r.month === INITIAL_MONTH
        )
        meters[key] = {
          tenant_id: t.id,
          space,
          initial: existing?.current_reading ?? '',
          id: existing?.id
        }
      })
    })
    setFormMeters(meters)
  }

  const openNewReading = () => {
    setEditingMonth(null)
    const lastReading = getMonthlyReadings()[0]
    if (lastReading) {
      if (lastReading.month === 11) {
        setFormYear(lastReading.year + 1)
        setFormMonth(0)
      } else {
        setFormYear(lastReading.year)
        setFormMonth(lastReading.month + 1)
      }
    } else {
      setFormYear(2025)
      setFormMonth(8)
    }
    initForm(formYear, formMonth, [])
    setShowForm(true)
  }

  const openEditReading = (monthData) => {
    setEditingMonth(monthData)
    setFormYear(monthData.year)
    setFormMonth(monthData.month)
    initForm(monthData.year, monthData.month, monthData.readings)
    setShowForm(true)
  }

  const openInitialReadings = () => {
    initInitialForm()
    setShowInitialForm(true)
  }

  const updateMeter = (key, value) => {
    setFormMeters(prev => ({
      ...prev,
      [key]: { ...prev[key], current: value === '' ? '' : parseFloat(value) || 0 }
    }))
  }

  const updateInitialMeter = (key, value) => {
    setFormMeters(prev => ({
      ...prev,
      [key]: { ...prev[key], initial: value === '' ? '' : parseFloat(value) || 0 }
    }))
  }

  const saveReadings = async () => {
    setSaving(true)

    for (const [key, meter] of Object.entries(formMeters)) {
      const currentVal = typeof meter.current === 'number' ? meter.current : 0
      const previousVal = meter.previous || 0
      const consumption = Math.max(0, currentVal - previousVal)

      const data = {
        year: formYear,
        month: formMonth,
        tenant_id: meter.tenant_id,
        space: meter.space,
        previous_reading: previousVal,
        current_reading: currentVal,
        consumption: consumption,
        updated_at: new Date().toISOString()
      }

      if (meter.id) {
        await supabase.from('meter_readings').update(data).eq('id', meter.id)
      } else {
        await supabase.from('meter_readings').insert(data)
      }
    }

    setSaving(false)
    setShowForm(false)
    loadData()
  }

  const saveInitialReadings = async () => {
    setSaving(true)

    for (const [key, meter] of Object.entries(formMeters)) {
      const initialVal = typeof meter.initial === 'number' ? meter.initial : 0

      const data = {
        year: INITIAL_YEAR,
        month: INITIAL_MONTH,
        tenant_id: meter.tenant_id,
        space: meter.space,
        previous_reading: 0,
        current_reading: initialVal,
        consumption: 0,
        updated_at: new Date().toISOString()
      }

      if (meter.id) {
        await supabase.from('meter_readings').update(data).eq('id', meter.id)
      } else {
        await supabase.from('meter_readings').insert(data)
      }
    }

    setSaving(false)
    setShowInitialForm(false)
    loadData()
  }

  const deleteMonth = async (monthData) => {
    if (monthData.isInitial) {
      if (!confirm('Dit zijn de initiële meterstanden. Weet je zeker dat je deze wilt verwijderen?')) return
    } else {
      if (!confirm(`Weet je zeker dat je de meterstanden van ${MONTHS_NL[monthData.month]} ${monthData.year} wilt verwijderen?`)) return
    }

    for (const reading of monthData.readings) {
      await supabase.from('meter_readings').delete().eq('id', reading.id)
    }

    loadData()
  }

  if (loading) {
    return <div style={{ color: 'rgba(232, 230, 225, 0.5)' }}>Laden...</div>
  }

  const monthlyReadings = getMonthlyReadings()

  if (showInitialForm) {
    return (
      <div>
        <button 
          onClick={() => setShowInitialForm(false)} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'rgba(232, 230, 225, 0.5)', 
            padding: '8px 0', 
            marginBottom: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Terug
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: -0.3 }}>
          Initiële meterstanden
        </h2>
        <p style={{ color: 'rgba(232, 230, 225, 0.5)', marginBottom: 24, fontSize: 14 }}>
          Beginstand per 31 augustus 2025
        </p>

        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #9B59B6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#9B59B6' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Algemene meter</h3>
          </div>
          <input
            type="number"
            className="input"
            placeholder="Beginstand"
            value={formMeters['general_Algemeen']?.initial ?? ''}
            onChange={e => updateInitialMeter('general_Algemeen', e.target.value)}
          />
        </div>

        {tenants.map(tenant => (
          <div key={tenant.id} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${tenant.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: tenant.color }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{tenant.name}</h3>
            </div>

            {tenant.spaces.map(space => {
              const key = `${tenant.id}_${space}`
              const meter = formMeters[key] || {}

              return (
                <div key={space} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: 'rgba(232,230,225,0.5)', marginBottom: 4, display: 'block' }}>{space}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Beginstand"
                    value={meter.initial ?? ''}
                    onChange={e => updateInitialMeter(key, e.target.value)}
                  />
                </div>
              )
            })}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={saveInitialReadings} disabled={saving}>
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowInitialForm(false)}>
            Annuleren
          </button>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div>
        <button 
          onClick={() => setShowForm(false)} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'rgba(232, 230, 225, 0.5)', 
            padding: '8px 0', 
            marginBottom: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Terug
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 24px', letterSpacing: -0.3 }}>
          {editingMonth ? 'Meterstand bewerken' : 'Nieuwe meterstand'}
        </h2>

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Jaar</label>
              <select 
                className="input" 
                value={formYear} 
                onChange={e => {
                  const newYear = parseInt(e.target.value)
                  setFormYear(newYear)
                  initForm(newYear, formMonth, editingMonth?.readings || [])
                }}
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Maand</label>
              <select 
                className="input" 
                value={formMonth} 
                onChange={e => {
                  const newMonth = parseInt(e.target.value)
                  setFormMonth(newMonth)
                  initForm(formYear, newMonth, editingMonth?.readings || [])
                }}
              >
                {MONTHS_NL.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #9B59B6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#9B59B6' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Algemene meter</h3>
          </div>
          
          {(() => {
            const meter = formMeters['general_Algemeen'] || {}
            const consumption = (typeof meter.current === 'number' ? meter.current : 0) - (meter.previous || 0)
            
            return (
              <div>
                <div style={{ fontSize: 12, color: 'rgba(232,230,225,0.4)', marginBottom: 8 }}>
                  Begin: {formatKwh(meter.previous || 0)}
                </div>
                <input
                  type="number"
                  className="input"
                  placeholder="Eindstand"
                  value={meter.current ?? ''}
                  onChange={e => updateMeter('general_Algemeen', e.target.value)}
                />
                {consumption > 0 && (
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#9B59B6' }}>
                    Verbruik: {formatKwh(consumption)} kWh
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {tenants.map(tenant => (
          <div key={tenant.id} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${tenant.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: tenant.color }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{tenant.name}</h3>
            </div>

            {tenant.spaces.map(space => {
              const key = `${tenant.id}_${space}`
              const meter = formMeters[key] || {}
              const consumption = (typeof meter.current === 'number' ? meter.current : 0) - (meter.previous || 0)

              return (
                <div key={space} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: 'rgba(232,230,225,0.5)', marginBottom: 4, display: 'block' }}>
                    {space} (begin: {formatKwh(meter.previous || 0)})
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Eindstand"
                    value={meter.current ?? ''}
                    onChange={e => updateMeter(key, e.target.value)}
                  />
                  {consumption > 0 && (
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: tenant.color }}>
                      Verbruik: {formatKwh(consumption)} kWh
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={saveReadings} disabled={saving}>
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
            Annuleren
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Meterstanden</h2>
        <p style={{ color: 'rgba(232, 230, 225, 0.4)', marginTop: 4, fontSize: 14 }}>
          Beheer maandelijkse opnames
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexDirection: 'column' }}>
        <button className="btn btn-primary" onClick={openNewReading} disabled={!hasInitialReadings()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nieuwe opname
        </button>
      </div>

      {monthlyReadings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>
            Nog geen meterstanden ingevoerd.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {monthlyReadings.map(monthData => {
            const totalConsumption = monthData.readings.reduce((sum, r) => sum + (r.consumption || 0), 0)
            return (
              <div 
                key={`${monthData.year}-${monthData.month}`} 
                className="card" 
                style={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, display: 'block' }}>
                      {monthData.isInitial ? 'Initieel (31/08/2025)' : `${MONTHS_NL[monthData.month]} ${monthData.year}`}
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(232,230,225,0.4)' }}>
                      {monthData.isInitial ? 'Beginstand' : `${formatKwh(totalConsumption)} kWh`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 12px', fontSize: 13 }}
                      onClick={() => monthData.isInitial ? openInitialReadings() : openEditReading(monthData)}
                    >
                      Bewerk
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '8px 12px', fontSize: 13 }}
                      onClick={() => deleteMonth(monthData)}
                    >
                      Wis
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
