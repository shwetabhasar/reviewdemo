import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from 'access/hooks/useAuth';
import { useShowroom } from 'access/contexts/showRoomContext';
import Loader from 'components/appseeds/common/Loader';

const AuthGuard = ({ children }: { children: React.ReactElement }) => {
  const { isLoggedIn, isInitialized } = useAuth();
  const { loading: showroomLoading } = useShowroom();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isLoggedIn) {
      // Only redirect to login if we're not already there
      if (!location.pathname.includes('login')) {
        navigate('/login', {
          state: {
            from: location.pathname
          },
          replace: true
        });
      }
      return;
    }

    // If logged in and on root or login page, redirect to owner list
    if (location.pathname === '/' || location.pathname === '/login') {
      navigate('/owner/list', { replace: true });
    }
  }, [isLoggedIn, isInitialized, navigate, location]);

  // Show loader while checking auth or loading showroom
  if (!isInitialized || (isLoggedIn && showroomLoading)) {
    return <Loader />;
  }

  if (!isLoggedIn) {
    return null;
  }

  return children;
};

export default AuthGuard;
