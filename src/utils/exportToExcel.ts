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

    const infoHeaderStyle = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF70AD47' } // Green
        },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FF000000' } }
        }
    };

    const infoLabelStyle = {
        font: { size: 11, bold: true },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD8BFD8' } // Thistle/Light Purple (sesuai request: purple muda)
        },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };

    const infoCellStyle = {
        font: { size: 11 },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' } // White background untuk value
        },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };

    let currentRow = 1;

    // ===== HEADER SECTION =====
    const firstData = data[0] || {} as ExportData;

    // Title Row - sesuai gambar: C1-F1
    worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
    const titleCell = worksheet.getCell(`C${currentRow}`);
    titleCell.value = 'RFID TRACKING REPORT';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF4472C4' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Chart Titles - sesuai gambar: H1-J1 dan K1-M1
    worksheet.mergeCells(`H${currentRow}:J${currentRow}`);
    const qcChartTitle = worksheet.getCell(`H${currentRow}`);
    qcChartTitle.value = 'GRAFIK DATA QC';
    qcChartTitle.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    qcChartTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`K${currentRow}:M${currentRow}`);
    const pqcChartTitle = worksheet.getCell(`K${currentRow}`);
    pqcChartTitle.value = 'GRAFIK DATA PQC';
    pqcChartTitle.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    pqcChartTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    currentRow++;

    // ===== BAGIAN ATAS: DATA LINE INFORMATION =====
    // Data Line Information Section - Header (A3-F3 sesuai gambar)
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const infoHeader = worksheet.getCell(`A${currentRow}`);
    infoHeader.value = 'INFORMASI PRODUCTION LINE';
    Object.assign(infoHeader, infoHeaderStyle);
    currentRow++;

    // Info rows dalam format 2 kolom (Label | Value) dengan 3 pasang per baris
    // Sesuai gambar: Row 4-6 dengan format 2 kolom per item
    const infoLabels = [
        { label: 'Tanggal', value: firstData.tanggal || '-' },
        { label: 'LINE', value: firstData.line || '-' },
        { label: 'WO', value: firstData.wo || '-' },
        { label: 'Style', value: firstData.style || '-' },
        { label: 'Item', value: firstData.item || '-' },
        { label: 'Buyer', value: firstData.buyer || '-' },
        { label: 'Color', value: firstData.color || '-' },
        { label: 'Size', value: firstData.size || '-' }
    ];

    // Set column widths untuk info section
    worksheet.getColumn(1).width = 12; // Label width
    worksheet.getColumn(2).width = 18; // Value width
    worksheet.getColumn(3).width = 12;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(6).width = 18;

    // Buat info dalam format 3 pasang kolom per baris (sesuai gambar row 4-6)
    for (let i = 0; i < infoLabels.length; i += 3) {
        const row = currentRow;
        const items = infoLabels.slice(i, i + 3);

        items.forEach((info, colIndex) => {
            const labelCol = colIndex * 2 + 1; // Kolom 1, 3, 5
            const valueCol = labelCol + 1;     // Kolom 2, 4, 6
            const labelCell = worksheet.getCell(row, labelCol);
            const valueCell = worksheet.getCell(row, valueCol);

            labelCell.value = info.label;
            Object.assign(labelCell, infoLabelStyle); // Purple background untuk label

            valueCell.value = info.value;
            Object.assign(valueCell, infoCellStyle); // White background untuk value
        });

        currentRow++;
    }

    // ===== CHART DATA SECTION (IMAGES) =====
    // Set column widths untuk chart area
    worksheet.getColumn(8).width = 10;  // H
    worksheet.getColumn(9).width = 10;   // I
    worksheet.getColumn(10).width = 10;  // J
    worksheet.getColumn(11).width = 10;  // K
    worksheet.getColumn(12).width = 10;  // L
    worksheet.getColumn(13).width = 10;  // M

    // Insert QC Chart Image
    if (firstData.qcChartImage) {
        const imageId = workbook.addImage({
            base64: firstData.qcChartImage,
            extension: 'png',
        });
        worksheet.addImage(imageId, 'H2:J7');
    }

    // Insert PQC Chart Image
    if (firstData.pqcChartImage) {
        const imageId = workbook.addImage({
            base64: firstData.pqcChartImage,
            extension: 'png',
        });
        worksheet.addImage(imageId, 'K2:M7');
    }

    currentRow = 9; // Tabel tracking data mulai dari row 9 sesuai gambar

    // ===== BAGIAN BAWAH: TRACKING DATA TABLE =====
    // Sesuai gambar: Row 9-11 dengan struktur A-N

    const headerRow1 = currentRow; // Row 9
    const headerRow2 = currentRow + 1; // Row 10
    const dataRow = currentRow + 2; // Row 11

    // Set column widths untuk tabel (kolom A-N sesuai gambar)
    const colWidths = [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12];
    colWidths.forEach((width, idx) => {
        const colNum = idx + 1;
        worksheet.getColumn(colNum).width = width;
    });

    // Header Level 1 (Main Headers) - Row 9 sesuai gambar
    const mainHeaderCells = [
        { col: 1, text: 'Output', mergeEnd: 2 }, // A-B
        { col: 3, text: 'QC Endline', mergeEnd: 6 }, // C-F
        { col: 7, text: 'PQC', mergeEnd: 10 }, // G-J
        { col: 11, text: 'GOOD', mergeEnd: 12 }, // K-L
        { col: 13, text: 'BALANCE', mergeEnd: 14 } // M-N
    ];

    mainHeaderCells.forEach(({ col, text, mergeEnd }) => {
        const cell = worksheet.getCell(headerRow1, col);
        cell.value = text;
        Object.assign(cell, headerStyle);

        if (mergeEnd) {
            worksheet.mergeCells(headerRow1, col, headerRow1, mergeEnd);
        }
    });

    // Header Level 2 (Sub Headers) - Row 10 sesuai gambar
    const subHeaderCells = [
        { col: 1, text: 'Sewing' },
        { col: 2, text: '' },
        { col: 3, text: 'REWORK' },
        { col: 4, text: 'WIRA' },
        { col: 5, text: 'REJECT' },
        { col: 6, text: 'GOOD' },
        { col: 7, text: 'REWORK' },
        { col: 8, text: 'WIRA' },
        { col: 9, text: 'REJECT' },
        { col: 10, text: 'GOOD' },
        { col: 11, text: 'SEWING' },
        { col: 12, text: '' },
        { col: 13, text: '' },
        { col: 14, text: '' }
    ];

    subHeaderCells.forEach(({ col, text }) => {
        const cell = worksheet.getCell(headerRow2, col);
        if (text) {
            cell.value = text;
            Object.assign(cell, subHeaderStyle);
        }
    });

    // Merge cells untuk sub headers yang perlu merge
    // Output Sewing
    worksheet.mergeCells(headerRow2, 1, headerRow2, 2);
    // GOOD SEWING
    worksheet.mergeCells(headerRow2, 11, headerRow2, 12);
    // BALANCE (row 10 tidak ada sub header, jadi tidak perlu merge di row 10)

    // Data rows - Row 11 sesuai gambar
    data.forEach((rowData) => {
        const dataValues = [
            rowData.outputSewing,   // Col 1 - Output Sewing
            '',                     // Col 2 (spacer untuk merge)
            rowData.qcRework,       // Col 3 - QC REWORK
            rowData.qcWira,         // Col 4 - QC WIRA
            rowData.qcReject,       // Col 5 - QC REJECT
            rowData.qcGood,         // Col 6 - QC GOOD
            rowData.pqcRework,      // Col 7 - PQC REWORK
            rowData.pqcWira,        // Col 8 - PQC WIRA
            rowData.pqcReject,      // Col 9 - PQC REJECT
            rowData.pqcGood,        // Col 10 - PQC GOOD
            rowData.goodSewing,     // Col 11 - GOOD SEWING
            '',                     // Col 12 (spacer untuk merge)
            rowData.balance,        // Col 13 - BALANCE
            ''                      // Col 14 (spacer untuk merge)
        ];

        dataValues.forEach((value, colIdx) => {
            const col = colIdx + 1;
            const cell = worksheet.getCell(dataRow, col);
            cell.value = value;

            // Style untuk data row - white background, bold, centered
            Object.assign(cell, {
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
            });

            // Balance column (col 13) - red if negative
            if (col === 13 && typeof value === 'number' && value < 0) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        });

        // Merge cells untuk data row sesuai gambar
        // Output Sewing (A11-B11)
        worksheet.mergeCells(dataRow, 1, dataRow, 2);
        // GOOD SEWING (K11-L11)
        worksheet.mergeCells(dataRow, 11, dataRow, 12);
        // BALANCE (M11-N11)
        worksheet.mergeCells(dataRow, 13, dataRow, 14);
    });

    currentRow = dataRow + 1;

    // Set row heights sesuai gambar
    worksheet.getRow(1).height = 25; // Title row
    for (let i = 2; i <= 7; i++) {
        worksheet.getRow(i).height = 25; // Chart area rows (increased for images)
    }
    worksheet.getRow(3).height = 22; // Info header
    for (let i = 4; i <= 6; i++) {
        worksheet.getRow(i).height = 20; // Info rows
    }
    worksheet.getRow(headerRow1).height = 25; // Main header (row 9)
    worksheet.getRow(headerRow2).height = 22; // Sub header (row 10)
    worksheet.getRow(dataRow).height = 25; // Data row (row 11)

    // Generate filename
    const now = new Date();
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

        // Add info section
        csvData.push(['INFORMASI PRODUCTION LINE']);
        infoLabels.forEach(info => {
            csvData.push([info.label, info.value]);
        });
        csvData.push([]);

        // Add headers
        csvData.push([
            'Tanggal', 'LINE', 'WO', 'Style', 'Item', 'Buyer',
            'Output Sewing', 'QC REWORK', 'QC WIRA', 'QC REJECT', 'QC GOOD',
            'PQC REWORK', 'PQC WIRA', 'PQC REJECT', 'PQC GOOD',
            'GOOD SEWING', 'BALANCE'
        ]);

        // Add data
        data.forEach(row => {
            csvData.push([
                row.tanggal, row.line, row.wo, row.style, row.item, row.buyer,
                row.outputSewing.toString(),
                row.qcRework.toString(), row.qcWira.toString(), row.qcReject.toString(), row.qcGood.toString(),
                row.pqcRework.toString(), row.pqcWira.toString(), row.pqcReject.toString(), row.pqcGood.toString(),
                row.goodSewing.toString(), row.balance.toString()
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