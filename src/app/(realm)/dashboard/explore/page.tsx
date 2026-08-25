import { Suspense } from "react";
import { LoadingScreen } from "@/frontend/components/mc";
import { EventsScreen } from "@/frontend/screens/public/events/events-screen";

export const metadata = {
  title: "Explore Events | Dashboard",
};

export default function DashboardExplorePage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading events" />}>
      <EventsScreen basePath="/dashboard/explore" isDashboard={true} />
    </Suspense>
  );
}
