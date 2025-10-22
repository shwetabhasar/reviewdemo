import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

// project import
import Loader from 'components/appseeds/common/Loader';

// types
import { SimpleLayoutType } from 'access/types/config';

const Header = lazy(() => import('./Header'));

// ==============================|| LAYOUT - SIMPLE / LANDING ||============================== //

const SimpleLayout = ({ layout = SimpleLayoutType.SIMPLE }: { layout?: SimpleLayoutType }) => {
  return (
    <Suspense fallback={<Loader />}>
      <Header />
      <Outlet />
    </Suspense>
  );
};

export default SimpleLayout;
