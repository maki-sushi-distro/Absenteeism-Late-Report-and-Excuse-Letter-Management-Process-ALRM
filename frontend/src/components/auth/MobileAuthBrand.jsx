import schoolLogo from "@/assets/LV_Logo.png";
import schoolPicture from "@/assets/LV_Picture.jpg";

export default function MobileAuthBrand() {
  return <section aria-label="ALRM System" className="relative h-[60svh] min-h-80 shrink-0 overflow-hidden bg-[#1c356a] text-white md:hidden">
    <img src={schoolPicture} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover object-center" />
    <div aria-hidden="true" className="absolute inset-0 bg-[#1c356a]/90" />
    <div className="relative grid justify-items-center gap-5 px-6 pt-[16svh] text-center">
      <img src={schoolLogo} alt="La Verdad Christian College logo" className="size-18 object-contain" />
      <div className="grid justify-items-center gap-1.5">
        <p className="text-2xl font-extrabold text-white">ALRM SYSTEM</p>
        <p className="max-w-44 text-[10px] leading-snug text-slate-100">Absence and Late Report<br />Management System</p>
      </div>
    </div>
  </section>;
}
