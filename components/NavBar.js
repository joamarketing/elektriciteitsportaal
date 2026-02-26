'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

const adminNav = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { id: 'readings', label: 'Meterstanden', href: '/readings', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2' },
  { id: 'invoices', label: 'Facturen', href: '/invoices', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { id: 'verdeling', label: 'Verdeling', href: '/verdeling', icon: 'M18 20V10M12 20V4M6 20v-6' },
]

const tenantNav = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
]

export default function NavBar({ user, profile }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const isAdmin = profile?.role === 'admin'
  const navItems = isAdmin ? adminNav : tenantNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleNavClick = (href) => {
    setMenuOpen(false)
    router.push(href)
  }

  return (
    <>
      <nav style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(12, 15, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="container" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          height: 64 
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #E85D3A, #D4A843)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="hide-mobile" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Energieportaal</span>
          </div>

          {/* Desktop navigation */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {navItems.map(item => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'rgba(232, 93, 58, 0.15)' : 'transparent',
                    color: isActive ? '#E85D3A' : 'rgba(232, 230, 225, 0.5)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#E85D3A' : 'rgba(232, 230, 225, 0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Desktop user info */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232, 230, 225, 0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                </svg>
              </div>
              <span style={{ fontSize: 13, color: 'rgba(232, 230, 225, 0.6)' }}>
                {profile?.display_name || user?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(232, 230, 225, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Afmelden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>

          {/* Mobile hamburger button */}
          <button
            className="hide-desktop"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="hide-desktop"
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(12, 15, 20, 0.98)',
            backdropFilter: 'blur(20px)',
            zIndex: 99,
            padding: 16,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Mobile navigation links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map(item => {
              const isActive = pathname === item.href
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.href)}
                  style={{
                    padding: '16px',
                    fontSize: 16,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'rgba(232, 93, 58, 0.15)' : 'transparent',
                    color: isActive ? '#E85D3A' : 'rgba(232, 230, 225, 0.7)',
                    borderRadius: 12,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#E85D3A' : 'rgba(232, 230, 225, 0.5)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Mobile user info & logout */}
          <div style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
            paddingTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              padding: '8px 0'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(232, 230, 225, 0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {profile?.display_name || 'Gebruiker'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(232, 230, 225, 0.4)' }}>
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '14px 16px',
                background: 'rgba(220, 53, 69, 0.1)',
                border: '1px solid rgba(220, 53, 69, 0.2)',
                borderRadius: 12,
                color: '#ff6b6b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 15,
                fontWeight: 600
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Afmelden
            </button>
          </div>
        </div>
      )}
    </>
  )
}
