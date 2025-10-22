import {
  ColumnDef,
  ColumnFiltersState,
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
  getPaginationRowModel
} from '@tanstack/react-table';
import { useState } from 'react';
import { rankItem } from '@tanstack/match-sorter-utils';
import { LabelKeyObject } from 'react-csv/lib/core';
import { DebouncedInput, EmptyTable, HeaderSort, RowSelection } from 'components/appseeds/react-table';

import MainCard from 'components/appseeds/MainCard';
import { Table, TableBody, TableCell, TableHead, TableRow, Stack, Box, Divider } from '@mui/material';
import ScrollX from 'components/appseeds/ScrollX';
import { TableWrapper } from './TableWrapper';

interface ReactEmptyTableProps<T> {
  readonly columns: ColumnDef<T>[];
  readonly data: T[];
}
function ReactEmptyTable<T>({ columns, data }: ReactEmptyTableProps<T>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

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
      columnFilters,
      rowSelection,
      globalFilter
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (value) => setRowSelection(value),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: fuzzyFilter
  });
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
      <MainCard content={false}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ padding: 3, paddingBottom: 0 }}>
            <DebouncedInput
              value={globalFilter ?? ''}
              onFilterChange={(value) => setGlobalFilter(String(value))}
              placeholder={`Search ${data?.length} records...`}
            />
          </Stack>
          <Box sx={{ marginBottom: '-10px' }}>
            <ScrollX sx={{ minHeight: '50vh', maxHeight: '50vh', overflowY: 'auto' }}>
              <TableWrapper>
                <Table stickyHeader size="small">
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup: HeaderGroup<any>) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableCell
                            style={{ whiteSpace: 'nowrap' }}
                            sx={{ position: 'sticky !important' }}
                            key={header.id}
                            {...header.column.columnDef.meta}
                            onClick={header.column.getToggleSortingHandler()}
                            {...(header.column.getCanSort() &&
                              header.column.columnDef.meta === undefined && {
                                className: 'cursor-pointer prevent-select'
                              })}
                          >
                            {header.isPlaceholder ? null : (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box>{flexRender(header.column.columnDef.header, header.getContext())}</Box>
                                {header.column.getCanSort() && <HeaderSort column={header.column} />}
                              </Stack>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableHead>
                  <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} {...cell.column.columnDef.meta}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={table.getAllColumns().length}>
                          <EmptyTable msg="Data is loading..." isLoading={true} />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableWrapper>
            </ScrollX>
            <Divider />
          </Box>
        </Stack>
      </MainCard>
    </>
  );
}

export default ReactEmptyTable;
