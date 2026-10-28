import { createFileRoute } from "@tanstack/react-router";
import { AdminUnavailable } from "@/components/AdminUnavailable";

export const Route = createFileRoute("/_authenticated/admin/config")({
  head: () => ({ meta: [
    { name: "description", content: "Configuración de cobros de Homie: comisiones, periodo gratis, Premium y ranking." },
    { property: "og:title", content: "Configuración de cobros — Admin Homie" },
    { property: "og:description", content: "Configuración de cobros de Homie: comisiones, periodo gratis, Premium y ranking." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Configuración de cobros — Admin Homie" }] }),
  component: AdminConfig,
});

function AdminConfig() {
  return <AdminUnavailable title="Configuración de cobros" message="La edición de cobros aún no está habilitada. Las tarifas vigentes se mantienen sin cambios." />;
}
