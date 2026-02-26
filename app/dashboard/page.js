'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { formatKwh, MONTHS_NL } from '../../lib/utils'
import StatCard from '../../components/StatCard'

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [tenants, setTenants] = useState([])
  const [readings, setReadings] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, tenant:tenants(*)')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .order('name')

    setTenants(tenantsData || [])

    const { data: readingsData } = await supabase
      .from('meter_readings')
      .select('*')
      .order('year', { ascending: true })
      .order('month', { ascending: true })

    setReadings(readingsData || [])

    const grouped = {}
    readingsData?.forEach(r => {
      const key = `${r.year}-${r.month}`
      if (!grouped[key]) {
        grouped[key] = { 
          year: r.year, 
          month: r.month, 
          readings: [],
          totalConsumption: 0,
          generalConsumption: 0,
          tenantConsumption: {}
        }
      }
      grouped[key].readings.push(r)
      
      const consumption = r.consumption || 0
      
      if (r.tenant_id === null) {
        grouped[key].generalConsumption += consumption
      } else {
        if (!grouped[key].tenantConsumption[r.tenant_id]) {
          grouped[key].tenantConsumption[r.tenant_id] = 0
        }
        grouped[key].tenantConsumption[r.tenant_id] += consumption
      }
      grouped[key].totalConsumption += consumption
    })

    const monthlyArray = Object.values(grouped).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })

    setMonthlyData(monthlyArray)
    setLoading(false)
  }

  useEffect(() => {
    if (selectedYear === null && readings.length > 0) {
      const years = new Set()
      readings.forEach(r => {
        years.add(r.year)
      })
      const sortedYears = Array.from(years).sort((a, b) => b - a)
      if (sortedYears.length > 0) {
        setSelectedYear(sortedYears[0])
      }
    }
  }, [readings, selectedYear])

  const getAvailableYears = () => {
    const years = new Set()
    readings.forEach(r => {
      years.add(r.year)
    })
    return Array.from(years).sort((a, b) => b - a)
  }

  const TENANT_ORDER = ['brijosh', 'kattencafe', 'barb', 'fitness', 'glowb', 'rijschool']

  const getTenantSortOrder = (tenant) => {
    const index = TENANT_ORDER.indexOf(tenant?.slug)
    return index === -1 ? 999 : index
  }

  const getReadingsForYear = (year) => {
    const monthsInYear = monthlyData
      .filter(m => m.year === year)
      .sort((a, b) => a.month - b.month)

    return monthsInYear.map(monthData => {
      const tenantReadings = monthData.readings
        .filter(r => r.tenant_id !== null)
        .map(r => {
          const tenant = tenants.find(t => t.id === r.tenant_id)
          return {
            ...r,
            tenant,
            displayName: `${tenant?.name || 'Onbekend'} - ${r.space}`
          }
        })
        .sort((a, b) => {
          const orderCompare = getTenantSortOrder(a.tenant) - getTenantSortOrder(b.tenant)
          if (orderCompare !== 0) return orderCompare
          return a.space.localeCompare(b.space)
        })

      return {
        month: monthData.month,
        year: monthData.year,
        readings: tenantReadings
      }
    })
  }

  if (loading) {
    return <div style={{ color: 'rgba(232, 230, 225, 0.5)' }}>Laden...</div>
  }

  const isAdmin = profile?.role === 'admin'
  const availableYears = getAvailableYears()
  const totalConsumption = monthlyData.reduce((sum, m) => sum + m.totalConsumption, 0)
  const latestMonth = monthlyData[0]

  const getMyConsumption = (monthData) => {
    if (!profile?.tenant_id) return 0
    const myConsumption = monthData.tenantConsumption[profile.tenant_id] || 0
    const tenantsWithConsumption = Object.keys(monthData.tenantConsumption).length
    const generalShare = tenantsWithConsumption > 0 ? monthData.generalConsumption / tenantsWithConsumption : 0
    return myConsumption + generalShare
  }

  const readingsForYear = getReadingsForYear(selectedYear)

  const getMyReadingsForYear = (year) => {
    if (!profile?.tenant_id) return []
    
    const monthsInYear = monthlyData
      .filter(m => m.year === year)
      .sort((a, b) => a.month - b.month)

    return monthsInYear.map(monthData => {
      const myReadings = monthData.readings
        .filter(r => r.tenant_id === profile.tenant_id)
        .sort((a, b) => a.space.localeCompare(b.space))

      return {
        month: monthData.month,
        year: monthData.year,
        readings: myReadings
      }
    }).filter(m => m.readings.length > 0)
  }

  const myReadingsForYear = !isAdmin ? getMyReadingsForYear(selectedYear) : []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
          Dashboard
        </h2>
        <p style={{ color: 'rgba(232, 230, 225, 0.4)', marginTop: 4, fontSize: 14 }}>
          {isAdmin ? 'Overzicht elektriciteitsverbruik' : `Welkom terug, ${profile?.display_name}`}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard 
          label="Totaal verbruik" 
          value={formatKwh(isAdmin ? totalConsumption : monthlyData.reduce((sum, m) => sum + getMyConsumption(m), 0))} 
          unit="kWh" 
          color="#4A7FB5" 
          icon="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
        />
        {latestMonth && (
          <StatCard 
            label={`${MONTHS_NL[latestMonth.month]} ${latestMonth.year}`}
            value={formatKwh(isAdmin ? latestMonth.totalConsumption : getMyConsumption(latestMonth))} 
            unit="kWh" 
            color="#E85D3A" 
            icon="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2" 
          />
        )}
      </div>

      {/* Totaal verbruik per maand */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
          Totaal verbruik per maand
        </h3>
        {monthlyData.length === 0 ? (
          <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>Nog geen verbruik geregistreerd.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Maand</th>
                  {isAdmin ? (
                    <>
                      <th style={{ textAlign: 'right' }}>Totaal</th>
                      <th style={{ textAlign: 'right' }}>Algemeen</th>
                    </>
                  ) : (
                    <>
                      <th style={{ textAlign: 'right' }}>Eigen</th>
                      <th style={{ textAlign: 'right' }}>Alg.</th>
                      <th style={{ textAlign: 'right' }}>Aandeel</th>
                      <th style={{ textAlign: 'right' }}>Totaal</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => {
                  const myOwnConsumption = m.tenantConsumption[profile?.tenant_id] || 0
                  const tenantsWithConsumption = Object.keys(m.tenantConsumption).length
                  const myGeneralShare = tenantsWithConsumption > 0 ? m.generalConsumption / tenantsWithConsumption : 0
                  const myTotal = myOwnConsumption + myGeneralShare

                  return (
                    <tr key={`${m.year}-${m.month}`}>
                      <td style={{ fontWeight: 600 }}>{MONTHS_NL[m.month].substring(0, 3)} {m.year}</td>
                      {isAdmin ? (
                        <>
                          <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'" }}>
                            {formatKwh(m.totalConsumption)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'rgba(232, 230, 225, 0.5)', fontFeatureSettings: "'tnum'" }}>
                            {formatKwh(m.generalConsumption)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'" }}>
                            {formatKwh(myOwnConsumption)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'rgba(232, 230, 225, 0.5)', fontFeatureSettings: "'tnum'" }}>
                            {formatKwh(m.generalConsumption)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'rgba(232, 230, 225, 0.5)', fontFeatureSettings: "'tnum'" }}>
                            {formatKwh(myGeneralShare)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: profile?.tenant?.color || '#E85D3A', fontFeatureSettings: "'tnum'" }}>
                            {formatKwh(myTotal)}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verbruik per huurder per jaar (admin view) */}
      {isAdmin && availableYears.length > 0 && selectedYear && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Verbruik per huurder — {selectedYear}
            </h3>
            <select
              className="input"
              style={{ width: 'auto', padding: '8px 12px' }}
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {readingsForYear.length === 0 ? (
            <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>Geen verbruik geregistreerd voor {selectedYear}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {readingsForYear.map(monthData => (
                <div key={`${monthData.year}-${monthData.month}`}>
                  <h4 style={{ 
                    margin: '0 0 12px', 
                    fontSize: 14, 
                    fontWeight: 700,
                    color: '#E85D3A',
                    borderBottom: '1px solid rgba(232, 93, 58, 0.3)',
                    paddingBottom: 8
                  }}>
                    {MONTHS_NL[monthData.month]}
                  </h4>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Huurder</th>
                          <th style={{ textAlign: 'right' }}>Start</th>
                          <th style={{ textAlign: 'right' }}>Eind</th>
                          <th style={{ textAlign: 'right' }}>Verbruik</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthData.readings.map((reading, idx) => (
                          <tr key={`${reading.tenant_id}-${reading.space}-${idx}`}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: 3, background: reading.tenant?.color || '#888', flexShrink: 0 }} />
                                <span style={{ fontSize: 12 }}>{reading.displayName}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'", color: 'rgba(232, 230, 225, 0.5)' }}>
                              {formatKwh(reading.previous_reading)}
                            </td>
                            <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'", color: 'rgba(232, 230, 225, 0.5)' }}>
                              {formatKwh(reading.current_reading)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: reading.tenant?.color || '#888', fontFeatureSettings: "'tnum'" }}>
                              {formatKwh(reading.consumption || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tenant view: own consumption per space */}
      {!isAdmin && availableYears.length > 0 && selectedYear && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Mijn verbruik — {selectedYear}
            </h3>
            {availableYears.length > 1 && (
              <select
                className="input"
                style={{ width: 'auto', padding: '8px 12px' }}
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
          </div>
          
          {myReadingsForYear.length === 0 ? (
            <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>Geen verbruik geregistreerd voor {selectedYear}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {myReadingsForYear.map(monthData => (
                <div key={`${monthData.year}-${monthData.month}`}>
                  <h4 style={{ 
                    margin: '0 0 12px', 
                    fontSize: 14, 
                    fontWeight: 700,
                    color: profile?.tenant?.color || '#E85D3A',
                    borderBottom: `1px solid ${profile?.tenant?.color || '#E85D3A'}50`,
                    paddingBottom: 8
                  }}>
                    {MONTHS_NL[monthData.month]}
                  </h4>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ruimte</th>
                          <th style={{ textAlign: 'right' }}>Start</th>
                          <th style={{ textAlign: 'right' }}>Eind</th>
                          <th style={{ textAlign: 'right' }}>Verbruik</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthData.readings.map((reading, idx) => (
                          <tr key={`${reading.space}-${idx}`}>
                            <td style={{ fontWeight: 500 }}>{reading.space}</td>
                            <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'", color: 'rgba(232, 230, 225, 0.5)' }}>
                              {formatKwh(reading.previous_reading)}
                            </td>
                            <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'", color: 'rgba(232, 230, 225, 0.5)' }}>
                              {formatKwh(reading.current_reading)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: profile?.tenant?.color || '#E85D3A', fontFeatureSettings: "'tnum'" }}>
                              {formatKwh(reading.consumption || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
