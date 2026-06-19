import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppData,
  Exercise,
  LoggedExercise,
  RepRange,
  Routine,
  Session,
  SetEntry,
} from './types';
import { SEED } from './seed';

const STORAGE_KEY = 'lifts.data.v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function load(): AppData {
  const fresh: AppData = {
    exercises: SEED.exercises,
    routines: SEED.routines,
    sessions: [],
    activeSession: null,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const stored = JSON.parse(raw) as Partial<AppData>;
    // Always refresh the routine definitions from the seed (program structure),
    // while preserving the user's logged sessions and any custom exercises.
    const exercises: Exercise[] = [...SEED.exercises];
    for (const ex of stored.exercises ?? []) {
      if (!exercises.some((e) => e.id === ex.id)) exercises.push(ex);
    }
    return {
      exercises,
      routines: SEED.routines,
      sessions: stored.sessions ?? [],
      activeSession: stored.activeSession ?? null,
    };
  } catch {
    return fresh;
  }
}

interface Store {
  data: AppData;
  exerciseName: (id: string) => string;
  startSession: (routine: Routine, repRange?: RepRange) => void;
  cancelSession: () => void;
  finishSession: () => void;
  updateActive: (fn: (s: Session) => Session) => void;
  addExerciseToActive: (exerciseId: string) => void;
  deleteSession: (id: string) => void;
  upsertExercise: (name: string, id?: string) => Exercise;
  resetAll: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Ask the browser to keep this data and not auto-evict it under storage pressure.
  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persisted().then((already) => {
        if (!already) navigator.storage.persist().catch(() => {});
      });
    }
  }, []);

  const store = useMemo<Store>(() => {
    const exerciseName = (id: string) =>
      data.exercises.find((e) => e.id === id)?.name ?? id;

    function blankSets(count: number): SetEntry[] {
      return Array.from({ length: count }, () => ({ weight: 0, reps: 0, done: false }));
    }

    return {
      data,
      exerciseName,

      startSession(routine, repRange) {
        const exercises: LoggedExercise[] = routine.exercises.map((re) => ({
          exerciseId: re.exerciseId,
          sets: blankSets(re.targetSets),
        }));
        const session: Session = {
          id: uid(),
          routineId: routine.id,
          name: routine.name,
          date: new Date().toISOString(),
          repRange,
          exercises,
        };
        setData((d) => ({ ...d, activeSession: session }));
      },

      cancelSession() {
        setData((d) => ({ ...d, activeSession: null }));
      },

      finishSession() {
        setData((d) => {
          if (!d.activeSession) return d;
          // keep only exercises that have at least one completed set
          const cleaned: Session = {
            ...d.activeSession,
            date: new Date().toISOString(),
            exercises: d.activeSession.exercises
              .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
              .filter((e) => e.sets.length > 0),
          };
          if (cleaned.exercises.length === 0) {
            return { ...d, activeSession: null };
          }
          return { ...d, sessions: [cleaned, ...d.sessions], activeSession: null };
        });
      },

      updateActive(fn) {
        setData((d) => (d.activeSession ? { ...d, activeSession: fn(d.activeSession) } : d));
      },

      addExerciseToActive(exerciseId) {
        setData((d) => {
          if (!d.activeSession) return d;
          const logged: LoggedExercise = {
            exerciseId,
            sets: blankSets(3),
          };
          return {
            ...d,
            activeSession: {
              ...d.activeSession,
              exercises: [...d.activeSession.exercises, logged],
            },
          };
        });
      },

      deleteSession(id) {
        setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
      },

      upsertExercise(name, id) {
        const exId = id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const ex: Exercise = { id: exId, name };
        setData((d) => {
          if (d.exercises.some((e) => e.id === exId)) {
            return { ...d, exercises: d.exercises.map((e) => (e.id === exId ? ex : e)) };
          }
          return { ...d, exercises: [...d.exercises, ex] };
        });
        return ex;
      },

      resetAll() {
        setData({
          exercises: SEED.exercises,
          routines: SEED.routines,
          sessions: [],
          activeSession: null,
        });
      },

      exportData() {
        return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
      },

      importData(json) {
        try {
          const parsed = JSON.parse(json);
          const incoming: AppData = parsed?.data ?? parsed;
          if (!incoming || !Array.isArray(incoming.sessions) || !Array.isArray(incoming.exercises)) {
            return false;
          }
          setData({
            exercises: incoming.exercises,
            routines: Array.isArray(incoming.routines) ? incoming.routines : SEED.routines,
            sessions: incoming.sessions,
            activeSession: null,
          });
          return true;
        } catch {
          return false;
        }
      },
    };
  }, [data]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
