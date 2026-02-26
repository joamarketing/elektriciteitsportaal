'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { formatNumber, MONTHS_NL, MARGE_PERCENTAGE, withMarge } from '../../lib/utils'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [formYear, setFormYear] = useState(new Date().getFullYear())
  const [formMonth, setFormMonth] = useState(new Date().getMonth())
  const [formAmount, setFormAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    setInvoices(invoicesData || [])
    setLoading(false)
  }

  const openNew = () => {
    setEditingInvoice(null)
    setFormYear(new Date().getFullYear())
    setFormMonth(new Date().getMonth())
    setFormAmount('')
    setShowForm(true)
  }

  const openEdit = (invoice) => {
    setEditingInvoice(invoice)
    setFormYear(invoice.year)
    setFormMonth(invoice.month)
    setFormAmount(invoice.total_amount?.toString() || '')
    setShowForm(true)
  }

  const saveInvoice = async () => {
    setSaving(true)

    const amount = parseFloat(formAmount) || 0
    const amountWithMarge = withMarge(amount)
    const invoiceRef = `${formYear}${String(formMonth + 1).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    if (editingInvoice) {
      await supabase
        .from('invoices')
        .update({
          year: formYear,
          month: formMonth,
          total_amount: amount,
          amount_with_marge: amountWithMarge,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInvoice.id)
    } else {
      await supabase
        .from('invoices')
        .insert({
          year: formYear,
          month: formMonth,
          invoice_ref: invoiceRef,
          total_amount: amount,
          amount_with_marge: amountWithMarge,
          status: 'final'
        })
    }

    setSaving(false)
    setShowForm(false)
    loadData()
  }

  const deleteInvoice = async (invoice) => {
    if (!confirm(`Weet je zeker dat je de factuur van ${MONTHS_NL[invoice.month]} ${invoice.year} wilt verwijderen?`)) {
      return
    }

    await supabase.from('invoices').delete().eq('id', invoice.id)
    loadData()
  }

  if (loading) {
    return <div style={{ color: 'rgba(232, 230, 225, 0.5)' }}>Laden...</div>
  }

  if (showForm) {
    const amount = parseFloat(formAmount) || 0
    const amountWithMarge = withMarge(amount)
    const margeAmount = amountWithMarge - amount

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
          {editingInvoice ? 'Factuur bewerken' : 'Nieuwe factuur'}
        </h2>

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Jaar</label>
              <select 
                className="input" 
                value={formYear} 
                onChange={e => setFormYear(parseInt(e.target.value))}
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
                onChange={e => setFormMonth(parseInt(e.target.value))}
              >
                {MONTHS_NL.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Totaalbedrag factuur (€)</label>
            <input
              type="number"
              className="input"
              placeholder="0.00"
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              step="0.01"
              style={{ fontSize: 18 }}
            />
          </div>

          {amount > 0 && (
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'rgba(232, 230, 225, 0.5)' }}>Factuurbedrag</span>
                <span>€{formatNumber(amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'rgba(232, 230, 225, 0.5)' }}>Marge (10%)</span>
                <span style={{ color: '#6B8F4E' }}>+ €{formatNumber(margeAmount)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: 12, 
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: 16,
                fontWeight: 700
              }}>
                <span>Te verdelen</span>
                <span style={{ color: '#E85D3A' }}>€{formatNumber(amountWithMarge)}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <button 
            className="btn btn-primary" 
            onClick={saveInvoice}
            disabled={saving || !formAmount}
          >
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
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Facturen</h2>
        <p style={{ color: 'rgba(232, 230, 225, 0.4)', marginTop: 4, fontSize: 14 }}>
          Beheer facturen van Luminus
        </p>
      </div>

      <button className="btn btn-primary" onClick={openNew} style={{ marginBottom: 24 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nieuwe factuur
      </button>

      {invoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'rgba(232, 230, 225, 0.4)' }}>
            Nog geen facturen ingevoerd.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {invoices.map(invoice => (
            <div 
              key={invoice.id} 
              className="card" 
              style={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, display: 'block' }}>
                    {MONTHS_NL[invoice.month]} {invoice.year}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(232,230,225,0.4)' }}>
                    Ref: {invoice.invoice_ref}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'rgba(232,230,225,0.4)' }}>
                    €{formatNumber(invoice.total_amount)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#E85D3A' }}>
                    €{formatNumber(invoice.amount_with_marge || withMarge(invoice.total_amount))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '8px 12px', fontSize: 13, flex: 1 }}
                  onClick={() => openEdit(invoice)}
                >
                  Bewerk
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '8px 12px', fontSize: 13, flex: 1 }}
                  onClick={() => deleteInvoice(invoice)}
                >
                  Wis
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
