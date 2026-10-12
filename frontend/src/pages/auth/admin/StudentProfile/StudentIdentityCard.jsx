import { UserCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { displayId, programName, studentContact, studentEmail, studentName } from "./profileDisplay";

function StudentIdentityCard({ student }) {
  return <div className="flex min-h-[116px] items-center gap-4 rounded-[5px] border border-slate-300 bg-white px-4 py-5 sm:px-5">
    <Avatar className="size-16 bg-slate-100"><AvatarFallback className="bg-slate-100 text-slate-500">
      <UserCircle className="size-14" strokeWidth={1.45} />
    </AvatarFallback></Avatar>
    <div className="min-w-0">
      <h2 className="break-words text-xl font-black text-[#203b82] dark:text-blue-200">{studentName(student)}</h2>
      <p className="mt-1 text-xs font-bold text-[#203b82] dark:text-blue-200">Program: {programName(student)}</p>
      <p className="mt-1 break-all text-xs font-bold text-[#203b82] dark:text-blue-200">Student ID: {displayId(student)}</p>
      <p className="mt-1 break-all text-xs font-bold text-[#203b82] dark:text-blue-200">Email: {studentEmail(student)}</p>
      <p className="mt-1 break-words text-xs font-bold text-[#203b82] dark:text-blue-200">Contact: {studentContact(student)}</p>
    </div>
  </div>;
}

export default StudentIdentityCard;
