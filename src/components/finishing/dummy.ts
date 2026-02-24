/**
 * Mock Data untuk Komponen Finishing
 * File ini berisi semua mock data yang digunakan di komponen finishing
 * yang belum menggunakan API
 */

// Mock data untuk Hourly Shipment Table (Shipment Per Table)
// Data untuk 8 tables dengan shipment per jam (8-15)
export const hourlyShipmentTableData = [
 { hour: '08:00', table1: 12, table2: 8, table3: 15, table4: 10, table5: 18, table6: 14, table7: 9, table8: 11 },
 { hour: '09:00', table1: 25, table2: 20, table3: 28, table4: 22, table5: 30, table6: 26, table7: 19, table8: 24 },
 { hour: '10:00', table1: 35, table2: 27, table3: 38, table4: 30, table5: 42, table6: 36, table7: 28, table8: 33 },
 { hour: '11:00', table1: 48, table2: 45, table3: 52, table4: 40, table5: 55, table6: 50, table7: 38, table8: 46 },
 { hour: '12:00', table1: 60, table2: 53, table3: 65, table4: 50, table5: 70, table6: 62, table7: 48, table8: 58 },
 { hour: '13:00', table1: 72, table2: 44, table3: 78, table4: 60, table5: 85, table6: 75, table7: 58, table8: 70 },
 { hour: '14:00', table1: 85, table2: 21, table3: 90, table4: 70, table5: 95, table6: 88, table7: 68, table8: 82 },
 { hour: '15:00', table1: 95, table2: 45, table3: 100, table4: 80, table5: 105, table6: 98, table7: 78, table8: 92 },
];

// Mock data untuk Chart Data Per Hour (Dryroom)
export const dryroomChartData = [
 { hour: '08:00', dryroom: 45, target: 80 },
 { hour: '09:00', dryroom: 58, target: 80 },
 { hour: '10:00', dryroom: 65, target: 80 },
 { hour: '11:00', dryroom: 72, target: 80 },
 { hour: '12:00', dryroom: 68, target: 80 },
 { hour: '13:00', dryroom: 75, target: 80 },
 { hour: '14:00', dryroom: 80, target: 80 },
 { hour: '15:00', dryroom: 78, target: 80 },
 { hour: '16:00', dryroom: 82, target: 80 },
];

// Mock data untuk Table Detail (Table Detail Modal)
export interface TableDetailItem {
 id: number;
 rfid: string;
 wo: string;
 item: string;
 buyer: string;
 color: string;
 size: string;
 qty: number;
 status: 'Waiting' | 'Check In' | 'Shipment';
 timestamp: string;
 line: string;
}

export const generateTableDetailMockData = (_tableNumber: number, tableWo: string, count: number = 15): TableDetailItem[] => {
 const items = [
  'STORM CRUISER JACKET M\'S',
  'JACKET OUTDOOR',
  'WINTER COAT M\'S',
  'RAIN JACKET M\'S',
  'FLEECE JACKET M\'S',
 ];

 const buyers = [
  'HEXAPOLE COMPANY LIMITED',
  'UNIQLO',
  'H&M',
  'ZARA',
  'THE NORTH FACE',
 ];

 const colors = ['BK', 'TN25', 'BL', 'GR', 'NV'];
 const sizes = ['L', 'M', 'S', 'XL', 'XXL'];
 const statuses: ('Waiting' | 'Check In' | 'Shipment')[] = ['Waiting', 'Check In', 'Shipment'];

 return Array.from({ length: count }, (_, i) => {
  const now = Date.now();
  const hoursAgo = i * 0.5; // Setiap item berbeda 30 menit
  const timestamp = new Date(now - hoursAgo * 3600000).toISOString();

  return {
   id: i + 1,
   rfid: `00${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
   wo: tableWo || `19283${7 + i}`,
   item: items[i % items.length],
   buyer: buyers[i % buyers.length],
   color: colors[i % colors.length],
   size: sizes[i % sizes.length],
   qty: Math.floor(Math.random() * 30) + 20,
   status: statuses[i % statuses.length],
   timestamp,
   line: `Line ${(i % 5) + 1}`,
  };
 });
};
