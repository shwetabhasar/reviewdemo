import { Tooltip } from '@mui/material';

interface SpanNowrapProps {
  children: React.ReactNode;
  charSize?: number | null;
  style?: React.CSSProperties; // Allow consumers to provide additional styles
}

function SpanNowrap({ children, charSize = null, style }: Readonly<SpanNowrapProps>) {
  const mergedStyles: React.CSSProperties = {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    ...style // Merge consumer-provided styles
  };
  const origText = children?.toString();
  let truncatedText = children?.toString();

  if (charSize !== null && truncatedText && origText) {
    truncatedText = truncatedText.substring(0, charSize);
    truncatedText += origText.length > charSize ? '...' : '';
  }

  return (
    <Tooltip title={children}>
      <span style={mergedStyles}>{truncatedText}</span>
    </Tooltip>
  );
}

export default SpanNowrap;
