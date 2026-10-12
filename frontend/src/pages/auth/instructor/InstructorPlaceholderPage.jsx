import PlaceholderContent from "@/components/dashboard/PlaceholderContent";
import InstructorPageLayout from "./InstructorPageLayout";

function InstructorPlaceholderPage({ description, title }) {
  return <InstructorPageLayout>
    <PlaceholderContent title={title} description={description}
      message="This instructor section is ready for real class data from the backend." />
  </InstructorPageLayout>;
}

export default InstructorPlaceholderPage;
