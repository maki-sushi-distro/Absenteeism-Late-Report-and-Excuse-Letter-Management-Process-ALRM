import PlaceholderContent from "@/components/dashboard/PlaceholderContent";
import StudentPageLayout from "./StudentPageLayout";

function StudentPlaceholderPage({ description, title }) {
  return <StudentPageLayout>
    <PlaceholderContent title={title} description={description}
      message="This student section is ready for real records from the backend." />
  </StudentPageLayout>;
}

export default StudentPlaceholderPage;
