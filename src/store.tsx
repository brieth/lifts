import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppData,
  Emphasis,
  Exercise,
  Gym,
  LoggedExercise,
  Routine,
  Session,
  SetEntry,
} from './types';
import { SEED } from './seed';

const STORAGE_KEY = 'lifts.data.v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const DEFAULT_GYM: Gym = { id: 'gym-default', name: 'My Gym' };

function load(): AppData {
  const fresh: AppData = {
    exercises: SEED.exercises,
    routines: SEED.routines,
    sessions: [],
    activeSession: null,
    gyms: [DEFAULT_GYM],
    currentGymId: DEFAULT_GYM.id,
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
    const gyms = stored.gyms?.length ? stored.gyms : [DEFAULT_GYM];
    const currentGymId = stored.currentGymId ?? gyms[0].id;
    // Backfill a gym on any pre-existing sessions so gym-dependent history works.
    const sessions = (stored.sessions ?? []).map((s) =>
      s.gymId ? s : { ...s, gymId: currentGymId },
    );
    return {
      exercises,
      routines: SEED.routines,
      sessions,
      activeSession: stored.activeSession ?? null,
      gyms,
      currentGymId,
    };
  } catch {
    return fresh;
  }
}

interface Store {
  data: AppData;
  exerciseName: (id: string) => string;
  startSession: (routine: Routine, emphasis?: Emphasis) => void;
  cancelSession: () => void;
  finishSession: () => void;
  updateActive: (fn: (s: Session) => Session) => void;
  addExerciseToActive: (exerciseId: string) => void;
  deleteSession: (id: string) => void;
  upsertExercise: (name: string, id?: string) => Exercise;
  addGym: (name: string) => Gym;
  setCurrentGym: (id: string) => void;
  renameGym: (id: string, name: string) => void;
  deleteGym: (id: string) => void;
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

      startSession(routine, emphasis) {
        const exercises: LoggedExercise[] = routine.exercises.map((re) => ({
          // Menu slots (e.g. the leg slot) start with no selection — pick each time.
          exerciseId: re.options ? '' : re.exerciseId,
          options: re.options,
          sets: blankSets(re.targetSets),
        }));
        setData((d) => ({
          ...d,
          activeSession: {
            id: uid(),
            routineId: routine.id,
            name: routine.name,
            date: new Date().toISOString(),
            emphasis,
            gymId: d.currentGymId ?? undefined,
            exercises,
          },
        }));
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
              .filter((e) => e.exerciseId && e.sets.length > 0),
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

      addGym(name) {
        const gym: Gym = { id: uid(), name: name.trim() || 'Gym' };
        setData((d) => ({ ...d, gyms: [...d.gyms, gym], currentGymId: gym.id }));
        return gym;
      },

      setCurrentGym(id) {
        setData((d) => ({ ...d, currentGymId: id }));
      },

      renameGym(id, name) {
        setData((d) => ({
          ...d,
          gyms: d.gyms.map((g) => (g.id === id ? { ...g, name: name.trim() || g.name } : g)),
        }));
      },

      deleteGym(id) {
        setData((d) => {
          if (d.gyms.length <= 1) return d; // keep at least one gym
          const gyms = d.gyms.filter((g) => g.id !== id);
          const currentGymId = d.currentGymId === id ? gyms[0].id : d.currentGymId;
          return { ...d, gyms, currentGymId };
        });
      },

      resetAll() {
        setData({
          exercises: SEED.exercises,
          routines: SEED.routines,
          sessions: [],
          activeSession: null,
          gyms: [DEFAULT_GYM],
          currentGymId: DEFAULT_GYM.id,
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
          const gyms = incoming.gyms?.length ? incoming.gyms : [DEFAULT_GYM];
          setData({
            exercises: incoming.exercises,
            routines: Array.isArray(incoming.routines) ? incoming.routines : SEED.routines,
            sessions: incoming.sessions,
            activeSession: null,
            gyms,
            currentGymId: incoming.currentGymId ?? gyms[0].id,
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
