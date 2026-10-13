import { useEffect, useState } from "react";
import { getFlaggedStudents, getProgramHeadDashboard, getProgramHeadRequests } from "@/api/programHead";

const endpoints = [getProgramHeadDashboard, getFlaggedStudents, getProgramHeadRequests];
const keys = ["dashboard", "flags", "requests"];

export function useProgramHeadRecords() {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ dashboard: null, flags: [], requests: [], errors: {}, loading: true });

  useEffect(() => {
    let current = true;
    Promise.allSettled(endpoints.map((fetchData) => fetchData())).then((results) => {
      if (!current) return;
      const next = { dashboard: null, flags: [], requests: [], errors: {}, loading: false };
      results.forEach((result, index) => {
        if (result.status === "fulfilled") next[keys[index]] = result.value || (index ? [] : null);
        else next.errors[keys[index]] = result.reason?.message || "Could not load program data.";
      });
      setState(next);
    });
    return () => { current = false; };
  }, [version]);

  return { ...state, refresh: () => { setState((previous) => ({ ...previous, loading: true })); setVersion((value) => value + 1); } };
}
