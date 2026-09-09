import { AnnouncementsScreen } from "@/frontend/screens/realm/dashboard/announcements-screen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Announcements | Gateways 2026",
};

export default function AnnouncementsPage() {
  return <AnnouncementsScreen />;
}
