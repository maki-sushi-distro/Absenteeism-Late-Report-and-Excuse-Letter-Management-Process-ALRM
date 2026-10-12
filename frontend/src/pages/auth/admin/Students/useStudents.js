import { useEffect, useMemo, useState } from "react";
import { getAdminPrograms } from "@/api/adminUsers";
import { getAdminStudents } from "@/api/adminStudents";
import { programLabel, programRecordId } from "./studentDisplay";

const emptyFilters = { search: "", programId: "", yearLevel: "" };

export function useStudents() {
  const [filters, setFilters] = useState(emptyFilters);
  const [programs, setPrograms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadPrograms() {
      try {
        const data = await getAdminPrograms();
        if (alive) setPrograms(data);
      } catch (loadError) {
        if (alive) setError(loadError?.message || "Unable to load programs.");
      } finally {
        if (alive) setLoadingPrograms(false);
      }
    }
    loadPrograms();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadStudents() {
      setLoadingStudents(true);
      setError("");
      try {
        const data = await getAdminStudents(filters);
        if (alive) setStudents(data);
      } catch (loadError) {
        if (alive) {
          setStudents([]);
          setError(loadError?.message || "Unable to load students from the admin student endpoint.");
        }
      } finally {
        if (alive) setLoadingStudents(false);
      }
    }
    loadStudents();
    return () => { alive = false; };
  }, [filters]);

  const activeProgramName = useMemo(() => {
    if (!filters.programId) return "";
    const program = programs.find((item) => String(programRecordId(item)) === String(filters.programId));
    return program ? programLabel(program) : "";
  }, [filters.programId, programs]);

  function changeFilter(name, value) { setFilters((current) => ({ ...current, [name]: value })); }
  function clearFilters() { setFilters(emptyFilters); }

  return { filters, programs, students, loadingPrograms, loadingStudents,
    error, activeProgramName, changeFilter, clearFilters };
}
