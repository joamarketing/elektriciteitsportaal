'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

export default function VerdelingLayout({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, tenant:tenants(*)')
        .eq('id', user.id)
        .single()

      setUser(user)
      setProfile(profile)
      setLoading(false)
    }

    checkUser()
  }, [router, supabase])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        color: 'rgba(232, 230, 225, 0.5)'
      }}>
        Laden...
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <NavBar user={user} profile={profile} />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        {children}
      </div>
    </div>
  )
}
