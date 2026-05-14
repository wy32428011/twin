/**
 * 路由配置
 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import CreatePage from "@/pages";
import PreviewPage from "@/pages/preview";

export const router: any = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to={"/create"} replace />,
  },
  {
    path: "/create",
    element: <CreatePage />,
  },
  {
    path: "/preview/:id",
    element: <PreviewPage />,
  },
  {
    path: "*",
    element: <div>404 not found</div>,
  },
]);