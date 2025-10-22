// src/routes/FinanceRoutes.tsx
import { lazy } from 'react';

// project import
import DashboardLayout from 'common/layout/Dashboard';
import Loadable from 'components/appseeds/common/Loadable';
import AuthGuard from 'access/utils/AuthGuard';

// Finance
const FinanceCompanyList = Loadable(lazy(() => import('finance/pages/FinanceCompanyList')));
const AddFinanceCompany = Loadable(lazy(() => import('finance/pages/AddFinanceCompany')));

// ==============================|| FINANCE ROUTING ||============================== //

const FinanceRoutes = {
  path: '/',
  children: [
    {
      path: 'finance',
      element: (
        <AuthGuard>
          <DashboardLayout />
        </AuthGuard>
      ),
      children: [
        {
          path: '',
          element: <FinanceCompanyList />
        },
        {
          path: 'list',
          element: <FinanceCompanyList />
        },
        {
          path: 'add',
          element: <AddFinanceCompany />
        }
      ]
    }
  ]
};

export default FinanceRoutes;
