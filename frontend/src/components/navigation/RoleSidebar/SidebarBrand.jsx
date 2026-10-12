import { useSidebar } from "@/components/ui/sidebar";
import lvLogo from "@/assets/LV_Logo.png";

function SidebarBrand({ wide, compact }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button type="button" aria-label="Toggle sidebar" onClick={toggleSidebar}
      className={`flex w-full items-center text-white hover:bg-white/5 hover:text-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${wide ? "h-[89px] gap-3 px-5" : compact === "instructor" ? "h-[70px] gap-2 px-5" : "h-[70px] gap-2 px-4"}`}>
      <img src={lvLogo} alt="ALRM System logo" className={`shrink-0 object-contain ${wide ? "size-11" : "size-9"}`} />
      <span className={`whitespace-nowrap font-black tracking-normal group-data-[collapsible=icon]:hidden ${wide ? "text-2xl" : "text-xl"}`}>ALRM SYSTEM</span>
    </button>
  );
}

export default SidebarBrand;
