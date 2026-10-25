import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ResourceState } from "@/components/dashboard/ResourceState";
import TablePageSkeleton from "@/components/loading/TablePageSkeleton";
import RecordTypeTabs from "@/components/records/RecordTypeTabs";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import InstructorPageLayout from "../InstructorPageLayout";
import { paginateRecords } from "../../student/records/pagination";
import RequestFilters from "./RequestFilters";
import RequestsTable from "./RequestsTable";
import RequestPagination from "./RequestPagination";
import RequestDetailDialog from "./RequestDetailDialog";
import { filterRequests, groupRequests, requestStatuses, updateRequestParams } from "./requestData";
import { loadRequests } from "./requestApi";
import { exportRequests } from "./requestCsv";

export default function InstructorRequests() {
  const { user } = useAuth();
  const resource = useApiResource(loadRequests, user?.id || "");
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState("");
  const records = resource.data || [];
  const selected = records.find(record => String(record.id) === params.get("request"));
  const type = ["absence", "late"].includes(params.get("type")) ? params.get("type") : selected?.type === "late" ? "late" : "absence";
  const subject = params.get("subject") || "";
  const status = requestStatuses.includes(params.get("status")) ? params.get("status") : "";
  const classes = groupRequests(records);
  const filtered = filterRequests(records, { type, subject, status, search });
  const pagination = paginateRecords(filtered, page);
  const groups = groupRequests(pagination.pageRecords);
  function change(changes) { setPage(1); setParams(current => updateRequestParams(current, changes)); }
  function download() { setExportError(""); try { exportRequests(filtered); } catch { setExportError("The CSV could not be exported. Please try again."); } }
  return <InstructorPageLayout title="Request">
    <section aria-label="Class requests" className="grid min-w-0 gap-5">
      {resource.loading ? <TablePageSkeleton layout="requests" label="Loading class requests..." /> : <>
      <h1 className="break-words text-2xl font-bold text-slate-950">{subject ? classes.find(course => course.id === subject)?.course?.subject_name || "Class Requests" : "Class Requests"}</h1>
      {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}
      <RecordTypeTabs value={type} onValueChange={value => change({ type: value })}>
        <div className="grid min-w-0 gap-5">
        <RequestFilters search={search} subject={subject} status={status} classes={classes} onSearch={value => { setSearch(value); setPage(1); }} onChange={change} onExport={download} disabled={resource.loading || Boolean(resource.error)} exportDisabled={resource.loading || Boolean(resource.error) || !filtered.length} />
        <ResourceState error={resource.error} onRetry={resource.reload}>
          <div className="grid min-w-0 gap-5">
            {groups.length ? groups.map(group => <section key={group.id} aria-label={group.label} className="grid min-w-0 gap-3">
              <h2 className="break-words text-base font-semibold text-[#203B82]">{group.label}</h2>
              <RequestsTable records={group.records} caption={group.label} onReview={record => change({ request: String(record.id), type: record.type })} />
            </section>) : <RequestsTable records={[]} onReview={() => {}} />}
            <RequestPagination pagination={pagination} total={filtered.length} onPage={setPage} />
          </div>
        </ResourceState>
        </div>
      </RecordTypeTabs>
      {params.get("request") && !selected && !resource.loading && !resource.error && <p role="alert" className="text-sm text-slate-500">This request is unavailable. <button type="button" className="underline" onClick={() => change({ request: "" })}>Dismiss</button></p>}
      </>}
    </section>
    {selected && <RequestDetailDialog key={selected.id} request={selected} onClose={() => setParams(current => updateRequestParams(current, { request: "" }))} onReload={resource.reload} />}
  </InstructorPageLayout>;
}
