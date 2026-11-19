'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CrudView from '@/components/CrudView'
import { ENTITIES } from '@/lib/entities'

// Grouped tabs for the consolidated "Реестры" section.
const GROUPS = [
  { label: 'Клиенты и продажи', tabs: ['clients', 'contracts', 'payments', 'kps', 'tenders'] },
  { label: 'Обучение', tabs: ['courses', 'certificates', 'listeners', 'teachers'] },
  { label: 'Прочее', tabs: ['candidates', 'letters'] },
]
const ALL = GROUPS.flatMap(g => g.tabs)

export default function RegistryView() {
  const params = useSearchParams()
  const initial = ALL.includes(params.get('t')) ? params.get('t') : 'clients'
  const [tab, setTab] = useState(initial)

  return (
    <div>
      <h1 className="page-h">Реестры</h1>
      <div className="page-sub">Все справочники и документы в одном месте — выберите вкладку</div>
      <div className="reg-tabs">
        {GROUPS.map(g => (
          <div key={g.label} className="reg-group">
            <span className="reg-group-lab">{g.label}</span>
            {g.tabs.map(k => (
              <button key={k} className={'reg-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
                {ENTITIES[k]?.title || k}
              </button>
            ))}
          </div>
        ))}
      </div>
      <CrudView key={tab} entity={tab} />
    </div>
  )
}
