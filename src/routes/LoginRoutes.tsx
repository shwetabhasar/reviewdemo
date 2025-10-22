import { lazy } from 'react';
// project import
import AuthLayout from 'access/pages/AuthLayout';
import Loadable from 'components/appseeds/common/Loadable';
import { SimpleLayoutType } from 'access/types/config';
import SimpleLayout from 'common/layout/Simple';

// render - login
const AuthLogin = Loadable(lazy(() => import('access/pages/LoginForm')));
const AuthRegister = Loadable(lazy(() => import('access/pages/register')));
const PagesLanding = Loadable(lazy(() => import('access/pages/landing')));

// ==============================|| AUTH ROUTING ||============================== //

const LoginRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: <AuthLayout />,
      children: [
        {
          path: '/',
          element: <SimpleLayout layout={SimpleLayoutType.LANDING} />,
          children: [
            {
              index: true,
              element: <PagesLanding />
            }
          ]
        },
        {
          path: 'login',
          element: <AuthLogin />
        },
        {
          path: 'register',
          element: <AuthRegister />
        }
      ]
    }
  ]
};
export default LoginRoutes;
