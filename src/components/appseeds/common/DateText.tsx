import moment from 'moment';

interface Props {
  readonly value: any;
}

function DateText({ value }: Props) {
  const dateFormatted = value ? moment(value).format('DD MMM YYYY') : '';

  return <div style={{ whiteSpace: 'nowrap' }}>{dateFormatted}</div>;
}

export default DateText;
