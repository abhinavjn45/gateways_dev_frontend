import { Suspense } from "react";
import { LoadingScreen } from "@/frontend/components/mc";
import { EventsScreen } from "@/frontend/screens/public/events/events-screen";

export const metadata = {
  title: "Events & Competitions",
  description: "Browse technical and non-technical events at Gateways 2026. Register for the Hackathon, Web Development, IT Manager, and Gaming tournaments.",
  keywords: [
    "Coding Events Bangalore",
    "Hackathon Registration",
    "IT Manager Competition",
    "E-sports Tournament Bangalore",
    "Web Development Hackathon",
    "Tech Fest Events",
    "College Competitions 2026",
    "Digital Twins Challenges",
  ],
};

export default function EventsPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<LoadingScreen label="Loading events" />}>
      <EventsScreen />
    </Suspense>
  );
}
