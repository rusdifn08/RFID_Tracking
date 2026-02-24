import ExcelJS from 'exceljs';

interface FinishingExportData {
  line: string;
  wo: string;
  style?: string;
  item: string;
  buyer?: string;
  waiting: number;
  checkIn: number;
  checkOut: number;
}

export async function exportFinishingToExcel(
  data: FinishingExportData[],
  type: 'dryroom' | 'folding' | 'all',
  format: 'excel' | 'csv' = 'excel',
  filterDateFrom?: string,
  filterDateTo?: string
) {
  if (!data || data.length === 0) {
    throw new Error('Data tidak boleh kosong');
  }

  const workbook = new ExcelJS.Workbook();
  const sheetName = type === 'dryroom' ? 'Dry Room' : type === 'folding' ? 'Folding' : 'Finishing';
  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  // Style definitions
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' } // Blue seperti gambar
    },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  };

  const dataCellStyle = {
    font: { size: 11, bold: true, color: { argb: 'FF000000' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' } // White
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    }
  };

  let currentRow = 1;

  // ===== TITLE SECTION =====
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                     'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  let tanggalStr = '';
  if (filterDateFrom && filterDateTo) {
    const fromDate = new Date(filterDateFrom);
    const toDate = new Date(filterDateTo);
    const fromStr = `${fromDate.getDate()} ${monthNames[fromDate.getMonth()]} ${fromDate.getFullYear()}`;
    const toStr = `${toDate.getDate()} ${monthNames[toDate.getMonth()]} ${toDate.getFullYear()}`;
    tanggalStr = `${fromStr} - ${toStr}`;
  } else if (filterDateFrom) {
    const fromDate = new Date(filterDateFrom);
    tanggalStr = `${fromDate.getDate()} ${monthNames[fromDate.getMonth()]} ${fromDate.getFullYear()}`;
  } else {
    const now = new Date();
    tanggalStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  const titleText = type === 'dryroom' 
    ? `RFID TRACKING Dry Room REPORT DAILY - ${tanggalStr}`
    : type === 'folding'
    ? `RFID TRACKING Folding REPORT DAILY - ${tanggalStr}`
    : `RFID TRACKING Finishing REPORT DAILY - ${tanggalStr}`;

  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = titleText;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  // ===== TABLE HEADER SECTION =====
  // Set column widths
  const colWidths = [15, 12, 12, 30, 30, 15, 15, 15, 12];
  colWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width;
  });

  // Headers sesuai gambar: LINE, WO, Style, Item, Buyer, Waiting Dry Room, Dry Room In, Dry Room Out, BALANCE
  const headers = type === 'dryroom' 
    ? ['LINE', 'WO', 'Style', 'Item', 'Buyer', 'Waiting Dry Room', 'Dry Room In', 'Dry Room Out', 'BALANCE']
    : type === 'folding'
    ? ['LINE', 'WO', 'Style', 'Item', 'Buyer', 'Waiting Folding', 'Folding In', 'Folding Out', 'BALANCE']
    : ['LINE', 'WO', 'Style', 'Item', 'Buyer', 'Waiting', 'Check In', 'Check Out', 'BALANCE'];

  headers.forEach((header, colIndex) => {
    const cell = worksheet.getCell(currentRow, colIndex + 1);
    cell.value = header;
    Object.assign(cell, headerStyle);
  });
  worksheet.getRow(currentRow).height = 25;
  currentRow++;

  // ===== DATA ROWS =====
  data.forEach((rowData) => {
    // Calculate balance: waiting + checkIn - checkOut
    const balance = (rowData.waiting || 0) + (rowData.checkIn || 0) - (rowData.checkOut || 0);

    const dataValues = [
      rowData.line || '-',
      rowData.wo || '-',
      rowData.style || '-',
      rowData.item || '-',
      rowData.buyer || '-',
      rowData.waiting || 0,
      rowData.checkIn || 0,
      rowData.checkOut || 0,
      balance
    ];

    dataValues.forEach((value, colIdx) => {
      const col = colIdx + 1;
      const cell = worksheet.getCell(currentRow, col);
      cell.value = value;
      Object.assign(cell, dataCellStyle);

      // Balance column - red if negative
      if (col === 9 && typeof value === 'number' && value < 0) {
        cell.font = { color: { argb: 'FFFF0000' }, bold: true, size: 11 };
      }
    });

    worksheet.getRow(currentRow).height = 30;
    currentRow++;
  });

  // Generate filename
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');
  const filename = `RFID_Tracking_${type === 'dryroom' ? 'DryRoom' : type === 'folding' ? 'Folding' : 'Finishing'}_${dateStr}.${format === 'excel' ? 'xlsx' : 'csv'}`;

  // Export
  if (format === 'excel') {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  } else {
    // CSV export
    const csvData: string[][] = [];
    csvData.push([titleText]);
    csvData.push([]);
    csvData.push(headers);
    data.forEach(row => {
      const balance = (row.waiting || 0) + (row.checkIn || 0) - (row.checkOut || 0);
      csvData.push([
        row.line || '-',
        row.wo || '-',
        row.style || '-',
        row.item || '-',
        row.buyer || '-',
        (row.waiting || 0).toString(),
        (row.checkIn || 0).toString(),
        (row.checkOut || 0).toString(),
        balance.toString()
      ]);
    });
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}
