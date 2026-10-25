import { useEffect, useRef, useState } from "react";
import { getFlaggedStudents, getProgramHeadDashboard, getProgramHeadRequests } from "@/api/programHead";

const endpoints = [getProgramHeadDashboard, getFlaggedStudents, getProgramHeadRequests];
const keys = ["dashboard", "flags", "requests"];

export function useProgramHeadRecords() {
  const [version, setVersion] = useState(0);
  const generation = useRef(0);
  const [state, setState] = useState({
    dashboard: null, flags: [], requests: [], errors: {},
    resourceLoading: { dashboard: true, flags: true, requests: true },
    ready: { dashboard: false, flags: false, requests: false },
  });

  useEffect(() => {
    let current = true;
    const request = ++generation.current;
    endpoints.forEach((fetchData, index) => {
      const key = keys[index];
      Promise.resolve().then(fetchData).then((data) => {
        if (!current || request !== generation.current) return;
        const valid = index ? Array.isArray(data) : data && typeof data === "object" && !Array.isArray(data);
        if (!valid) throw new Error("Unexpected program data response.");
        setState((previous) => ({
          ...previous, [key]: data,
          ready: { ...previous.ready, [key]: true },
          resourceLoading: { ...previous.resourceLoading, [key]: false },
          errors: { ...previous.errors, [key]: "" },
        }));
      }).catch((error) => {
        if (!current || request !== generation.current) return;
        setState((previous) => ({
          ...previous,
          resourceLoading: { ...previous.resourceLoading, [key]: false },
          errors: { ...previous.errors, [key]: error?.message || "Could not load program data." },
        }));
      });
    });
    return () => { current = false; };
  }, [version]);

  return {
    ...state,
    loading: Object.values(state.resourceLoading).some(Boolean),
    refresh: () => {
      generation.current++;
      setState((previous) => ({ ...previous, errors: {}, resourceLoading: { dashboard: true, flags: true, requests: true } }));
      setVersion((value) => value + 1);
    },
  };
}
