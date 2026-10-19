import { CirclePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { programShortName, studentProfile } from "./studentOverview";

export default function StudentDashboardHeading({ user, classes }) {
  const profile = studentProfile(user, classes);
  const academic = [programShortName(profile.program), user?.year_level && `${user.year_level} Year`].filter(Boolean).join(" ");
  return <section className="grid grid-cols-1 items-start gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto]">
    <h1 className="order-1 min-w-0 text-[28px] font-bold leading-[34px] text-black dark:text-slate-50">Welcome, {profile.name}!</h1>
    <Link to="/student/request" className="order-3 mt-3 inline-flex min-h-[35px] shrink-0 items-center justify-center gap-1 rounded-[7px] bg-[#142c60] px-3 py-2 text-[13px] font-normal leading-[19px] text-white hover:bg-[#10284f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:order-2 sm:mt-0">
      <CirclePlus className="size-4 shrink-0" aria-hidden="true" />Submit excuse letter
    </Link>
    <p className="order-2 col-span-full min-w-0 break-words text-[18px] leading-6 text-[#827b7b] dark:text-slate-400 sm:order-3">
      {[academic, `Student ID: ${profile.studentId}`, profile.term].filter(Boolean).join(" \u2022 ")}
    </p>
  </section>;
}
