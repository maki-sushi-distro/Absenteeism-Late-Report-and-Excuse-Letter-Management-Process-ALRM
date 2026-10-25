import { useEffect, useRef, useState } from "react";
import { followUpStudentRequest } from "@/api/studentRequests";

export default function useRequestFollowUp() {
  const [followingUpId, setFollowingUpId] = useState(null);
  const [notice, setNotice] = useState(null);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function followUp(record) {
    if (record?.status !== "pending" || !record.id || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setFollowingUpId(record.id);
    setNotice(null);
    try {
      const body = await followUpStudentRequest(record.id, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setNotice({ type: "success", message: typeof body.message === "string" ? body.message : "Follow-up sent to your instructor." });
      }
    } catch (issue) {
      if (!controller.signal.aborted) setNotice({ type: "error", message: issue.message || "Unable to send your follow-up." });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setFollowingUpId(null);
    }
  }

  return { followingUpId, notice, followUp, dismissNotice: () => setNotice(null) };
}
