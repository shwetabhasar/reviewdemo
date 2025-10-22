import { IconButton, Stack, Tooltip } from '@mui/material';
import { DeleteTwoTone, EditTwoTone, EyeOutlined } from '@ant-design/icons';
import { useTheme } from '@mui/material/styles';

interface ReactTableActionButtonsProps {
  readonly onViewClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  readonly onEditClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  readonly onDeleteClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  readonly isViewVisible?: boolean;
  readonly isEditVisible?: boolean;
  readonly isDeleteVisible?: boolean;
}

function ReactTableActionButtons({
  onViewClick,
  onEditClick,
  onDeleteClick,
  isViewVisible = false,
  isEditVisible = false,
  isDeleteVisible = false
}: ReactTableActionButtonsProps) {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="left" justifyContent="left" spacing={0}>
      {isViewVisible && (
        <Tooltip title="View">
          <IconButton color="secondary" onClick={onViewClick}>
            <EyeOutlined style={{ color: theme.palette.secondary.main }} />
          </IconButton>
        </Tooltip>
      )}
      {isEditVisible && (
        <Tooltip title="Edit">
          <IconButton color="primary" onClick={onEditClick}>
            <EditTwoTone twoToneColor={theme.palette.primary.main} />
          </IconButton>
        </Tooltip>
      )}
      {isDeleteVisible && (
        <Tooltip title="Delete">
          <IconButton color="error" onClick={onDeleteClick}>
            <DeleteTwoTone twoToneColor={theme.palette.error.main} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

export default ReactTableActionButtons;
