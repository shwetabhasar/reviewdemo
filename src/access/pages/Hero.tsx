// material-ui
import { useTheme } from '@mui/material/styles';
import { Box, Container, Grid, Typography } from '@mui/material';

// third party

// ==============================|| LANDING - HEADER PAGE ||============================== //

const Hero = () => {
  const theme = useTheme();

  return (
    <Container sx={{ minHeight: '100vh', display: 'flex', alignItems: 'left' }}>
      <Grid
        container
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{
          pt: { md: 0, xs: 8 },
          pb: { md: 0, xs: 5 },
          // Reduced padding-left to bring content closer to the login card
          pl: { md: 0, xs: 8, xl: 20 } // Changed from xl: 45 to xl: 20
        }}
      >
        <Grid item xs={12} lg={5} md={12} xl={12}>
          <Grid
            container
            spacing={2}
            sx={{
              // Reduced padding-right for better spacing
              pr: { md: 5, xs: 0 }, // Changed from pr: 10 to pr: 5
              [theme.breakpoints.down('md')]: { pr: 0, textAlign: 'center' }
            }}
          >
            <Grid item xs={12}>
              <Typography
                variant="h1"
                color="white"
                sx={{
                  fontSize: { xs: '1.825rem', sm: '2rem', md: '2.5rem' },
                  fontWeight: 700,
                  lineHeight: { xs: 1.3, sm: 1.3, md: 1.3 }
                }}
              >
                <span>Save </span>
                <Box component="span" sx={{ color: theme.palette.info.main }}>
                  <span>Paper </span>
                </Box>
                <span>Live </span>
                <Box component="span" sx={{ color: theme.palette.success.main }}>
                  <span>Green </span>
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                component="div"
                color="white"
                sx={{
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 400,
                  lineHeight: { xs: 1.4, md: 1.4 },
                  // Added whiteSpace to keep text in single line
                  whiteSpace: 'nowrap',
                  // Added overflow handling for smaller screens if needed
                  overflow: { xs: 'auto', md: 'visible' },
                  // Optional: adjust text for very small screens
                  [theme.breakpoints.down('sm')]: {
                    whiteSpace: 'normal' // Allow wrapping on very small screens if needed
                  }
                }}
              >
                <Box component="span" sx={{ color: theme.palette.warning.main, fontWeight: 'bold' }}>
                  'bikes...
                </Box>{' '}
                fast solution for document management'
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Hero;
