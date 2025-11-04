import {
  ColumnDef,
  FilterFn,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
  getSortedRowModel,
  HeaderGroup,
  flexRender,
  getPaginationRowModel,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  SortDirection
} from '@tanstack/react-table';
import { useState, ReactNode } from 'react';
import { rankItem } from '@tanstack/match-sorter-utils';
import { LabelKeyObject } from 'react-csv/lib/core';
import { EmptyTable, RowSelection, TablePagination } from 'components/appseeds/react-table';
import 'components/appseeds/css/ReactTable.css';
import MainCard from 'components/appseeds/MainCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  Box,
  Divider,
  TableSortLabel
} from '@mui/material';
import TableActions from './TableActions';
import { TableWrapper } from './TableWrapper';
import { visuallyHidden } from '@mui/utils';

interface ReactTableProps<T> {
  readonly columns: ColumnDef<T>[];
  readonly data: T[];
  readonly exportColumns: string[];
  readonly isAddButtonVisible: boolean;
  readonly isAuditButtonDisable?: boolean;
  readonly addRoute?: string;
  readonly entityName?: string;
  readonly rowSelection: any;
  readonly onRowSelection: OnChangeFn<RowSelectionState>;
  readonly enablePagination?: boolean;
  readonly customActionButtons?: ReactNode;
}

function ReactTable<T>({
  columns,
  data,
  exportColumns,
  isAddButtonVisible,
  addRoute,
  entityName,
  rowSelection,
  onRowSelection,
  isAuditButtonDisable,
  enablePagination,
  customActionButtons
}: ReactTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const fuzzyFilter: FilterFn<T> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value);
    addMeta(itemRank);
    return itemRank.passed;
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      globalFilter,
      sorting
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: onRowSelection,
    onSortingChange: setSorting,
    ...(enablePagination && { getPaginationRowModel: getPaginationRowModel() }),
    globalFilterFn: fuzzyFilter
  });

  const [isIdVisible, setIsIdVisible] = useState(false);
  const [isAuditColumnVisible, setIsAuditColumnVisible] = useState(false);

  let headers: LabelKeyObject[] = [];
  table.getAllColumns().map((columns) =>
    headers.push({
      label: typeof columns.columnDef.header === 'string' ? columns.columnDef.header : '#',
      // @ts-ignore
      key: columns.columnDef.accessorKey
    })
  );

  return (
    <>
      <RowSelection selected={Object.keys(rowSelection).length} />
      <MainCard
  content={false}
  sx={{
    overflow: 'visible',
    m: 0,
    boxShadow: 'none',
    border: 'none',
    '& .MuiCardContent-root': {
      p: 0
    }
  }}
>

        <Stack spacing={2} sx={{ overflow: 'visible' }}>
          <TableActions
            columns={exportColumns}
            isIdChecked={isIdVisible}
            isAuditChecked={isAuditColumnVisible}
            globalFilter={globalFilter}
            isAuditButtonDisable={isAuditButtonDisable}
            data={data}
            table={table}
            isAddButtonVisible={isAddButtonVisible}
            addRoute={addRoute}
            addButtonLabel={`Add ${entityName}`}
            exportFilePrefix={`${entityName?.toLowerCase()}-list`}
            onFilterChange={(value) => setGlobalFilter(String(value))}
            onIdChange={() => setIsIdVisible((prev) => !prev)}
            onAuditChange={() => setIsAuditColumnVisible((prev) => !prev)}
            customActionButtons={customActionButtons}
          />

          {/* ✅ SINGLE SCROLLABLE CONTAINER */}
             <Box sx={{ overflow: 'visible' }}>
             <TableWrapper sx={{flex: 1,width: '100%',overflow: 'visible', // ✅ no internal scroll
              }}
              >
              <Table stickyHeader size="small">
                <TableHead>
                  {table.getHeaderGroups().map((headerGroup: HeaderGroup<any>) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const isSortable = header.column.getCanSort();
                        const alignmentClass = 'table-sort-label-left';
                        return (
                          <TableCell
                            key={header.id}
                            sortDirection={header.column.getIsSorted() as 'asc' | 'desc' | false}
                            sx={{
                              padding: '4px 8px',
                              fontSize: '13px',
                              whiteSpace: 'nowrap'
                            }}
                            className={alignmentClass}
                          >
                            {header.isPlaceholder ? null : (
                              <Box>
                                {isSortable ? (
                                  <TableSortLabel
                                    active={header.column.getIsSorted() !== false}
                                    direction={(header.column.getIsSorted() as SortDirection) || 'asc'}
                                    onClick={() => header.column.toggleSorting()}
                                    hideSortIcon={false}
                                  >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {header.column.getIsSorted() ? (
                                      <Box component="span" sx={visuallyHidden}>
                                        {header.column.getIsSorted() === 'desc'
                                          ? 'sorted descending'
                                          : 'sorted ascending'}
                                      </Box>
                                    ) : null}
                                  </TableSortLabel>
                                ) : (
                                  flexRender(header.column.columnDef.header, header.getContext())
                                )}
                              </Box>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHead>

                <TableBody>
                  {table.getRowModel().rows?.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            sx={{
                              padding: '4px 8px',
                              fontSize: '14px'
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns()?.length}>
                        <EmptyTable msg="No Data" isLoading={false} />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableWrapper>

            {enablePagination && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 1 }}>
                  <TablePagination
                    {...{
                      setPageSize: table.setPageSize,
                      setPageIndex: table.setPageIndex,
                      getState: table.getState,
                      getPageCount: table.getPageCount
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
        </Stack>
      </MainCard>
    </>
  );
}

export default ReactTable;
