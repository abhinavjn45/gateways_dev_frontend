import { WorldScreen } from "@/frontend/screens/realm/world-screen";

export const metadata = { title: "The Campus — Parallax" };

export default async function WorldPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string | string[];
    event?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
  const rawEvent = Array.isArray(params.event) ? params.event[0] : params.event;
  const initialView = rawView === "3d" || rawView === "list" ? rawView : undefined;

  return <WorldScreen initialView={initialView} initialEvent={rawEvent} />;
}
