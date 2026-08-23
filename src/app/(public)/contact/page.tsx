import { ContactScreen } from "@/frontend/screens/public/contact/contact-screen";

export const metadata = { title: "Contact Us — Parallax" };

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
