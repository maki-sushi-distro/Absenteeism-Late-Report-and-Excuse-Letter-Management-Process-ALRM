import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import ProfileFields from "./ProfileFields";
import SettingsCard from "./SettingsCard";
import { userInitials, valueOrFallback } from "./settingsConfig";

function ProfileCard({ user, config, role }) {
  return <SettingsCard icon={UserRound} title={config.profileTitle} description={config.profileDescription}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-16 shrink-0 bg-slate-100 text-slate-700">
          <AvatarFallback className="text-lg font-black">{userInitials(user?.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="break-words text-lg font-black text-slate-950">{valueOrFallback(user?.name, "Current user")}</p>
          <p className="break-all text-sm font-medium text-slate-600">{valueOrFallback(user?.email)}</p>
        </div>
      </div>
    </div>
    <Separator className="my-5" />
    <ProfileFields user={user} role={role} />
  </SettingsCard>;
}

export default ProfileCard;
