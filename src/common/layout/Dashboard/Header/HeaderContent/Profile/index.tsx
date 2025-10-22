import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

// material-ui
import { useTheme } from '@mui/material/styles';
import { Box, ButtonBase, CardContent, ClickAwayListener, Grid, Paper, Popper, Stack, Tooltip, Typography, Divider } from '@mui/material';

// project import
import SettingTab from './SettingTab';
import Avatar from 'components/@extended/Avatar';
import MainCard from 'components/MainCard';
import Transitions from 'components/@extended/Transitions';
import IconButton from 'components/@extended/IconButton';
import useAuth from 'access/hooks/useAuth';
import { useShowroom } from 'access/contexts/showRoomContext';

// assets
import avatar1 from 'assets/images/users/avatar-1.png';
import { LogoutOutlined, BankOutlined, IdcardOutlined, ShopOutlined } from '@ant-design/icons';

// types
import { ThemeMode } from 'access/types/config';

const Profile = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const { logout, user } = useAuth();
  const { currentShowroom } = useShowroom();
  const handleLogout = async () => {
    try {
      await logout();
      navigate(`/`, {
        state: {
          from: ''
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const anchorRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: MouseEvent | TouchEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  const iconBackColorOpen = theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.100';

  useEffect(() => {
    console.log('Current Firm Data:', currentShowroom);
    console.log('User Data:', user);
  }, [currentShowroom, user]);

  return (
    <Box sx={{ flexShrink: 0, ml: 0.75 }}>
      <ButtonBase
        sx={{
          p: 0.25,
          bgcolor: open ? iconBackColorOpen : 'transparent',
          borderRadius: 1,
          '&:hover': { bgcolor: theme.palette.mode === ThemeMode.DARK ? 'secondary.light' : 'secondary.lighter' },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.secondary.dark}`,
            outlineOffset: 2
          }
        }}
        aria-label="open profile"
        ref={anchorRef}
        aria-controls={open ? 'profile-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ p: 0.5 }}>
          <Avatar alt="profile user" src={avatar1} size="sm" />
          <Stack>
            <Typography variant="subtitle1">{user?.username}</Typography>
            <Typography variant="caption" color="textSecondary">
              {currentShowroom?.showroomName || 'No firm selected'}
            </Typography>
          </Stack>
        </Stack>
      </ButtonBase>
      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 9]
              }
            }
          ]
        }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position="top-right" in={open} {...TransitionProps}>
            <Paper
              sx={{
                boxShadow: theme.customShadows.z1,
                width: 290,
                minWidth: 240,
                maxWidth: 290,
                [theme.breakpoints.down('md')]: {
                  maxWidth: 250
                }
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard elevation={0} border={false} content={false}>
                  <CardContent sx={{ px: 2.5, pt: 3 }}>
                    <Grid container justifyContent="space-between" alignItems="center">
                      <Grid item>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Avatar alt="profile user" src={avatar1} sx={{ width: 32, height: 32 }} />
                          <Stack>
                            <Typography variant="h6">{user?.username}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              {user?.email || 'User'}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Grid>
                      <Grid item>
                        <Tooltip title="Logout">
                          <IconButton size="large" sx={{ color: 'text.primary' }} onClick={handleLogout}>
                            <LogoutOutlined />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    </Grid>

                    {currentShowroom && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <BankOutlined style={{ color: theme.palette.primary.main }} />
                            <Typography variant="body2">Firm: {currentShowroom?.showroomName}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <IdcardOutlined style={{ color: theme.palette.primary.main }} />
                            <Typography variant="body2">ID: {currentShowroom?.showroomId}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <ShopOutlined style={{ color: theme.palette.primary.main }} />
                            <Typography variant="body2">Company: {currentShowroom?.companyName}</Typography>
                          </Stack>
                        </Stack>
                      </>
                    )}
                  </CardContent>
                  <Box sx={{ p: 2 }}>
                    <SettingTab />
                  </Box>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
};

export default Profile;
