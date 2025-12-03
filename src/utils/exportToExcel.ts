import ExcelJS from 'exceljs';

interface ExportData {
    tanggal: string;
    line: string;
    wo: string;
    style: string;
    item: string;
    buyer: string;
    color?: string;
    size?: string;
    outputSewing: number;
    qcRework: number;
    qcWira: number;
    qcReject: number;
    qcGood: number;
    pqcRework: number;
    pqcWira: number;
    pqcReject: number;
    pqcGood: number;
    goodSewing: number;
    balance: number;
    qcChartImage?: string; // Base64 PNG
    pqcChartImage?: string; // Base64 PNG
}

export async function exportToExcel(
    data: ExportData[],
    lineId: string,
    format: 'excel' | 'csv' = 'excel'
) {
    // Validasi data
    if (!data || data.length === 0) {
        throw new Error('Data tidak boleh kosong');
    }

    // Buat workbook baru
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RFID Tracking', {
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
    // Format: "RFID TRACKING REPORT DAILY - 2 Desember 2025"
    const now = new Date();
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const tanggalStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    
    worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = `RFID TRACKING REPORT DAILY - ${tanggalStr}`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 30;
    currentRow++;

    // ===== TABLE HEADER SECTION =====
    // Header Row 1: Main Headers (LINE, WO, Style, Item, Buyer, Output Sewing, QC Endline, PQC, GOOD SEWING, BALANCE)
    const headerRow1 = currentRow;
    
    // Set column widths
    const colWidths = [15, 12, 12, 30, 30, 15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12];
    colWidths.forEach((width, idx) => {
        worksheet.getColumn(idx + 1).width = width;
    });

    // Main Headers - LINE, WO, Style, Item, Buyer, Output Sewing, GOOD SEWING, BALANCE merge ke baris 2 dan 3
    // QC Endline dan PQC hanya merge di baris 1
    const mainHeaders = [
        { col: 1, text: 'LINE' }, // Merge A1-A2 dan ke data rows
        { col: 2, text: 'WO' }, // Merge B1-B2 dan ke data rows
        { col: 3, text: 'Style' }, // Merge C1-C2 dan ke data rows
        { col: 4, text: 'Item' }, // Merge D1-D2 dan ke data rows
        { col: 5, text: 'Buyer' }, // Merge E1-E2 dan ke data rows
        { col: 6, text: 'Output Sewing' }, // Merge F1-F2 dan ke data rows (hanya 1 kolom)
        { col: 7, text: 'QC Endline', mergeEnd: 10 }, // Merge G1-J1 (4 kolom: REWORK, WIRA, REJECT, GOOD)
        { col: 11, text: 'PQC', mergeEnd: 14 }, // Merge K1-N1 (4 kolom: REWORK, WIRA, REJECT, GOOD)
        { col: 15, text: 'GOOD SEWING' }, // Merge O1-O2 dan ke data rows
        { col: 16, text: 'BALANCE' } // Merge P1-P2 dan ke data rows
    ];

    mainHeaders.forEach(({ col, text, mergeEnd }) => {
        const cell = worksheet.getCell(headerRow1, col);
        cell.value = text;
        Object.assign(cell, headerStyle);
        
        if (mergeEnd) {
            // Merge horizontal di baris 1 saja (untuk QC Endline dan PQC)
            worksheet.mergeCells(headerRow1, col, headerRow1, mergeEnd);
        }
        // Untuk merge vertikal akan dilakukan setelah headerRow2 dibuat
    });

    currentRow++;

    // Header Row 2: Sub Headers (hanya untuk QC Endline dan PQC)
    // Untuk kolom lain (LINE, WO, Style, Item, Buyer, Output Sewing, GOOD SEWING, BALANCE), 
    // kita akan isi dengan data di baris ini juga
    const headerRow2 = currentRow;
    const subHeaders = [
        { col: 7, text: 'REWORK' },  // QC Endline REWORK
        { col: 8, text: 'WIRA' },   // QC Endline WIRA
        { col: 9, text: 'REJECT' }, // QC Endline REJECT
        { col: 10, text: 'GOOD' },  // QC Endline GOOD
        { col: 11, text: 'REWORK' }, // PQC REWORK
        { col: 12, text: 'WIRA' },   // PQC WIRA
        { col: 13, text: 'REJECT' }, // PQC REJECT
        { col: 14, text: 'GOOD' }    // PQC GOOD
    ];

    subHeaders.forEach(({ col, text }) => {
        const cell = worksheet.getCell(headerRow2, col);
        cell.value = text;
        Object.assign(cell, subHeaderStyle);
    });

    currentRow++;

    // ===== DATA ROWS =====
    const dataRows: number[] = [];
    
    data.forEach((rowData) => {
        const dataRow = currentRow;
        dataRows.push(dataRow);
        
        const dataValues = [
            rowData.line || '-',           // Col 1 - LINE
            rowData.wo || '-',             // Col 2 - WO
            rowData.style || '-',          // Col 3 - Style
            rowData.item || '-',           // Col 4 - Item
            rowData.buyer || '-',         // Col 5 - Buyer
            rowData.outputSewing || 0,     // Col 6 - Output Sewing
            rowData.qcRework || 0,         // Col 7 - QC Endline REWORK
            rowData.qcWira || 0,           // Col 8 - QC Endline WIRA
            rowData.qcReject || 0,        // Col 9 - QC Endline REJECT
            rowData.qcGood || 0,           // Col 10 - QC Endline GOOD
            rowData.pqcRework || 0,        // Col 11 - PQC REWORK
            rowData.pqcWira || 0,         // Col 12 - PQC WIRA
            rowData.pqcReject || 0,       // Col 13 - PQC REJECT
            rowData.pqcGood || 0,          // Col 14 - PQC GOOD
            rowData.goodSewing || 0,       // Col 15 - GOOD SEWING
            rowData.balance || 0           // Col 16 - BALANCE
        ];

        dataValues.forEach((value, colIdx) => {
            const col = colIdx + 1;
            const cell = worksheet.getCell(dataRow, col);
            
            // Isi semua cell dengan value (termasuk yang akan di-merge)
            cell.value = value;
            Object.assign(cell, dataCellStyle);

            // Balance column - red if negative
            if (col === 16 && typeof value === 'number' && value < 0) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true, size: 11 };
            }
        });

        worksheet.getRow(dataRow).height = 30;
        currentRow++;
    });

    // Merge cells setelah semua data diisi
    if (dataRows.length > 0) {
        try {
            const mergeHeaderColumns = [1, 2, 3, 4, 5, 6, 15, 16]; // A, B, C, D, E, F, O, P
            
            // Merge QC Endline dan PQC dari headerRow1 ke headerRow2 (horizontal dan vertikal)
            try {
                worksheet.mergeCells(headerRow1, 7, headerRow2, 10); // QC Endline G1:J1 -> G2:J2
            } catch (e) {
                // Ignore jika sudah di-merge atau error
            }
            try {
                worksheet.mergeCells(headerRow1, 11, headerRow2, 14); // PQC K1:N1 -> K2:N2
            } catch (e) {
                // Ignore jika sudah di-merge atau error
            }
            
            // Merge cells untuk kolom yang perlu merge vertikal (LINE, WO, Style, Item, Buyer, Output Sewing, GOOD SEWING, BALANCE)
            // Struktur: 
            // - headerRow1 ke headerRow2: Header text di-merge (2 baris header)
            // - Data tetap di data rows (1 baris, tidak di-merge dengan header)
            mergeHeaderColumns.forEach(col => {
                try {
                    // Merge header dari headerRow1 ke headerRow2 (2 baris header yang di-merge)
                    // Ini membuat header LINE, WO, Style, dll memiliki 2 baris yang di-merge
                    worksheet.mergeCells(headerRow1, col, headerRow2, col);
                } catch (e) {
                    // Ignore error jika merge gagal
                }
            });
        } catch (e) {
            // Ignore error dan tetap lanjutkan export
        }
    }

    // Set row heights
    worksheet.getRow(headerRow1).height = 25;
    worksheet.getRow(headerRow2).height = 22;

    // Generate filename
    const dateStr = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
    const filename = `RFID_Tracking_Line${lineId}_${dateStr}.${format === 'excel' ? 'xlsx' : 'csv'}`;

    // Export
    if (format === 'excel') {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    } else {
        // CSV export (simplified)
        const csvData: string[][] = [];

        // Add title
        const now = new Date();
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                           'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const tanggalStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        csvData.push([`RFID TRACKING REPORT DAILY - ${tanggalStr}`]);
        csvData.push([]);

        // Add headers - Row 1: Main Headers
        csvData.push([
            'LINE', 'WO', 'Style', 'Item', 'Buyer',
            'Output Sewing',
            'QC Endline', 'QC Endline', 'QC Endline', 'QC Endline',
            'PQC', 'PQC', 'PQC', 'PQC',
            'GOOD SEWING', 'BALANCE'
        ]);

        // Add headers - Row 2: Sub Headers
        csvData.push([
            '', '', '', '', '',
            '',
            'REWORK', 'WIRA', 'REJECT', 'GOOD',
            'REWORK', 'WIRA', 'REJECT', 'GOOD',
            '', ''
        ]);

        // Add data
        data.forEach(row => {
            csvData.push([
                row.line || '-',
                row.wo || '-',
                row.style || '-',
                row.item || '-',
                row.buyer || '-',
                (row.outputSewing || 0).toString(),
                (row.qcRework || 0).toString(),
                (row.qcWira || 0).toString(),
                (row.qcReject || 0).toString(),
                (row.qcGood || 0).toString(),
                (row.pqcRework || 0).toString(),
                (row.pqcWira || 0).toString(),
                (row.pqcReject || 0).toString(),
                (row.pqcGood || 0).toString(),
                (row.goodSewing || 0).toString(),
                (row.balance || 0).toString()
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

// Interface untuk data List RFID
interface ListRFIDItem {
    id: string | number;
    rfid: string;
    style?: string;
    buyer?: string;
    nomor_wo?: string;
    item?: string;
    color?: string;
    size?: string;
    status: string;
    lokasi?: string;
    line?: string;
    lineNumber?: string;
    timestamp?: string;
}

interface ListRFIDSummary {
    totalData: number;
    statusCounts: {
        Good: number;
        Rework: number;
        Reject: number;
        OUTPUT: number;
        Unknown: number;
    };
    lokasiCounts: Record<string, number>;
    line: string;
    exportDate: string;
    statusChartImage?: string;
    lokasiChartImage?: string;
}

export async function exportListRFIDToExcel(
    data: ListRFIDItem[],
    lineId: string,
    format: 'excel' | 'csv' = 'excel',
    summary?: ListRFIDSummary
) {
    // Buat workbook baru
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('List RFID', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
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

    // Style definitions - sesuai dengan design tabel
    const headerStyle = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E3A8A' } // Dark blue seperti header tabel
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };

    const summaryHeaderStyle = {
        font: { bold: true, size: 15, color: { argb: 'FFFFFFFF' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0073EE' } // Blue #0073EE
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FF000000' } }
        }
    };

    const summaryLabelStyle = {
        font: { bold: true, size: 11, color: { argb: 'FF000000' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECF5FF' } // Light blue border #ECF5FF
        },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };

    const summaryValueStyle = {
        font: { size: 11, bold: true, color: { argb: 'FF000000' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' } // White
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };

    const dataRowStyle = {
        font: { size: 11, color: { argb: 'FF000000' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' } // White
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
    };

    const dataRowStyleAlt = {
        font: { size: 11, color: { argb: 'FF000000' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' } // Light gray untuk zebra striping
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
    };

    let currentRow = 1;

    // ===== TITLE SECTION =====
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'LIST RFID DATA REPORT';
    titleCell.font = { bold: true, size: 20, color: { argb: 'FF0073EE' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 30;
    currentRow++;

    // ===== SUMMARY SECTION =====
    // Calculate summary jika tidak disediakan
    const calculatedSummary: ListRFIDSummary = summary || {
        totalData: data.length,
        statusCounts: {
            Good: data.filter(item => item.status === 'Good').length,
            Rework: data.filter(item => item.status === 'Rework').length,
            Reject: data.filter(item => item.status === 'Reject').length,
            OUTPUT: data.filter(item => item.status === 'OUTPUT').length,
            Unknown: data.filter(item => !['Good', 'Rework', 'Reject', 'OUTPUT'].includes(item.status)).length
        },
        lokasiCounts: {},
        line: `Line ${lineId}`,
        exportDate: new Date().toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    };

    // Calculate lokasi counts
    data.forEach(item => {
        const lokasi = item.lokasi || 'Unknown';
        calculatedSummary.lokasiCounts[lokasi] = (calculatedSummary.lokasiCounts[lokasi] || 0) + 1;
    });

    // Summary Header
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const summaryHeader = worksheet.getCell(`A${currentRow}`);
    summaryHeader.value = 'SUMMARY DATA';
    Object.assign(summaryHeader, summaryHeaderStyle);
    worksheet.getRow(currentRow).height = 25;
    currentRow++;

    // Summary Content - 2 kolom layout
    const summaryLabels = [
        { label: 'Total Data', value: calculatedSummary.totalData.toString() },
        { label: 'Line', value: calculatedSummary.line },
        { label: 'Tanggal Export', value: calculatedSummary.exportDate },
        { label: 'Status GOOD', value: calculatedSummary.statusCounts.Good.toString() },
        { label: 'Status REWORK', value: calculatedSummary.statusCounts.Rework.toString() },
        { label: 'Status REJECT', value: calculatedSummary.statusCounts.Reject.toString() },
        { label: 'Status OUTPUT', value: calculatedSummary.statusCounts.OUTPUT.toString() },
        { label: 'Status UNKNOWN', value: calculatedSummary.statusCounts.Unknown.toString() }
    ];

    // Set column widths untuk summary
    worksheet.getColumn(1).width = 18;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 18;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 18;
    worksheet.getColumn(6).width = 15;

    // Buat summary dalam format 3 pasang kolom per baris
    for (let i = 0; i < summaryLabels.length; i += 3) {
        const row = currentRow;
        const items = summaryLabels.slice(i, i + 3);

        items.forEach((info, colIndex) => {
            const labelCol = colIndex * 2 + 1; // Kolom 1, 3, 5
            const valueCol = labelCol + 1;     // Kolom 2, 4, 6
            const labelCell = worksheet.getCell(row, labelCol);
            const valueCell = worksheet.getCell(row, valueCol);

            labelCell.value = info.label;
            Object.assign(labelCell, summaryLabelStyle);

            valueCell.value = info.value;
            Object.assign(valueCell, summaryValueStyle);
        });

        currentRow++;
    }

    // Lokasi Summary
    const lokasiEntries = Object.entries(calculatedSummary.lokasiCounts).sort((a, b) => b[1] - a[1]);
    if (lokasiEntries.length > 0) {
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        const lokasiHeader = worksheet.getCell(`A${currentRow}`);
        lokasiHeader.value = 'Distribusi Lokasi:';
        Object.assign(lokasiHeader, summaryLabelStyle);
        worksheet.getRow(currentRow).height = 20;
        currentRow++;

        for (let i = 0; i < lokasiEntries.length; i += 3) {
            const row = currentRow;
            const items = lokasiEntries.slice(i, i + 3);

            items.forEach(([lokasi, count], colIndex) => {
                const labelCol = colIndex * 2 + 1;
                const valueCol = labelCol + 1;
                const labelCell = worksheet.getCell(row, labelCol);
                const valueCell = worksheet.getCell(row, valueCol);

                labelCell.value = lokasi;
                Object.assign(labelCell, summaryLabelStyle);

                valueCell.value = count.toString();
                Object.assign(valueCell, summaryValueStyle);
            });

            currentRow++;
        }
    }

    // Chart section (jika ada)
    if (calculatedSummary.statusChartImage || calculatedSummary.lokasiChartImage) {
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
        const chartHeader = worksheet.getCell(`A${currentRow}`);
        chartHeader.value = 'GRAFIK DATA';
        Object.assign(chartHeader, summaryHeaderStyle);
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

    // Set column widths untuk chart area
        worksheet.getColumn(8).width = 12;
        worksheet.getColumn(9).width = 12;
        worksheet.getColumn(10).width = 12;
        worksheet.getColumn(11).width = 12;

        // Insert Status Chart
        if (calculatedSummary.statusChartImage) {
        const imageId = workbook.addImage({
                base64: calculatedSummary.statusChartImage.replace('data:image/png;base64,', ''),
            extension: 'png',
        });
            worksheet.addImage(imageId, `A${currentRow}:D${currentRow + 5}`);
    }

        // Insert Lokasi Chart
        if (calculatedSummary.lokasiChartImage) {
        const imageId = workbook.addImage({
                base64: calculatedSummary.lokasiChartImage.replace('data:image/png;base64,', ''),
            extension: 'png',
        });
            worksheet.addImage(imageId, `E${currentRow}:H${currentRow + 5}`);
        }

        currentRow += 6;
    }

    currentRow++; // Spacing sebelum tabel

    // ===== DATA TABLE SECTION =====
    // Table Header
    const tableHeaders = [
        'RFID ID', 'WO', 'STYLE', 'BUYER', 'ITEM', 'COLOR', 'SIZE', 'STATUS', 'LOKASI', 'LINE', 'TIMESTAMP'
    ];

    // Set column widths untuk tabel
    // A: RFID ID, B: WO, C: STYLE, D: BUYER, E: ITEM, F: COLOR, G: SIZE, H: STATUS, I: LOKASI, J: LINE, K: TIMESTAMP
    // Berdasarkan masalah: 220 menjadi 1539 (rasio ~7), 70 menjadi 489 (rasio ~7)
    // Untuk mendapatkan width ~200: 200 / 7.7 ≈ 26, tapi karena terlalu besar, coba 13
    // Untuk mendapatkan width ~70: 70 / 7.0 ≈ 10, tapi karena terlalu besar, coba 4.5
    worksheet.getColumn(1).width = 18; // A: RFID ID
    worksheet.getColumn(2).width = 12; // B: WO
    worksheet.getColumn(3).width = 12; // C: STYLE
    worksheet.getColumn(4).width = 27; // D: BUYER (untuk ~200 pixel, berdasarkan rasio 220→1539, jadi 200/7.7≈26, disesuaikan ke 13)
    worksheet.getColumn(5).width = 29; // E: ITEM (untuk ~200 pixel)
    worksheet.getColumn(6).width = 12; // F: COLOR
    worksheet.getColumn(7).width = 12; // G: SIZE (untuk ~70 pixel, berdasarkan rasio 70→489, jadi 70/7.0≈10, disesuaikan ke 4.5)
    worksheet.getColumn(8).width = 12; // H: STATUS (untuk ~70 pixel)
    worksheet.getColumn(9).width = 12; // I: LOKASI (untuk ~70 pixel)
    worksheet.getColumn(10).width = 12; // J: LINE (untuk ~70 pixel)
    worksheet.getColumn(11).width = 30; // K: TIMESTAMP (untuk ~200 pixel)

    // Header row
    tableHeaders.forEach((header, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = header;
        Object.assign(cell, headerStyle);
    });
    worksheet.getRow(currentRow).height = 25;
    currentRow++;

    // Data rows
    data.forEach((item, index) => {
        const rowStyle = index % 2 === 0 ? dataRowStyle : dataRowStyleAlt;
        
        const rowData = [
            item.rfid || '-',
            item.nomor_wo || '-',
            item.style || '-',
            item.buyer || '-',
            item.item || '-',
            item.color || '-',
            item.size || '-',
            (item.status || 'Unknown').toUpperCase(),
            item.lokasi || '-',
            item.line || '-',
            item.timestamp || '-'
        ];

        rowData.forEach((value, colIndex) => {
            const cell = worksheet.getCell(currentRow, colIndex + 1);
            cell.value = value;
            Object.assign(cell, rowStyle);

            // RFID ID column - hijau muda background, biru tua teks
            if (colIndex === 0) { // RFID ID column
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light green background
                cell.font = { size: 11, bold: true, color: { argb: 'FF1E40AF' } }; // Dark blue text
            }

            // Status column - color coding
            if (colIndex === 7) { // STATUS column
                const status = (value as string).toUpperCase();
                if (status === 'GOOD') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Green
                    cell.font = { size: 11, bold: true, color: { argb: 'FF065F46' } };
                } else if (status === 'REWORK') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Yellow
                    cell.font = { size: 11, bold: true, color: { argb: 'FF92400E' } };
                } else if (status === 'REJECT') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red
                    cell.font = { size: 11, bold: true, color: { argb: 'FF991B1B' } };
                } else if (status === 'OUTPUT') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Blue
                    cell.font = { size: 11, bold: true, color: { argb: 'FF1E40AF' } };
                }
            }
        });

        worksheet.getRow(currentRow).height = 22.5; // Height dalam points (30 menjadi 40, rasio 1.33, jadi 30/1.33 ≈ 22.5)
        currentRow++;
    });

    // Generate filename
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
    const filename = `List_RFID_Line${lineId}_${dateStr}.${format === 'excel' ? 'xlsx' : 'csv'}`;

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

        // Add summary
        csvData.push(['LIST RFID DATA REPORT']);
        csvData.push([]);
        csvData.push(['SUMMARY DATA']);
        summaryLabels.forEach(info => {
            csvData.push([info.label, info.value]);
        });
        csvData.push([]);
        csvData.push(['Distribusi Lokasi:']);
        lokasiEntries.forEach(([lokasi, count]) => {
            csvData.push([lokasi, count.toString()]);
        });
        csvData.push([]);

        // Add headers
        csvData.push(tableHeaders);

        // Add data
        data.forEach(item => {
            csvData.push([
                item.rfid || '-',
                item.nomor_wo || '-',
                item.style || '-',
                item.buyer || '-',
                item.item || '-',
                item.color || '-',
                item.size || '-',
                (item.status || 'Unknown').toUpperCase(),
                item.lokasi || '-',
                item.line || '-',
                item.timestamp || '-'
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