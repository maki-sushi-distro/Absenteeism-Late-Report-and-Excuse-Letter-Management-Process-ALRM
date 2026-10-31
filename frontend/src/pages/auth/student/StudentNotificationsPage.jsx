import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import StudentPageLayout from "./StudentPageLayout";
import useServerNotifications from "@/components/notifications/useServerNotifications";
import NotificationsView from "./notifications/NotificationsView";

function NotificationsContent({ user }) {
  const [filter, setFilter] = useState("all");
  const notifications = useServerNotifications(user || { id: "", role: "student" });
  return <NotificationsView {...notifications} filter={filter} onFilterChange={setFilter} unreadTitle="Unread in your account" />;
}

export default function StudentNotificationsPage() {
  const { user } = useAuth();
  return <StudentPageLayout contentPadding="px-5 sm:px-[50px]">
    <NotificationsContent key={user?.id} user={user} />
  </StudentPageLayout>;
}
