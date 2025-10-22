// material-ui
import { useTheme } from '@mui/material/styles';

import logoIconDark from 'assets/logo-icon-dark.svg';
import logoIcon from 'assets/logo-icon.svg';
import { ThemeMode } from 'access/types/config';

// ==============================|| LOGO ICON SVG ||============================== //

const LogoIcon = () => {
  const theme = useTheme();

  return <img src={theme.palette.mode === ThemeMode.DARK ? logoIconDark : logoIcon} alt="Mantis" width="100" />;
};

export default LogoIcon;
