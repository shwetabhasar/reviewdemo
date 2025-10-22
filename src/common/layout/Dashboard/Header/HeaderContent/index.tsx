// material-ui
import { Theme } from '@mui/material/styles';
import { Box, useMediaQuery } from '@mui/material';

// project import
// import Search from './Search';
import Profile from './Profile';
// import Notification from './Notification';

import useConfig from 'common/hooks/useConfig';
import DrawerHeader from 'common/layout/Dashboard/Drawer/DrawerHeader';

// types
import { MenuOrientation } from 'access/types/config';

// ==============================|| HEADER - CONTENT ||============================== //

const HeaderContent = () => {
  const { menuOrientation } = useConfig();

  const downLG = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));

  return (
    <>
      {menuOrientation === MenuOrientation.HORIZONTAL && !downLG && <DrawerHeader open={true} />}
      <Box sx={{ flexGrow: 1 }} />
      {/* {!downLG && <Search />} */}
      {/* {downLG && <Box sx={{ width: '100%', mt: 100 }} />} */}

      {/* <Notification /> */}
      {!downLG && <Profile />}
    </>
  );
};

export default HeaderContent;
