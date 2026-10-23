import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { iniciarMonitoreo } from "./lib/monitoreo";

export const getRouter = () => {
  // Sentry solo en el navegador (getRouter también corre en SSR).
  if (typeof window !== "undefined") iniciarMonitoreo();

  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
