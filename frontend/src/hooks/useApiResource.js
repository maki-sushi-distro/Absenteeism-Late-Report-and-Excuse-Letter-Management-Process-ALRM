import { useEffect, useState } from "react";

export function initialApiResourceState(enabled, initialData) {
  return { data: initialData ?? null, error: "", loading: enabled };
}

export function useApiResource(load, key = "", { enabled = true, initialData = null } = {}) {
  const [state, setState] = useState(() => initialApiResourceState(enabled, initialData));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    queueMicrotask(() => active && setState((current) => ({ ...current, error: "", loading: true })));
    load(key).then(
      (data) => active && setState({ data, error: "", loading: false }),
      (error) => active && setState({ data: null, error: error.message, loading: false }),
    );
    return () => { active = false; };
  }, [enabled, load, key, revision]);

  function reload() {
    setState((current) => ({ ...current, loading: enabled, error: "" }));
    setRevision((current) => current + 1);
  }

  return { ...state, reload };
}
