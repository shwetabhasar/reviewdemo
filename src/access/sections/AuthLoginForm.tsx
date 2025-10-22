import React from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';

// material-ui
import { Button, FormHelperText, Grid, Link, InputAdornment, InputLabel, OutlinedInput, Stack, Alert, Snackbar } from '@mui/material';

// third party
import { Formik } from 'formik';
import * as Yup from 'yup';

// project import
import IconButton from 'components/@extended/IconButton';
import AnimateButton from 'components/@extended/AnimateButton';
import useAuth from 'access/hooks/useAuth';
import useScriptRef from 'access/hooks/useScriptRef';

// assets
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

// Validation schema
const validationSchema = Yup.object({
  email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
  password: Yup.string().max(255).required('Password is required')
});

// ============================|| MODERN LOGIN FORM ||============================ //

const AuthLoginForm = ({ isDemo = false }: { isDemo?: boolean }) => {
  const [loginError, setLoginError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const { login } = useAuth();
  const scriptedRef = useScriptRef();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = React.useState(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.SyntheticEvent) => {
    event.preventDefault();
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <>
      <Formik
        initialValues={{
          email: '',
          password: '',
          submit: null
        }}
        validationSchema={validationSchema}
        onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
          try {
            setLoginError('');
            const result = await login(values.email, values.password);

            if (scriptedRef.current) {
              setStatus({ success: true });
              setSubmitting(false);

              // Show success message
              setSuccessMessage(result.message || 'You are logged in successfully!');
              setOpenSnackbar(true);

              // Navigate to owner list or previous page after a short delay
              setTimeout(() => {
                const from = location.state?.from || '/owner/list';
                navigate(from, { replace: true });
              }, 1000);
            }
          } catch (err: any) {
            console.error(err);
            if (scriptedRef.current) {
              setStatus({ success: false });
              setLoginError(err.message || 'Login failed. Please try again.');
              setSubmitting(false);
            }
          }
        }}
      >
        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
          <form noValidate onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {loginError && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {loginError}
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Stack spacing={1}>
                  <InputLabel
                    htmlFor="email-login"
                    sx={{
                      fontWeight: 500,
                      color: 'text.primary',
                      fontSize: '0.875rem'
                    }}
                  >
                    Email Address
                  </InputLabel>
                  <OutlinedInput
                    id="email-login"
                    type="email"
                    value={values.email}
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    fullWidth
                    error={Boolean(touched.email && errors.email)}
                    sx={{
                      '& .MuiOutlinedInput-input': {
                        py: 1.5,
                        px: 2
                      },
                      bgcolor: 'grey.50',
                      '&:hover': {
                        bgcolor: 'grey.100'
                      },
                      '&.Mui-focused': {
                        bgcolor: 'white'
                      }
                    }}
                  />
                  {touched.email && errors.email && (
                    <FormHelperText error id="standard-weight-helper-text-email-login">
                      {errors.email}
                    </FormHelperText>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Stack spacing={1}>
                  <InputLabel
                    htmlFor="password-login"
                    sx={{
                      fontWeight: 500,
                      color: 'text.primary',
                      fontSize: '0.875rem'
                    }}
                  >
                    Password
                  </InputLabel>
                  <OutlinedInput
                    fullWidth
                    error={Boolean(touched.password && errors.password)}
                    id="password-login"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    name="password"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                          color="secondary"
                          sx={{ mr: 1 }}
                        >
                          {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        </IconButton>
                      </InputAdornment>
                    }
                    placeholder="Enter password"
                    sx={{
                      '& .MuiOutlinedInput-input': {
                        py: 1.5,
                        px: 2
                      },
                      bgcolor: 'grey.50',
                      '&:hover': {
                        bgcolor: 'grey.100'
                      },
                      '&.Mui-focused': {
                        bgcolor: 'white'
                      }
                    }}
                  />
                  {touched.password && errors.password && (
                    <FormHelperText error id="standard-weight-helper-text-password-login">
                      {errors.password}
                    </FormHelperText>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" justifyContent="flex-start" alignItems="center">
                  <Link
                    variant="body2"
                    component={RouterLink}
                    to={isDemo ? '/auth/forgot-password' : '/forgot-password'}
                    sx={{
                      color: 'text.secondary',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      '&:hover': {
                        color: 'primary.main',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Forgot Password?
                  </Link>
                </Stack>
              </Grid>

              {errors.submit && (
                <Grid item xs={12}>
                  <FormHelperText error>{errors.submit}</FormHelperText>
                </Grid>
              )}

              <Grid item xs={12}>
                <AnimateButton>
                  <Button
                    disableElevation
                    disabled={isSubmitting}
                    fullWidth
                    size="large"
                    type="submit"
                    variant="contained"
                    sx={{
                      bgcolor: '#26d0ce',
                      color: 'white',
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: '#1fb5b3'
                      },
                      '&:disabled': {
                        bgcolor: 'grey.300'
                      }
                    }}
                  >
                    {isSubmitting ? 'Logging in...' : 'Login'}
                  </Button>
                </AnimateButton>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>

      {/* Success Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AuthLoginForm;
