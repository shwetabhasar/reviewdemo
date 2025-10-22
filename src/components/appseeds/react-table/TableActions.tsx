import { CSVExport, DebouncedInput } from 'components/appseeds/react-table';
import { PlusOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { Stack, Button, Tooltip } from '@mui/material';
import { BlobProvider } from '@react-pdf/renderer';
import PDFDocument from 'components/appseeds/react-table/PDFDocument';
import { ReactElement, ReactNode } from 'react';

interface Props {
  readonly globalFilter: string;
  readonly onFilterChange: (value: any) => void;
  readonly data: any[];
  readonly columns: string[];
  readonly isIdChecked: boolean;
  readonly isAuditChecked: boolean;
  readonly onIdChange: () => void;
  readonly onAuditChange: () => void;
  readonly isAddButtonVisible: boolean;
  readonly isAuditButtonDisable?: boolean;
  readonly addRoute?: string;
  readonly addButtonLabel?: string;
  readonly table: any;
  readonly exportFilePrefix: string;
  readonly customActionButtons?: ReactNode;
}

function TableActions({
  globalFilter,
  onFilterChange,
  data,
  isAddButtonVisible,
  addRoute,
  columns,
  addButtonLabel,
  table,
  exportFilePrefix,
  customActionButtons
}: Readonly<Props>): ReactElement {
  const navigation = useNavigate();

  const exportData = table.getSelectedRowModel().flatRows.map((row: any) => {
    const rowData = row.original as Record<string, any>;
    return columns.reduce((acc: Record<string, any>, col: string) => {
      acc[col] = rowData[col];
      return acc;
    }, {});
  });

  const headers = columns.map((col) => ({
    label: col.toUpperCase().replace('_', ' '),
    key: col
  }));

  const pdfDocument = <PDFDocument data={exportData.length === 0 ? data : exportData} columns={columns} />;

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{
        padding: 2,
        paddingBottom: 0,
        paddingLeft: 2, // Remove left padding
        paddingRight: 2 // Keep right padding for buttons
      }}
    >
      <DebouncedInput value={globalFilter ?? ''} onFilterChange={onFilterChange} placeholder={`Search ${data?.length} records...`} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
        {/* Custom action buttons go first */}
        {customActionButtons}

        {isAddButtonVisible && (
          <Button
            variant="contained"
            startIcon={<PlusOutlined />}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              navigation(`${addRoute}`);
            }}
            sx={{ height: 34 }}
          >
            {addButtonLabel}
          </Button>
        )}
        <CSVExport data={exportData.length === 0 ? data : exportData} filename={`${exportFilePrefix}.csv`} headers={headers} />
        <BlobProvider document={pdfDocument}>
          {({ blob, url, loading }) =>
            loading ? (
              <Tooltip title="Generating PDF...">
                <FilePdfOutlined
                  style={{
                    fontSize: '24px',
                    color: 'gray',
                    cursor: 'not-allowed'
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Download PDF">
                <a href={url!} download={`${exportFilePrefix}.pdf`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <FilePdfOutlined
                    style={{
                      fontSize: '24px',
                      color: 'red',
                      cursor: 'pointer'
                    }}
                  />
                </a>
              </Tooltip>
            )
          }
        </BlobProvider>
      </Stack>
    </Stack>
  );
}

export default TableActions;
