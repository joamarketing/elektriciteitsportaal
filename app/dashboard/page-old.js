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

    // Load tenants
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .order('name')

    setTenants(tenantsData || [])

    // Load all readings
    const { data: readingsData } = await supabase
      .from('meter_readings')
      .select('*')
      .order('year', { ascending: true })
      .order('month', { ascending: true })

    setReadings(readingsData || [])

    // Process monthly data
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
        // General meter
        grouped[key].generalConsumption += consumption
      } else {
        // Tenant meter
        if (!grouped[key].tenantConsumption[r.tenant_id]) {
          grouped[key].tenantConsumption[r.tenant_id] = 0
        }
        grouped[key].tenantConsumption[r.tenant_id] += consumption
      }
      grouped[key].totalConsumption += consumption
    })

    // Convert to array and sort descending
    const monthlyArray = Object.values(grouped).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })

    setMonthlyData(monthlyArray)
    setLoading(false)
  }

  if (loading) {
    return <div style={{ color: 'rgba(232, 230, 225, 0.5)' }}>Laden...</div>
  }

  const isAdmin = profile?.role === 'admin'

  // Calculate totals
  const totalConsumption = monthlyData.reduce((sum, m) => sum + m.totalConsumption, 0)
  const latestMonth = monthlyData[0]

  // For tenants, filter to show only their data
  const getMyConsumption = (monthData) => {
    if (!profile?.tenant_id) return 0
    const myConsumption = monthData.tenantConsumption[profile.tenant_id] || 0
    // Add share of general meter (divided by number of tenants with consumption)
    const tenantsWithConsumption = Object.keys(monthData.tenantConsumption).length
    const generalShare = tenantsWithConsumption > 0 ? monthData.generalConsumption / tenantsWithConsumption : 0
    return myConsumption + generalShare
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
          Dashboard
        </h2>
        <p style={{ color: 'rgba(232, 230, 225, 0.4)', marginTop: 4, fontSize: 14 }}>
          {isAdmin ? 'Overzicht elektriciteitsverbruik' : `Welkom terug, ${profile?.display_name}`}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
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

      {/* Monthly consumption overview */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
          Verbruik per maand
        </h3>
        {monthlyData.length === 0 ? (
          <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>Nog geen meterstanden ingevoerd.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Maand</th>
                <th style={{ textAlign: 'right' }}>Totaal verbruik</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Algemene meter</th>}
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(m => (
                <tr key={`${m.year}-${m.month}`}>
                  <td style={{ fontWeight: 600 }}>{MONTHS_NL[m.month]} {m.year}</td>
                  <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'" }}>
                    {formatKwh(isAdmin ? m.totalConsumption : getMyConsumption(m))} kWh
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right', color: 'rgba(232, 230, 225, 0.5)', fontFeatureSettings: "'tnum'" }}>
                      {formatKwh(m.generalConsumption)} kWh
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Consumption per tenant (admin only) or own details (tenant) */}
      {latestMonth && (
        <div className="card">
          <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
            {isAdmin ? `Verbruik per huurder — ${MONTHS_NL[latestMonth.month]} ${latestMonth.year}` : 'Mijn verbruik details'}
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>Huurder</th>
                <th style={{ textAlign: 'right' }}>Eigen verbruik</th>
                <th style={{ textAlign: 'right' }}>Aandeel algemeen</th>
                <th style={{ textAlign: 'right' }}>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {tenants
                .filter(t => isAdmin || t.id === profile?.tenant_id)
                .map(tenant => {
                  const ownConsumption = latestMonth.tenantConsumption[tenant.id] || 0
                  const tenantsWithConsumption = Object.keys(latestMonth.tenantConsumption).length
                  const generalShare = tenantsWithConsumption > 0 ? latestMonth.generalConsumption / tenantsWithConsumption : 0
                  const total = ownConsumption + generalShare
                  
                  return (
                    <tr key={tenant.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 4, background: tenant.color }} />
                          <span style={{ fontWeight: 600 }}>{tenant.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'" }}>
                        {formatKwh(ownConsumption)} kWh
                      </td>
                      <td style={{ textAlign: 'right', color: 'rgba(232, 230, 225, 0.5)', fontFeatureSettings: "'tnum'" }}>
                        {formatKwh(generalShare)} kWh
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: tenant.color, fontFeatureSettings: "'tnum'" }}>
                        {formatKwh(total)} kWh
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
