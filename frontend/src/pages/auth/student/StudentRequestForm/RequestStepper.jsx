import { Check } from "lucide-react";
import { flowSteps } from "./requestConfig";

function StepCircle({ done, active, index }) {
  const stateClass = done ? "border-[#2E9E6B] bg-[#2E9E6B] text-white" : active
    ? "border-[#101C4A] bg-[#101C4A] text-white shadow-[0_0_0_5px_rgba(16,28,74,0.12)]"
    : "border-slate-200 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return <div className={`flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all sm:size-[38px] ${stateClass}`}>
    {done ? <Check className="size-5" strokeWidth={3} /> : index + 1}
  </div>;
}

function RequestStepper({ currentStep, requestType }) {
  const steps = flowSteps(requestType);
  const fillWidth = steps.length <= 1 ? 0 : (currentStep / (steps.length - 1)) * 100;

  return <div className="mb-8 w-full px-4 sm:px-6">
    <div className="relative flex items-start justify-between">
      <div className="absolute left-4 right-4 top-4 h-0.5 bg-slate-200 dark:bg-slate-700 sm:left-[19px] sm:right-[19px] sm:top-[19px]">
        <div className="h-0.5 bg-[#2E9E6B] transition-all duration-500" style={{ width: `${fillWidth}%` }} />
      </div>
      {steps.map((label, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return <div key={`${label}-${index}`} className={`relative z-10 flex flex-1 flex-col items-center ${index === 0 ? "items-start" : ""} ${index === steps.length - 1 ? "items-end" : ""}`}>
          <StepCircle done={done} active={active} index={index} />
          <p className={`mt-2 hidden max-w-[90px] text-center text-xs font-medium sm:block ${active ? "font-bold text-[#101C4A] dark:text-blue-200" : done ? "text-slate-900 dark:text-slate-200" : "text-slate-400 dark:text-slate-400"} ${index === 0 ? "text-left" : ""} ${index === steps.length - 1 ? "text-right" : ""}`}>{label}</p>
        </div>;
      })}
    </div>
    <p className="mt-6 text-xs font-medium text-slate-500">Step {currentStep + 1} of {steps.length} - {steps[currentStep]}</p>
  </div>;
}

export default RequestStepper;
