import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// material-ui
import { Grid, Stack, Typography } from '@mui/material';

// project import
import useAuth from 'access/hooks/useAuth';
import AuthWrapper from 'access/sections/AuthWrapper';
import AuthLoginForm from 'access/sections/AuthLoginForm';

// ================================|| LOGIN ||================================ //

const LoginForm = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/owner/list', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <AuthWrapper>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: { xs: -0.5, sm: 0.5 } }}>
            <Typography variant="h3">Login</Typography>
            <Typography component={Link} to="/register" variant="body1" sx={{ textDecoration: 'none' }} color="primary">
              Don&apos;t have an account?
            </Typography>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <AuthLoginForm />
        </Grid>
      </Grid>
    </AuthWrapper>
  );
};

export default LoginForm;
