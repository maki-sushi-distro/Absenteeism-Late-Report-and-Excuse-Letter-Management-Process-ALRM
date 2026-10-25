import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SignedOutMessage() {
  return <section className="grid min-h-[55svh] place-items-center px-6 py-12 md:min-h-screen">
    <div className="grid w-full max-w-[420px] justify-items-center text-center">
      <h1 className="text-2xl font-extrabold leading-tight text-[#253044] sm:text-3xl">You've been signed out</h1>
      <p className="mt-2 text-sm text-slate-600">Thanks for using the system</p>
      <Link to="/login" replace className="mt-7 inline-flex h-11 w-full max-w-[280px] items-center justify-center gap-3 rounded-[5px] bg-[#203b82] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#182e67] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203b82]">
        <ArrowRight aria-hidden="true" className="size-4" />Sign in again
      </Link>
      <p className="mt-5 text-xs text-slate-500">Use your official LV email account to login.</p>
    </div>
  </section>;
}
