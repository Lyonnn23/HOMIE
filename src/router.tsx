import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { iniciarMonitoreo } from "./lib/monitoreo";
import { iniciarAnalitica, vistaPagina } from "./lib/analitica";

export const getRouter = () => {
  // Sentry solo en el navegador (getRouter también corre en SSR).
  if (typeof window !== "undefined") {
    iniciarMonitoreo();
    iniciarAnalitica();
  }

  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Analítica: una vista de página por navegación resuelta (solo navegador).
  if (typeof window !== "undefined") {
    let ultimaRuta = "";
    router.subscribe("onResolved", ({ toLocation }) => {
      const path = toLocation.pathname + toLocation.searchStr;
      if (path === ultimaRuta) return;
      ultimaRuta = path;
      vistaPagina(path);
    });
  }

  return router;
};
