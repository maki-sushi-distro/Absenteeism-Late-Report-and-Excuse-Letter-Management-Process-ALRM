import AttachmentStep from "./AttachmentStep";
import DetailsStep from "./DetailsStep";
import InstructionsStep from "./InstructionsStep";
import PrivacyStep from "./PrivacyStep";
import RequestChoiceStep from "./RequestChoiceStep";
import ReviewStep from "./ReviewStep";
import StudentInfoStep from "./StudentInfoStep";

function StepContent({ wizard }) {
  switch (wizard.step) {
    case 0: return <RequestChoiceStep wizard={wizard} />;
    case 1: return <InstructionsStep requestType={wizard.form.requestType} />;
    case 2: return <PrivacyStep wizard={wizard} />;
    case 3: return <StudentInfoStep wizard={wizard} />;
    case 4: return <DetailsStep wizard={wizard} />;
    case 5: return <AttachmentStep wizard={wizard} />;
    case 6: return <ReviewStep wizard={wizard} />;
    default: return null;
  }
}

export default StepContent;
