'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'

const supabase = createClient()

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email || null)
    })
  }, [])

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>JOANResearchOS</h1>
      <p>Logged in as: {userEmail}</p>
      <p>App is loading correctly ✓</p>
    </main>
  )
}
