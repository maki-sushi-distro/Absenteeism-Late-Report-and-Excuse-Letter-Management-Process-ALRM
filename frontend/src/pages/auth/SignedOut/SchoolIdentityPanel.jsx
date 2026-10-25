import schoolLogo from "@/assets/LV_Logo.png";
import schoolPicture from "@/assets/LV_Picture.jpg";

export default function SchoolIdentityPanel() {
  return <section aria-label="ALRM System" className="relative grid min-h-[320px] place-items-center overflow-hidden bg-[#111c30] text-white md:min-h-screen">
    <img src={schoolPicture} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
    <div aria-hidden="true" className="absolute inset-0 bg-[#111c30]/90" />
    <div className="relative grid justify-items-center gap-6 px-8 py-12 text-center md:-mt-20">
      <img src={schoolLogo} alt="La Verdad Christian College logo" className="size-28 object-contain md:size-36" />
      <div className="grid justify-items-center gap-3">
        <p className="text-3xl font-black text-white">ALRM SYSTEM</p>
        <p className="max-w-[240px] text-sm font-medium leading-snug text-slate-100">Absence and Late Report Management System</p>
      </div>
    </div>
  </section>;
}
