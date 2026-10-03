import { CertificatesScreen } from "@/frontend/screens/realm/dashboard/certificates-screen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Certificates | Gateways 2026",
};

export default function CertificatesPage() {
  return <CertificatesScreen />;
}
