import { ContactScreen } from "@/frontend/screens/public/contact/contact-screen";

export const metadata = {
  title: "Contact Us & Location",
  description: "Get directions to CHRIST (Deemed to be University) Bangalore Central Campus and contact the Gateways 2026 organizing committee.",
  keywords: [
    "Contact Gateways 2026",
    "Christ University Bangalore Central Campus",
    "Gateways Organizing Committee",
    "Tech Fest Contact",
    "Hackathon Location Bangalore",
    "IT Fest Venue",
    "Reach Christ University",
    "Gateways Support",
  ],
};

/**
 * Contact.
 *
 * `FestChat` is mounted per page rather than in `SiteShell` — it used to live
 * there, which put it on all seven public routes. It belongs on the two pages
 * where someone is actually looking for an answer: the homepage, and here,
 * where the alternative is phoning a student volunteer.
 */
export default function ContactPage() {
  return (
    <>
      <ContactScreen />
    </>
  );
}
