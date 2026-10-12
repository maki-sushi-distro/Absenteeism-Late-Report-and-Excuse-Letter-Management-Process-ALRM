import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { flowSteps, requestTitle } from "./requestConfig";

export function RequestPageCanvas({ children }) {
  return <div className="-mx-5 -my-7 min-h-[calc(100vh-70px)] bg-[#F5F6FA] px-5 py-8 transition-colors dark:bg-slate-950 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">{children}</div>;
}

export function RequestTitle({ children }) {
  return <h1 className="text-[22px] font-black leading-tight tracking-normal text-slate-950 sm:text-2xl">{children}</h1>;
}

export function Eyebrow({ step, requestType }) {
  return <p className="text-xs font-bold text-[#2E9E6B]">Step {step + 1} of {flowSteps(requestType).length}</p>;
}

export function SectionBox({ children, invalid = false, title }) {
  return <section className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded-[10px] border bg-[#F7F8FC] p-4 dark:bg-slate-800/60 ${invalid ? "border-red-500 ring-2 ring-red-100 dark:border-red-400 dark:ring-red-950" : "border-slate-200 dark:border-slate-700"}`}>
    {title && <h2 className="text-sm font-black uppercase tracking-normal text-[#101C4A] dark:text-blue-200">{title}</h2>}
    {children}
  </section>;
}

export function FormNavigation({ backDisabled, nextLabel = "Next", onBack, onNext, submit, submitting = false }) {
  return <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
    <Button type="button" variant="outline" disabled={backDisabled} onClick={onBack}
      className={`h-11 rounded-[9px] border-[1.5px] border-slate-200 px-5 text-sm font-bold text-slate-500 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white ${backDisabled ? "pointer-events-none opacity-0" : ""}`}>Back</Button>
    <Button type={submit ? "submit" : "button"} onClick={submit ? undefined : onNext}
      disabled={submitting} className="h-11 rounded-[9px] bg-[#101C4A] px-6 text-sm font-bold text-white hover:bg-[#1B2B6B] dark:bg-blue-700 dark:hover:bg-blue-600">
      {submitting && <Spinner className="mr-2" />}{nextLabel}
    </Button>
  </div>;
}

export function ErrorText({ message }) {
  return message ? <p className="text-xs font-semibold text-red-600 dark:text-red-400">{message}</p> : null;
}

export function FieldLabel({ children }) {
  return <Label className="text-sm font-bold text-slate-900">{children}</Label>;
}

export function OptionLabel({ children }) {
  return <label className="flex cursor-pointer items-center gap-2 rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-[#101C4A]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-400">{children}</label>;
}

export function HeaderIdentity({ requestType, step, user }) {
  return <div className="grid gap-2">
    <Eyebrow step={step} requestType={requestType} />
    <RequestTitle>{requestTitle(requestType)} - <span className="font-medium">Higher Education Department</span></RequestTitle>
    <p className="text-xs font-bold text-slate-700">{user?.email || "student@laverdad.edu.ph"}</p>
    <p className="max-w-[520px] text-sm leading-relaxed text-slate-500">The name, email address and photo associated with your Google Account will be recorded when you upload files and submit this form.</p>
  </div>;
}
