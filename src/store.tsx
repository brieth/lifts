import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, Exercise, LoggedExercise, Routine, Session, SetEntry } from './types';
import { SEED } from './seed';

const STORAGE_KEY = 'lifts.data.v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {
    /* ignore corrupt storage */
  }
  return {
    exercises: SEED.exercises,
    routines: SEED.routines,
    sessions: [],
    activeSession: null,
  };
}

interface Store {
  data: AppData;
  exerciseName: (id: string) => string;
  startSession: (routine: Routine) => void;
  startEmptySession: () => void;
  cancelSession: () => void;
  finishSession: () => void;
  updateActive: (fn: (s: Session) => Session) => void;
  addExerciseToActive: (exerciseId: string) => void;
  deleteSession: (id: string) => void;
  upsertExercise: (name: string, id?: string) => Exercise;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const store = useMemo<Store>(() => {
    const exerciseName = (id: string) =>
      data.exercises.find((e) => e.id === id)?.name ?? id;

    function blankSets(count: number): SetEntry[] {
      return Array.from({ length: count }, () => ({ weight: 0, reps: 0, done: false }));
    }

    return {
      data,
      exerciseName,

      startSession(routine) {
        const exercises: LoggedExercise[] = routine.exercises.map((re) => ({
          exerciseId: re.exerciseId,
          superset: re.superset,
          sets: blankSets(re.targetSets),
        }));
        const session: Session = {
          id: uid(),
          routineId: routine.id,
          name: routine.name,
          date: new Date().toISOString(),
          exercises,
        };
        setData((d) => ({ ...d, activeSession: session }));
      },

      startEmptySession() {
        const session: Session = {
          id: uid(),
          name: 'Freestyle',
          date: new Date().toISOString(),
          exercises: [],
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
    };
  }, [data]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
