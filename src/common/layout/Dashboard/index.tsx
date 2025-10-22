import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import { useMediaQuery, Box, Toolbar } from '@mui/material';

// project import
import Drawer from './Drawer';
import Header from './Header';
import HorizontalBar from './Drawer/HorizontalBar';
import Loader from 'components/appseeds/common/Loader';
import AuthGuard from 'access/utils/AuthGuard';

import useConfig from 'common/hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from '@components/api/menu';

// types
import { MenuOrientation } from 'access/types/config';

// ==============================|| MAIN LAYOUT ||============================== //

const DashboardLayout = () => {
  const theme = useTheme();
  const { menuMasterLoading, menuMaster } = useGetMenuMaster();
  const matchDownXL = useMediaQuery(theme.breakpoints.down('xl'));
  const downLG = useMediaQuery(theme.breakpoints.down('lg'));

  const { miniDrawer, menuOrientation } = useConfig();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;

  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downLG;

  // Import these from your config or define them here
  const DRAWER_WIDTH = 260;
  const MINI_DRAWER_WIDTH = 60;

  useEffect(() => {
    if (!miniDrawer) {
      handlerDrawerOpen(!matchDownXL);
    }
  }, [matchDownXL, miniDrawer]);

  if (menuMasterLoading) return <Loader />;

  return (
    <AuthGuard>
      <Box sx={{ display: 'flex', width: '100%' }}>
        <Header />
        {!isHorizontal ? <Drawer /> : <HorizontalBar />}

        <Box
          component="main"
          sx={{
            width: downLG ? '100%' : drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : `calc(100% - ${MINI_DRAWER_WIDTH}px)`,
            flexGrow: 1,
            p: 0, // Remove all padding
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen
            })
          }}
        >
          <Toolbar
            sx={{
              mt: 0,
              minHeight: '48px !important'
            }}
          />

          <Box
            sx={{
              height: 'calc(100vh - 48px)', // Adjust based on toolbar height
              overflow: 'auto',
              p: 0, // Ensure no padding
              m: 0 // Ensure no margin
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </AuthGuard>
  );
};

export default DashboardLayout;
