import { ReactNode } from 'react';
import { Grid, Box, Theme } from '@mui/material';
import MainCard, { MainCardProps } from 'components/MainCard';

const AuthCard = ({ children, ...other }: MainCardProps) => (
  <MainCard
    sx={{
      maxWidth: { xs: 400, lg: 475 },
      margin: { xs: 2.5, md: 22 },
      '& > *': {
        flexGrow: 1,
        flexBasis: '50%'
      }
    }}
    content={false}
    {...other}
    border={false}
    boxShadow
    shadow={(theme: Theme) => theme.customShadows.z1}
  >
    <Box sx={{ p: { xs: 2, sm: 3, md: 4, xl: 5 } }}>{children}</Box>
  </MainCard>
);

// ==============================|| AUTHENTICATION - WRAPPER ||============================== //

interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => (
  <Grid item>
    <AuthCard>{children}</AuthCard>
  </Grid>
);

export { AuthCard, AuthWrapper };
export default AuthWrapper;
