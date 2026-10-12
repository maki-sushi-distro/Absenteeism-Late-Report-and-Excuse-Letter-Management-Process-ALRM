import { useEffect, useMemo, useState } from "react";
import { getAdminStudent } from "@/api/adminStudents";
import { normalizeStatus, requestClass, requestDate, requestReason,
  requestStatus, statusLabel, studentRequests } from "./profileDisplay";

export function useStudentProfile(studentId) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let alive = true;
    async function loadStudent() {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminStudent(studentId);
        if (alive) setStudent(data);
      } catch (loadError) {
        if (alive) {
          setStudent(null);
          setError(loadError?.message || "Unable to load this student profile.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadStudent();
    return () => { alive = false; };
  }, [studentId]);

  const filteredRequests = useMemo(() => {
    const search = requestSearch.trim().toLowerCase();
    return studentRequests(student).filter((request) => {
      const matchesStatus = statusFilter === "all" || normalizeStatus(requestStatus(request)) === statusFilter;
      const haystack = [requestClass(request), requestReason(request), statusLabel(requestStatus(request)),
        request.type, request.request_type, requestDate(request)].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!search || haystack.includes(search));
    });
  }, [requestSearch, statusFilter, student]);

  const hasRequestData = Boolean(student && ["requests", "excuse_requests", "excuseRequests",
    "absence_late_requests", "enrollments"].some((key) => Array.isArray(student[key])));

  return { student, loading, error, requestSearch, setRequestSearch, statusFilter,
    setStatusFilter, filteredRequests, hasRequestData };
}
