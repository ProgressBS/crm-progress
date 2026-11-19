import { Suspense } from 'react'
import RegistryView from '@/components/RegistryView'
export default function Page() {
  return <Suspense fallback={<div style={{ color: 'var(--muted)' }}>Загрузка…</div>}><RegistryView /></Suspense>
}
