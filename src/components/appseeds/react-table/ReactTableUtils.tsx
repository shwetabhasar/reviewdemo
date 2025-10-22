import { MouseEvent } from 'react';
import { ColumnDef } from '@tanstack/table-core';
import DateText from 'components/appseeds/common/DateText';
import SpanNowrap from 'components/appseeds/SpanNowrap';
import { IndeterminateCheckbox } from 'components/appseeds/react-table';
import ReactTableActionButtons from 'components/appseeds/react-table/ReactTableActionButtons';
import { useNavigate } from 'react-router';

export const alignContent = (value: string | number) => {
  const textAlign = typeof value === 'number' ? 'center' : 'right';
  return <SpanNowrap style={{ textAlign }}>{value}</SpanNowrap>;
};

export function getSelectAndIdColumns<T>(): ColumnDef<T>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <IndeterminateCheckbox
          {...{
            checked: table.getIsAllRowsSelected(),
            indeterminate: table.getIsSomeRowsSelected(),
            onChange: table.getToggleAllRowsSelectedHandler()
          }}
        />
      ),
      cell: ({ row }) => (
        <IndeterminateCheckbox
          {...{
            checked: row.getIsSelected(),
            disabled: !row.getCanSelect(),
            indeterminate: row.getIsSomeSelected(),
            onChange: row.getToggleSelectedHandler()
          }}
        />
      ),
      size: 50
    }
  ];
}

export const renderDateCell = (value: any) => <DateText value={value} />;

export const renderBalanceCell = (balanceAmount: number) => (
  <div style={{ color: balanceAmount < 0 ? 'red' : 'green' }}>{balanceAmount}</div>
);

export const renderActionButtonsCell = () => {
  return (
    <ReactTableActionButtons
      isEditVisible={true}
      isDeleteVisible={true}
      onEditClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
      }}
      onDeleteClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
      }}
    />
  );
};

export const renderBSpanNoWrap = (value: any) => {
  return <SpanNowrap>{value}</SpanNowrap>;
};

export const renderGSTNumberCell = (value: string) => {
  return (
    <div>
      <span style={{ fontWeight: 'bold' }}>{value.substring(0, 2)}</span>
      <span>{value.substring(2)}</span>
    </div>
  );
};

interface Props {
  readonly row: any;
  readonly handleClose: () => void;
  readonly setDeleteId: (id: any) => void;
  readonly setDeleteName: (name: string) => void;
  readonly editRoute: string;
  readonly viewRoute?: string;
  readonly isViewVisible?: boolean;
  readonly isEditVisible?: boolean;
  readonly isDeleteVisible?: boolean;
}
export const ActionsButtonCell = ({
  row,
  handleClose,
  setDeleteId,
  setDeleteName,
  editRoute,
  viewRoute,
  isViewVisible,
  isEditVisible,
  isDeleteVisible
}: Props) => {
  const navigation = useNavigate();

  const handleEditClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigation(`${editRoute}${row.original.id}`);
  };

  const handleViewClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigation(`${viewRoute}${row.original.id}`);
  };

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setDeleteId(row.original.id);
    setDeleteName(row.original.name);
    handleClose();
  };

  return (
    <ReactTableActionButtons
      isViewVisible={isViewVisible} // or true if you have a view action
      isEditVisible={isEditVisible}
      isDeleteVisible={isDeleteVisible}
      onViewClick={handleViewClick}
      onEditClick={handleEditClick}
      onDeleteClick={handleDeleteClick}
    />
  );
};
