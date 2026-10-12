import { useEffect, useState } from "react";

export function useApiResource(load, key = "") {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    load(key).then(
      (data) => active && setState({ data, error: "", loading: false }),
      (error) => active && setState({ data: null, error: error.message, loading: false }),
    );
    return () => { active = false; };
  }, [load, key, revision]);

  function reload() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setRevision((current) => current + 1);
  }

  return { ...state, reload };
}
