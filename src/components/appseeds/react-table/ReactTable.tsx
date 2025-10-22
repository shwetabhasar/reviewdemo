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
import { Table, TableBody, TableCell, TableHead, TableRow, Stack, Box, Divider, TableSortLabel } from '@mui/material';
import TableActions from './TableActions';
import ScrollX from 'components/appseeds/ScrollX';
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
  readonly customActionButtons?: ReactNode; // Add this line
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
  customActionButtons // Add this parameter
}: ReactTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const fuzzyFilter: FilterFn<T> = (row, columnId, value, addMeta) => {
    // rank the item
    const itemRank = rankItem(row.getValue(columnId), value);

    // store the ranking info
    addMeta(itemRank);

    // return if the item should be filtered in/out
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
          height: '100%', // Changed from minHeight/maxHeight
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          // Remove any margin or padding
          m: 0,
          '& .MuiCardContent-root': {
            p: 0
          }
        }}
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
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
            onIdChange={() => {
              setIsIdVisible((prev) => !prev);
            }}
            onAuditChange={() => {
              setIsAuditColumnVisible((prev) => !prev);
            }}
            customActionButtons={customActionButtons} // Pass custom buttons to TableActions
          ></TableActions>
          <Box sx={{ marginBottom: '-20' }}>
            <ScrollX sx={{ minHeight: '66vh', maxHeight: '66vh', overflowY: 'auto' }}>
              <TableWrapper>
                <Table stickyHeader size="small">
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup: HeaderGroup<any>) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const isSortable = header.column.getCanSort();
                          const isRight = header.column.columnDef.meta?.className?.includes('cell-right');
                          const isLeft = header.column.columnDef.meta?.className?.includes('cell-left');
                          const alignmentClass = isRight
                            ? 'table-sort-label-right'
                            : isLeft
                              ? 'table-sort-label-left'
                              : 'table-sort-label-center';
                          const alignAttribute = isRight ? 'right' : isLeft ? 'left' : 'center';
                          return (
                            <TableCell
                              style={{ whiteSpace: 'nowrap' }}
                              sx={{
                                position: 'sticky !important',
                                padding: '1px 6px',
                                fontSize: '13px'
                              }}
                              sortDirection={header.column.getIsSorted() as 'asc' | 'desc' | false}
                              key={header.id}
                              align={alignAttribute}
                              className={alignmentClass}
                            >
                              {header.isPlaceholder ? null : (
                                <Box>
                                  {isSortable ? (
                                    <TableSortLabel
                                      active={header.column.getIsSorted() !== false}
                                      direction={(header.column.getIsSorted() as SortDirection) || 'asc'}
                                      onClick={() => header.column.toggleSorting()}
                                      className={`table-sort-label ${alignmentClass}`}
                                      hideSortIcon={false}
                                    >
                                      {flexRender(header.column.columnDef.header, header.getContext())}
                                      {header.column.getIsSorted() ? (
                                        <Box component="span" sx={visuallyHidden}>
                                          {header.column.getIsSorted() === 'desc' ? 'sorted descending' : 'sorted ascending'}
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
                          {row.getVisibleCells().map((cell) => {
                            return (
                              <TableCell
                                sx={{
                                  padding: '1px 6px',
                                  fontSize: '14px'
                                }}
                                key={cell.id}
                                {...cell.column.columnDef.meta}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            );
                          })}
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
            </ScrollX>
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
