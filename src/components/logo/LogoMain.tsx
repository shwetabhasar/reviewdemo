// material-ui
import { useTheme } from '@mui/material/styles';
import { ThemeMode } from 'access/types/config';

import logoDark from 'assets/logo-dark.svg';
import logo from 'assets/logo.svg';

// ==============================|| LOGO SVG ||============================== //

const LogoMain = ({ reverse, ...others }: { reverse?: boolean }) => {
  const theme = useTheme();
  return <img src={theme.palette.mode === ThemeMode.DARK ? logoDark : logo} alt="Mantis" width="100" />;
};

export default LogoMain;
