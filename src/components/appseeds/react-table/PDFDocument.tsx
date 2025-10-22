import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 30
  },
  header: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center'
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableColHeader: {
    flex: 1,
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#ADD8E6' // Light blue background for header
  },
  tableCol: {
    flex: 1,
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10, // Smaller font size for header
    fontWeight: 'bold'
  },
  tableCell: {
    margin: 5,
    fontSize: 10
  }
});

interface PDFDocumentProps {
  data: any[];
  columns: string[];
}

const PDFDocument: React.FC<PDFDocumentProps> = ({ data, columns }) => (
  <Document>
    <Page style={styles.page}>
      <Text style={styles.header}>Owner List</Text>
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableRow}>
          {columns.map((col, index) => (
            <View key={index} style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>{col.toUpperCase().replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
        {/* Table Rows */}
        {data.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tableRow}>
            {columns.map((col, colIndex) => (
              <View key={colIndex} style={styles.tableCol}>
                <Text style={styles.tableCell}>{row[col]}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default PDFDocument;
