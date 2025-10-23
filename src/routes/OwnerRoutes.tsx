// OwnerRoutes.tsx
import { lazy } from 'react';

// project import
import DashboardLayout from 'common/layout/Dashboard';
import Loadable from 'components/appseeds/common/Loadable';
import AuthGuard from 'access/utils/AuthGuard';

//Owner
const OwnerList = Loadable(lazy(() => import('owner/pages/OwnerList')));

// ==============================|| MAIN ROUTING ||============================== //

const OwnerRoutes = {
  path: '/',
  children: [
    {
      path: 'owner',
      element: (
        <AuthGuard>
          <DashboardLayout />
        </AuthGuard>
      ),
      children: [
        {
          path: '',
          element: <OwnerList />
        },
        {
          path: 'list',
          element: <OwnerList />
        }
      ]
    }
  ]
};

export default OwnerRoutes;
