// material-ui
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

// project import
import DrawerHeaderStyled from './DrawerHeaderStyled';
import Logo from 'components/logo';
import useConfig from 'common/hooks/useConfig';

// types
import { MenuOrientation } from 'access/types/config';

// ==============================|| DRAWER HEADER ||============================== //

interface Props {
  open: boolean;
}

const DrawerHeader = ({ open }: Props) => {
  const theme = useTheme();
  const downLG = useMediaQuery(theme.breakpoints.down('lg'));

  const { menuOrientation } = useConfig();
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downLG;

  return (
    <DrawerHeaderStyled
      theme={theme}
      open={open}
      sx={{
        minHeight: isHorizontal ? 'unset' : '60px',
        width: isHorizontal ? { xs: '100%', lg: '424px' } : 'inherit',
        paddingTop: isHorizontal ? { xs: '20px', lg: '0' } : '24px',
        paddingBottom: isHorizontal ? { xs: '18px', lg: '0' } : '8px',
        paddingLeft: isHorizontal ? { xs: '24px', lg: '0' } : open ? '60px' : 0
      }}
    >
      <Logo isIcon={!open} sx={{ width: open ? 'auto' : 35, height: 35 }} />
    </DrawerHeaderStyled>
  );
};

export default DrawerHeader;
