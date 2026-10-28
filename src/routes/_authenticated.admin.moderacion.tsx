import { createFileRoute } from "@tanstack/react-router";
import { AdminUnavailable } from "@/components/AdminUnavailable";

export const Route = createFileRoute("/_authenticated/admin/moderacion")({
  head: () => ({ meta: [
    { name: "description", content: "Eventos de moderación por usuario: lenguaje ofensivo, contacto fuera de la app y spam." },
    { property: "og:title", content: "Moderación — Homie" },
    { property: "og:description", content: "Eventos de moderación por usuario." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Moderación — Homie" }] }),
  component: AdminModeracion,
});

function AdminModeracion() {
  return <AdminUnavailable title="Moderación" message="El historial de moderación aún no está habilitado. La revisión y el bloqueo de mensajes siguen activos." />;
}
