// material-ui
import { styled } from '@mui/material/styles';
import { LinearProgress, Stack, Typography } from '@mui/material';

// types
import { ThemeMode } from 'access/types/config';

// ==============================|| EMPTY TABLE - NO DATA ||============================== //

const StyledGridOverlay = styled(Stack)(({ theme }) => ({
  height: '400px',
  '& .ant-empty-img-1': {
    fill: theme.palette.mode === ThemeMode.DARK ? theme.palette.secondary[200] : theme.palette.secondary[400]
  },
  '& .ant-empty-img-2': {
    fill: theme.palette.secondary.light
  },
  '& .ant-empty-img-3': {
    fill: theme.palette.mode === ThemeMode.DARK ? theme.palette.secondary.A200 : theme.palette.secondary[200]
  },
  '& .ant-empty-img-4': {
    fill: theme.palette.mode === ThemeMode.DARK ? theme.palette.secondary.A300 : theme.palette.secondary.A100
  },
  '& .ant-empty-img-5': {
    fillOpacity: 0.95,
    fill: theme.palette.secondary.light
  }
}));

// ==============================|| EMPTY TABLE - NO DATA ||============================== //

interface Props {
  msg: string;
  isLoading?: boolean;
}

const EmptyTable = ({ msg, isLoading }: Props) => {
  return (
    <StyledGridOverlay alignItems="center" justifyContent="center" spacing={1}>
      <Typography align="center" color="secondary">
        <Stack direction="column">
          {isLoading && <LinearProgress />}
          {msg}
        </Stack>
      </Typography>
    </StyledGridOverlay>
  );
};

export default EmptyTable;
