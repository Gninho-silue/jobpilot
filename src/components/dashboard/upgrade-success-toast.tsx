'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function UpgradeSuccessToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast.success('Welcome to Pro! Unlimited access unlocked.', {
        duration: 5000,
      })
      const url = new URL(window.location.href)
      url.searchParams.delete('upgraded')
      router.replace(url.pathname + url.search)
    }
  }, [searchParams, router])

  return null
}
