// src/routes/index.ts
import { createBrowserRouter, createHashRouter } from 'react-router-dom';

import MainRoutes from './MainRoutes';
import LoginRoutes from './LoginRoutes';
import OwnerRoutes from './OwnerRoutes';
import ProtectedRoutes from './ProtectedRoutes';
import FinanceRoutes from './FinanceRoutes';

const routes = [LoginRoutes, OwnerRoutes, FinanceRoutes, MainRoutes, ProtectedRoutes];

// Detect packaged Electron (file://) or non-dev build
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const useHashRouter = isFileProtocol || !import.meta.env.DEV;
const createRouter = useHashRouter ? createHashRouter : createBrowserRouter;

const router = createRouter(routes, {
  // basename doesn’t matter for hash routing; keep it only for browser routing
  basename: useHashRouter ? '/' : import.meta.env.VITE_APP_BASE_NAME || '/'
});

export default router;
