import { ResultsScreen } from "@/frontend/screens/public/results-screen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Results & Leaderboard",
  description: "Check the results of all Gateways 2026 events and track the live college championship leaderboard.",
};

export default function ResultsPage() {
  return <ResultsScreen />;
}
