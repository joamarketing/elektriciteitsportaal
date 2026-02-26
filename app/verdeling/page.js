'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { formatNumber, formatKwh, MONTHS_NL, withMarge } from '../../lib/utils'

export default function VerdelingPage() {
  const [profile, setProfile] = useState(null)
  const [tenants, setTenants] = useState([])
  const [readings, setReadings] = useState([])
  const [invoices, setInvoices] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
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

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    setInvoices(invoicesData || [])
    setLoading(false)
  }

  const calculateDistribution = (year, month) => {
    const invoice = invoices.find(i => i.year === year && i.month === month)
    if (!invoice) return null

    const amountWithMarge = invoice.amount_with_marge || withMarge(invoice.total_amount)

    const monthReadings = readings.filter(r => r.year === year && r.month === month)
    
    const tenantConsumption = {}
    let generalConsumption = 0
    let totalTenantConsumption = 0

    monthReadings.forEach(r => {
      if (r.tenant_id === null) {
        generalConsumption += r.consumption || 0
      } else {
        if (!tenantConsumption[r.tenant_id]) {
          tenantConsumption[r.tenant_id] = 0
        }
        tenantConsumption[r.tenant_id] += r.consumption || 0
        totalTenantConsumption += r.consumption || 0
      }
    })

    const tenantsWithConsumption = Object.keys(tenantConsumption).length
    const generalSharePerTenant = tenantsWithConsumption > 0 ? generalConsumption / tenantsWithConsumption : 0

    const totalConsumption = totalTenantConsumption + generalConsumption

    const distribution = tenants.map(tenant => {
      const ownConsumption = tenantConsumption[tenant.id] || 0
      const generalShare = ownConsumption > 0 ? generalSharePerTenant : 0
      const totalTenantConsumptionWithGeneral = ownConsumption + generalShare
      
      const percentage = totalConsumption > 0 
        ? (totalTenantConsumptionWithGeneral / totalConsumption * 100) 
        : 0
      
      const amount = totalConsumption > 0 
        ? (totalTenantConsumptionWithGeneral / totalConsumption * amountWithMarge)
        : 0

      return {
        tenant,
        ownConsumption,
        generalShare,
        totalConsumption: totalTenantConsumptionWithGeneral,
        percentage,
        amount
      }
    }).filter(d => d.totalConsumption > 0)

    return {
      year,
      month,
      invoice,
      amountWithMarge,
      totalConsumption,
      generalConsumption,
      distribution
    }
  }

  const getMonthsWithInvoices = () => {
    return invoices.map(inv => ({
      year: inv.year,
      month: inv.month,
      key: `${inv.year}-${inv.month}`
    }))
  }

  if (loading) {
    return <div style={{ color: 'rgba(232, 230, 225, 0.5)' }}>Laden...</div>
  }

  const isAdmin = profile?.role === 'admin'
  const monthsWithInvoices = getMonthsWithInvoices()

  if (selectedMonth) {
    const data = calculateDistribution(selectedMonth.year, selectedMonth.month)
    
    if (!data) {
      return (
        <div>
          <button 
            onClick={() => setSelectedMonth(null)} 
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
          <div className="card">
            <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>
              Geen factuur gevonden voor deze maand.
            </p>
          </div>
        </div>
      )
    }

    const displayDistribution = isAdmin 
      ? data.distribution 
      : data.distribution.filter(d => d.tenant.id === profile?.tenant_id)

    return (
      <div>
        <button 
          onClick={() => setSelectedMonth(null)} 
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

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
            {MONTHS_NL[data.month]} {data.year}
          </h2>
          <p style={{ color: 'rgba(232, 230, 225, 0.4)', marginTop: 4, fontSize: 13 }}>
            Ref: {data.invoice.invoice_ref}
          </p>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <div className="label">Factuur</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>€{formatNumber(data.invoice.total_amount)}</div>
            </div>
            <div>
              <div className="label">+ 10% marge</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#6B8F4E' }}>
                €{formatNumber(data.amountWithMarge - data.invoice.total_amount)}
              </div>
            </div>
            <div>
              <div className="label">Te verdelen</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#E85D3A' }}>
                €{formatNumber(data.amountWithMarge)}
              </div>
            </div>
            <div>
              <div className="label">Totaal kWh</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#4A7FB5' }}>
                {formatKwh(data.totalConsumption)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
            {isAdmin ? 'Verdeling per huurder' : 'Jouw kosten'}
          </h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Huurder</th>
                  <th style={{ textAlign: 'right' }}>kWh</th>
                  <th style={{ textAlign: 'right' }}>%</th>
                  <th style={{ textAlign: 'right' }}>Bedrag</th>
                </tr>
              </thead>
              <tbody>
                {displayDistribution.map(d => (
                  <tr key={d.tenant.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: d.tenant.color }} />
                        <span style={{ fontSize: 13 }}>{d.tenant.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'", fontSize: 13 }}>
                      {formatKwh(d.totalConsumption)}
                    </td>
                    <td style={{ textAlign: 'right', fontFeatureSettings: "'tnum'", fontSize: 13 }}>
                      {d.percentage.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: d.tenant.color, fontFeatureSettings: "'tnum'" }}>
                      €{formatNumber(d.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {isAdmin && (
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700, paddingTop: 12 }}>Totaal</td>
                    <td style={{ textAlign: 'right', paddingTop: 12, fontFeatureSettings: "'tnum'" }}>
                      {formatKwh(data.totalConsumption)}
                    </td>
                    <td style={{ textAlign: 'right', paddingTop: 12 }}>100%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#E85D3A', paddingTop: 12 }}>
                      €{formatNumber(data.amountWithMarge)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
          {isAdmin ? 'Verdeling' : 'Mijn Kosten'}
        </h2>
        <p style={{ color: 'rgba(232, 230, 225, 0.4)', marginTop: 4, fontSize: 14 }}>
          {isAdmin ? 'Kosten per huurder per maand' : 'Je maandelijkse kosten'}
        </p>
      </div>

      {monthsWithInvoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>
            Nog geen facturen ingevoerd.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {monthsWithInvoices.map(m => {
            const data = calculateDistribution(m.year, m.month)
            if (!data) return null

            const myData = !isAdmin 
              ? data.distribution.find(d => d.tenant.id === profile?.tenant_id)
              : null

            return (
              <div 
                key={m.key} 
                className="card" 
                style={{ padding: '16px', cursor: 'pointer' }}
                onClick={() => setSelectedMonth(m)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, display: 'block' }}>
                      {MONTHS_NL[m.month]} {m.year}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(232,230,225,0.4)' }}>
                      {isAdmin 
                        ? `${formatKwh(data.totalConsumption)} kWh`
                        : myData 
                          ? `${formatKwh(myData.totalConsumption)} kWh (${myData.percentage.toFixed(1)}%)`
                          : 'Geen verbruik'
                      }
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isAdmin ? (
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#E85D3A' }}>
                        €{formatNumber(data.amountWithMarge)}
                      </span>
                    ) : myData ? (
                      <span style={{ fontSize: 16, fontWeight: 700, color: profile?.tenant?.color }}>
                        €{formatNumber(myData.amount)}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(232,230,225,0.3)' }}>—</span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,230,225,0.3)" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
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
