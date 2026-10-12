import { useAuth } from "@/context/AuthContext";
import StudentPageLayout from "../StudentPageLayout";
import { FormNavigation, RequestPageCanvas } from "./RequestPrimitives";
import RequestShell from "./RequestShell";
import RequestSuccess from "./RequestSuccess";
import StepContent from "./StepContent";
import { useStudentRequestForm } from "./useStudentRequestForm";

function RequestWizard({ user }) {
  const wizard = useStudentRequestForm(user);

  return <StudentPageLayout><RequestPageCanvas>
    {wizard.submitted ? <RequestSuccess requestType={wizard.form.requestType} onReset={wizard.resetForm} /> :
      <form className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" onSubmit={wizard.handleSubmit}>
        <RequestShell requestType={wizard.form.requestType} step={wizard.step} user={user}>
          <StepContent wizard={wizard} />
          <FormNavigation backDisabled={wizard.step === 0} nextLabel={wizard.step === 6 ? "Submit" : "Next"}
            onBack={wizard.previousStep} onNext={wizard.nextStep}
            submit={wizard.step === 6} submitting={wizard.submitting} />
        </RequestShell>
      </form>}
  </RequestPageCanvas></StudentPageLayout>;
}

function StudentRequestForm() {
  const { user } = useAuth();
  return <RequestWizard key={user?.id || "guest"} user={user} />;
}

export default StudentRequestForm;
