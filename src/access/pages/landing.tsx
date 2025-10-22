// material-ui
import { useTheme } from '@mui/material/styles';
import { Box, Container, Grid, Typography } from '@mui/material';
import AuthLoginForm from 'access/sections/AuthLoginForm';

// Import your login form component

// ==============================|| MODERN LANDING PAGE ||============================== //

const Landing = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: '#2a2a2a', // Dark background similar to your design
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        '&:before': {
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 1,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%)'
        }
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 5 }}>
        <Grid container spacing={4} justifyContent="center" alignItems="center">
          {/* Main Content Container */}
          <Grid item xs={12} md={10} lg={8}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              {/* Main Heading - All in one line */}
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  mb: 2,
                  color: 'white'
                }}
              >
                Save{' '}
                <Box component="span" sx={{ color: '#26d0ce' }}>
                  Paper
                </Box>{' '}
                Live{' '}
                <Box component="span" sx={{ color: '#1ed760' }}>
                  Green
                </Box>
              </Typography>

              {/* Tagline */}
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.5,
                  mb: 4
                }}
              >
                <Box component="span" sx={{ color: '#ffa500', fontWeight: 600 }}>
                  'bikes...
                </Box>{' '}
                fast solution for document management'
              </Typography>
            </Box>

            {/* Login Form - Centered below text */}
            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: 2,
                p: { xs: 3, sm: 4, md: 5 },
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                maxWidth: 450,
                mx: 'auto'
              }}
            >
              {/* Login Header */}
              <Box sx={{ mb: 3 }}>
                <Grid container justifyContent="space-between" alignItems="center">
                  <Grid item>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.grey[900]
                      }}
                    >
                      Login
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Login Form Component */}
              <AuthLoginForm />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Landing;
