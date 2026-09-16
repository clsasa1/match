import { createFileRoute } from "@tanstack/react-router";
import { VisualNovel } from "@/components/vn/VisualNovel";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <VisualNovel />;
}
