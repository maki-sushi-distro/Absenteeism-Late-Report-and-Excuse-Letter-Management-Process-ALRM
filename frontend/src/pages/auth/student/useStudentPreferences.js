import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

const defaults = { requestUpdates: true, thresholdAlerts: true };
const changedEvent = "alrm:student-preferences";

function subscribe(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changedEvent, onChange);
  };
}

export default function useStudentPreferences(userId) {
  const key = `alrm:student-preferences:${userId}`;
  const [error, setError] = useState("");
  const getSnapshot = useCallback(() => {
    try { return userId ? window.localStorage.getItem(key) : null; }
    catch { return null; }
  }, [key, userId]);
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const preferences = useMemo(() => {
    try {
      const value = JSON.parse(stored);
      return Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => [name, typeof value?.[name] === "boolean" ? value[name] : fallback]));
    } catch { return defaults; }
  }, [stored]);

  function updatePreference(name, checked) {
    if (!userId || !(name in defaults)) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({ ...preferences, [name]: checked }));
      window.dispatchEvent(new Event(changedEvent));
      setError("");
    } catch { setError("Your browser could not save this preference. Please enable site storage and try again."); }
  }

  return { preferences, updatePreference, error };
}
