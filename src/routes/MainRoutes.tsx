import DashboardLayout from 'common/layout/Dashboard';
// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: <DashboardLayout />
    }
  ]
};

export default MainRoutes;
