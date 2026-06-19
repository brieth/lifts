import { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { WorkoutView } from './components/WorkoutView';
import { HistoryView } from './components/HistoryView';
import { ProgressView } from './components/ProgressView';
import { RoutinesView } from './components/RoutinesView';

type Tab = 'workout' | 'history' | 'progress' | 'routine';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'history', label: 'History', icon: '📅' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'routine', label: 'Routine', icon: '📋' },
];

function Shell() {
  const [tab, setTab] = useState<Tab>('workout');
  const { data } = useStore();
  const active = !!data.activeSession;

  return (
    <div className="app">
      <main className="content">
        {tab === 'workout' && <WorkoutView />}
        {tab === 'history' && <HistoryView />}
        {tab === 'progress' && <ProgressView />}
        {tab === 'routine' && <RoutinesView />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
            {t.id === 'workout' && active && <span className="tab-dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
