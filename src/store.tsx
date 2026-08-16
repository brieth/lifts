import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppData,
  Emphasis,
  Exercise,
  LoggedExercise,
  Routine,
  Session,
  SetEntry,
  Station,
} from './types';
import { AB_OPTION_IDS, LEG_OPTION_IDS, SEED } from './seed';
import { normalizeSessions } from './lib/stations';

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
    stations: [],
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
    // Anything logged before stations existed carries no station, which means
    // its weights are taken as already normalized. Nothing to migrate.
    const sessions = stored.sessions ?? [];
    // Refresh menu slot options in an in-progress workout to the current lists,
    // keyed by menu type, and append the ab menu if the session predates it.
    let activeSession = stored.activeSession ?? null;
    if (activeSession) {
      const isAbSlot = (e: LoggedExercise) =>
        !!e.options && e.options.some((id) => AB_OPTION_IDS.includes(id));
      const exercises = activeSession.exercises.map((e) =>
        e.options ? { ...e, options: isAbSlot(e) ? AB_OPTION_IDS : LEG_OPTION_IDS } : e,
      );
      if (!exercises.some(isAbSlot)) {
        exercises.push({
          exerciseId: '',
          options: AB_OPTION_IDS,
          sets: [
            { weight: 0, reps: 0, done: false },
            { weight: 0, reps: 0, done: false },
            { weight: 0, reps: 0, done: false },
          ],
        });
      }
      activeSession = { ...activeSession, exercises };
    }
    return {
      exercises,
      routines: SEED.routines,
      sessions,
      activeSession,
      stations: stored.stations ?? [],
    };
  } catch {
    return fresh;
  }
}

interface Store {
  data: AppData;
  /**
   * The same sessions with every weight converted to real force via each
   * exercise's station calibration. All analytics read this so numbers from
   * different machines are comparable; display and editing use data.sessions.
   */
  forceSessions: Session[];
  exerciseName: (id: string) => string;
  startSession: (routine: Routine, emphasis?: Emphasis) => void;
  cancelSession: () => void;
  finishSession: () => void;
  updateActive: (fn: (s: Session) => Session) => void;
  addExerciseToActive: (exerciseId: string) => void;
  deleteSession: (id: string) => void;
  updateSessionExercise: (sessionId: string, exIdx: number, exerciseId: string) => void;
  updateSessionDate: (sessionId: string, dateISO: string) => void;
  updateSessionSet: (
    sessionId: string,
    exIdx: number,
    setIdx: number,
    patch: Partial<SetEntry>,
  ) => void;
  deleteSessionSet: (sessionId: string, exIdx: number, setIdx: number) => void;
  upsertExercise: (name: string, id?: string) => Exercise;
  /** Sets which machine an exercise in the active session was performed on. */
  setActiveStation: (exIdx: number, stationId: string | undefined) => void;
  addStation: (station: Omit<Station, 'id'>) => Station;
  updateStation: (id: string, patch: Partial<Omit<Station, 'id'>>) => void;
  deleteStation: (id: string) => void;
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

  // Weights converted to real force via each exercise's station calibration.
  const forceSessions = useMemo(
    () => normalizeSessions(data.sessions, data.stations),
    [data.sessions, data.stations],
  );

  const store = useMemo<Store>(() => {
    const exerciseName = (id: string) =>
      data.exercises.find((e) => e.id === id)?.name ?? id;

    function blankSets(count: number): SetEntry[] {
      return Array.from({ length: count }, () => ({ weight: 0, reps: 0, done: false }));
    }

    return {
      data,
      forceSessions,
      exerciseName,

      startSession(routine, emphasis) {
        setData((d) => {
          // Default each slot to whichever station it was last performed on, so
          // the common case (same machine every time) needs no interaction.
          const lastStation = (exerciseId: string): string | undefined => {
            for (const s of d.sessions) {
              const hit = s.exercises.find((e) => e.exerciseId === exerciseId);
              if (hit) return hit.stationId;
            }
            return undefined;
          };
          const exercises: LoggedExercise[] = routine.exercises.map((re) => ({
            // Menu slots (e.g. the leg slot) start with no selection — pick each time.
            exerciseId: re.options ? '' : re.exerciseId,
            options: re.options,
            stationId: re.options ? undefined : lastStation(re.exerciseId),
            sets: blankSets(re.targetSets),
          }));
          return {
            ...d,
            activeSession: {
              id: uid(),
              routineId: routine.id,
              name: routine.name,
              date: new Date().toISOString(),
              emphasis,
              exercises,
            },
          };
        });
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

      updateSessionExercise(sessionId, exIdx, exerciseId) {
        setData((d) => ({
          ...d,
          sessions: d.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  exercises: s.exercises.map((e, i) =>
                    i === exIdx ? { ...e, exerciseId } : e,
                  ),
                }
              : s,
          ),
        }));
      },

      updateSessionDate(sessionId, dateISO) {
        setData((d) => ({
          ...d,
          sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, date: dateISO } : s)),
        }));
      },

      updateSessionSet(sessionId, exIdx, setIdx, patch) {
        setData((d) => ({
          ...d,
          sessions: d.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  exercises: s.exercises.map((e, i) =>
                    i === exIdx
                      ? { ...e, sets: e.sets.map((st, j) => (j === setIdx ? { ...st, ...patch } : st)) }
                      : e,
                  ),
                }
              : s,
          ),
        }));
      },

      deleteSessionSet(sessionId, exIdx, setIdx) {
        setData((d) => {
          const sessions = d.sessions
            .map((s) => {
              if (s.id !== sessionId) return s;
              const exercises = s.exercises
                .map((e, i) =>
                  i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e,
                )
                // an exercise with no sets left is removed entirely
                .filter((e) => e.sets.length > 0);
              return { ...s, exercises };
            })
            // a session with no exercises left is removed entirely
            .filter((s) => s.exercises.length > 0);
          return { ...d, sessions };
        });
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

      setActiveStation(exIdx, stationId) {
        setData((d) =>
          d.activeSession
            ? {
                ...d,
                activeSession: {
                  ...d.activeSession,
                  exercises: d.activeSession.exercises.map((e, i) =>
                    i === exIdx ? { ...e, stationId } : e,
                  ),
                },
              }
            : d,
        );
      },

      addStation(station) {
        const s: Station = { ...station, id: uid(), name: station.name.trim() || 'Station' };
        setData((d) => ({ ...d, stations: [...d.stations, s] }));
        return s;
      },

      updateStation(id, patch) {
        setData((d) => ({
          ...d,
          stations: d.stations.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
      },

      deleteStation(id) {
        setData((d) => {
          // Sets logged there fall back to being treated as already normalized.
          const strip = (s: Session) => ({
            ...s,
            exercises: s.exercises.map((e) =>
              e.stationId === id ? { ...e, stationId: undefined } : e,
            ),
          });
          return {
            ...d,
            stations: d.stations.filter((s) => s.id !== id),
            sessions: d.sessions.map(strip),
            activeSession: d.activeSession ? strip(d.activeSession) : null,
          };
        });
      },

      resetAll() {
        setData({
          exercises: SEED.exercises,
          routines: SEED.routines,
          sessions: [],
          activeSession: null,
          stations: [],
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
            stations: incoming.stations ?? [],
          });
          return true;
        } catch {
          return false;
        }
      },
    };
  }, [data, forceSessions]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
