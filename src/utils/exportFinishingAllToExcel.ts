import ExcelJS from 'exceljs';

interface FinishingAllExportData {
    line: string;
    wo: string;
    style: string;
    item: string;
    buyer: string;
    totalFinishing: number;
    dryroomWaiting: number;
    dryroomCheckIn: number;
    dryroomCheckOut: number;
    foldingWaiting: number;
    foldingCheckIn: number;
    foldingCheckOut: number;
    balance: number;
}

export async function exportFinishingAllToExcel(
    data: FinishingAllExportData[],
    format: 'excel' | 'csv' = 'excel',
    filterDateFrom?: string,
    filterDateTo?: string
) {
    // Validasi data
    if (!data || data.length === 0) {
        throw new Error('Data tidak boleh kosong');
    }

    // Buat workbook baru
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Finishing All', {
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
            fgColor: { argb: 'FF4472C4' } // Blue
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };

    const subHeaderStyle = {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5B9BD5' } // Light Blue
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
        // Jika ada filter dari dan sampai tanggal
        const fromDate = new Date(filterDateFrom);
        const toDate = new Date(filterDateTo);
        const fromStr = `${fromDate.getDate()} ${monthNames[fromDate.getMonth()]} ${fromDate.getFullYear()}`;
        const toStr = `${toDate.getDate()} ${monthNames[toDate.getMonth()]} ${toDate.getFullYear()}`;
        tanggalStr = `${fromStr} - ${toStr}`;
    } else if (filterDateFrom) {
        // Jika hanya ada filter dari tanggal
        const fromDate = new Date(filterDateFrom);
        tanggalStr = `${fromDate.getDate()} ${monthNames[fromDate.getMonth()]} ${fromDate.getFullYear()}`;
    } else {
        // Jika tidak ada filter, gunakan tanggal hari ini
        const now = new Date();
        tanggalStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }
    
    // Title merge: A1 sampai Q1 (17 kolom)
    worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = `RFID TRACKING FINISHING REPORT DAILY - ${tanggalStr}`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 30;
    currentRow++;

    // ===== TABLE HEADER SECTION =====
    // Header Row 1: Main Headers
    const headerRow1 = currentRow;
    
    // Set column widths
    const colWidths = [15, 12, 12, 30, 30, 15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15];
    colWidths.forEach((width, idx) => {
        worksheet.getColumn(idx + 1).width = width;
    });

    // Main Headers
    const mainHeaders = [
        { col: 1, text: 'LINE' },
        { col: 2, text: 'WO' },
        { col: 3, text: 'Style' },
        { col: 4, text: 'Item' },
        { col: 5, text: 'Buyer' },
        { col: 6, text: 'Total Finishing' },
        { col: 7, text: 'Dryroom', mergeEnd: 9 }, // Merge G1-I1
        { col: 10, text: 'Folding', mergeEnd: 12 }, // Merge J1-L1
        { col: 13, text: 'BALANCE' }
    ];

    mainHeaders.forEach(({ col, text, mergeEnd }) => {
        const cell = worksheet.getCell(headerRow1, col);
        cell.value = text;
        Object.assign(cell, headerStyle);
        
        if (mergeEnd) {
            // Merge horizontal di baris 1 saja (untuk Dryroom dan Folding)
            worksheet.mergeCells(headerRow1, col, headerRow1, mergeEnd);
        }
    });

    currentRow++;

    // Header Row 2: Sub Headers (untuk Dryroom dan Folding)
    const headerRow2 = currentRow;
    const subHeaders = [
        { col: 7, text: 'Waiting' },   // Dryroom Waiting
        { col: 8, text: 'Check In' },  // Dryroom Check In
        { col: 9, text: 'Check Out' }, // Dryroom Check Out
        { col: 10, text: 'Waiting' },  // Folding Waiting
        { col: 11, text: 'Check In' },  // Folding Check In
        { col: 12, text: 'Check Out' }  // Folding Check Out
    ];

    subHeaders.forEach(({ col, text }) => {
        const cell = worksheet.getCell(headerRow2, col);
        cell.value = text;
        Object.assign(cell, subHeaderStyle);
    });

    // Merge vertical untuk kolom yang tidak memiliki sub-header
    // LINE (A1-A2)
    worksheet.mergeCells(headerRow1, 1, headerRow2, 1);
    // WO (B1-B2)
    worksheet.mergeCells(headerRow1, 2, headerRow2, 2);
    // Style (C1-C2)
    worksheet.mergeCells(headerRow1, 3, headerRow2, 3);
    // Item (D1-D2)
    worksheet.mergeCells(headerRow1, 4, headerRow2, 4);
    // Buyer (E1-E2)
    worksheet.mergeCells(headerRow1, 5, headerRow2, 5);
    // Total Finishing (F1-F2)
    worksheet.mergeCells(headerRow1, 6, headerRow2, 6);
    // BALANCE (M1-M2)
    worksheet.mergeCells(headerRow1, 13, headerRow2, 13);

    currentRow++;

    // ===== DATA ROWS =====
    data.forEach((rowData) => {
        const dataRow = currentRow;
        
        const dataValues = [
            rowData.line || '-',                    // Col 1 - LINE
            rowData.wo || '-',                      // Col 2 - WO
            rowData.style || '-',                   // Col 3 - Style
            rowData.item || '-',                    // Col 4 - Item
            rowData.buyer || '-',                   // Col 5 - Buyer
            rowData.totalFinishing || 0,            // Col 6 - Total Finishing
            rowData.dryroomWaiting || 0,             // Col 7 - Dryroom Waiting
            rowData.dryroomCheckIn || 0,            // Col 8 - Dryroom Check In
            rowData.dryroomCheckOut || 0,            // Col 9 - Dryroom Check Out
            rowData.foldingWaiting || 0,             // Col 10 - Folding Waiting
            rowData.foldingCheckIn || 0,             // Col 11 - Folding Check In
            rowData.foldingCheckOut || 0,            // Col 12 - Folding Check Out
            rowData.balance || 0                     // Col 13 - BALANCE
        ];

        dataValues.forEach((value, colIdx) => {
            const col = colIdx + 1;
            const cell = worksheet.getCell(dataRow, col);
            cell.value = value;
            Object.assign(cell, dataCellStyle);

            // Balance column - red if negative
            if (col === 13 && typeof value === 'number' && value < 0) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true, size: 11 };
            }
        });

        worksheet.getRow(dataRow).height = 30;
        currentRow++;
    });

    // Generate filename
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
    const filename = `RFID_Tracking_Finishing_All_${dateStr}.${format === 'excel' ? 'xlsx' : 'csv'}`;

    // Export
    if (format === 'excel') {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } else {
        // CSV export (simplified)
        let csvContent = 'LINE,WO,Style,Item,Buyer,Total Finishing,Dryroom Waiting,Dryroom Check In,Dryroom Check Out,Folding Waiting,Folding Check In,Folding Check Out,BALANCE\n';
        data.forEach((row) => {
            csvContent += `${row.line || '-'},${row.wo || '-'},${row.style || '-'},${row.item || '-'},${row.buyer || '-'},${row.totalFinishing || 0},${row.dryroomWaiting || 0},${row.dryroomCheckIn || 0},${row.dryroomCheckOut || 0},${row.foldingWaiting || 0},${row.foldingCheckIn || 0},${row.foldingCheckOut || 0},${row.balance || 0}\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}
