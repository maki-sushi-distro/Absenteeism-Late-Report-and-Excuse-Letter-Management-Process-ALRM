import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { googleLoginUrl } from "@/api/client";

export default function SignedOutMessage() {
  return <section className="relative -mt-10 flex min-h-[calc(40svh+2.5rem)] flex-1 flex-col items-center rounded-t-[40px] bg-white px-7 pb-10 pt-12 md:m-0 md:grid md:min-h-screen md:place-items-center md:rounded-none md:px-6 md:py-12">
    <div className="grid w-full max-w-[420px] justify-items-center text-center">
      <h1 className="text-2xl font-extrabold leading-tight text-[#253044] sm:text-3xl">You've been signed out</h1>
      <p className="mt-2 text-xs text-slate-600 md:text-sm">Thanks for using the system</p>
      <button type="button" onClick={() => { window.location.href = googleLoginUrl(); }} className="mt-8 inline-flex h-11 w-full max-w-[280px] items-center justify-center gap-3 rounded-[5px] bg-[#203b82] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#182e67] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203b82] md:hidden">
        <ArrowRight aria-hidden="true" className="size-4" />Sign in with Google
      </button>
      <Link to="/login" replace className="mt-7 hidden h-11 w-full max-w-[280px] items-center justify-center gap-3 rounded-[5px] bg-[#203b82] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#182e67] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203b82] md:inline-flex">
        <ArrowRight aria-hidden="true" className="size-4" />Sign in again
      </Link>
      <p className="mt-7 text-xs italic text-slate-500 md:mt-5 md:not-italic">Use your official LV email account to login.</p>
    </div>
  </section>;
}
