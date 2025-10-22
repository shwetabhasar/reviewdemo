import { Outlet } from 'react-router-dom';

// project import
import GuestGuard from 'access/utils/GuestGuard';

// ==============================|| LAYOUT - AUTH ||============================== //

const AuthLayout = () => (
  <GuestGuard>
    <Outlet />
  </GuestGuard>
);

export default AuthLayout;
