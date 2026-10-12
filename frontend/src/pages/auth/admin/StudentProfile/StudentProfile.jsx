import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import AdminPageLayout from "../AdminPageLayout";
import ProfileContent from "./ProfileContent";
import { useStudentProfile } from "./useStudentProfile";

function StudentProfile() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const profile = useStudentProfile(studentId);

  return <AdminPageLayout>
    <div className="mx-auto grid w-full max-w-[1040px] gap-6">
      <Button type="button" variant="ghost" onClick={() => navigate("/students")}
        className="h-auto w-fit rounded-[5px] px-0 py-0 text-sm font-black text-[#203b82] hover:bg-transparent hover:text-[#14285f] dark:text-blue-200 dark:hover:text-blue-100">
        <ArrowLeft className="size-4" />Back to Students
      </Button>
      <h1 className="text-2xl font-black tracking-normal text-slate-950">Student Profile</h1>
      {profile.loading && <div className="flex min-h-[320px] items-center justify-center rounded-[5px] border border-slate-200">
        <Spinner className="mr-2" /><span className="text-sm font-medium text-slate-600">Loading student profile...</span>
      </div>}
      {!profile.loading && profile.error && <Alert variant="destructive" className="rounded-[5px]">
        <AlertCircle className="size-4" /><AlertTitle>Unable to load profile</AlertTitle>
        <AlertDescription>{profile.error}{profile.error.includes("404") &&
          " Confirm that GET /api/admin/students/{student} is available on the backend."}</AlertDescription>
      </Alert>}
      {!profile.loading && !profile.error && profile.student && <ProfileContent profile={profile} />}
    </div>
  </AdminPageLayout>;
}

export default StudentProfile;
