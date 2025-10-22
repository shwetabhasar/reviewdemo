// routes/ProtectedRoutes.tsx
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from 'components/appseeds/common/Loadable';
import AuthGuard from 'access/utils/AuthGuard';
import SimpleLayout from 'common/layout/Simple';
import { SimpleLayoutType } from 'access/types/config';

// Protected pages
const NoAccess = Loadable(lazy(() => import('access/pages/no-access')));

const ProtectedRoutes = {
  path: '/',
  element: (
    <AuthGuard>
      <SimpleLayout layout={SimpleLayoutType.SIMPLE} />
    </AuthGuard>
  ),
  children: [
    {
      path: '',
      element: <Navigate to="/owner/list" replace />
    },
    {
      path: 'no-access',
      element: <NoAccess />
    }
  ]
};

export default ProtectedRoutes;
