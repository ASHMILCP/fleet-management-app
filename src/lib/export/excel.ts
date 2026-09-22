import { DetailedReportItem } from '@/types';
import * as XLSX from 'xlsx';

export function exportToExcel(items: DetailedReportItem[], filename: string = 'fleet-report.xlsx') {
  if (!items || items.length === 0) {
    alert('No data available to export');
    return;
  }

  const dataRows = items.map((item) => ({
    'Trip Date': item.trip_date,
    'Driver Name': item.driver_name,
    'Driver Phone': item.driver_phone || '',
    'Vehicle Reg': item.vehicle_reg || '',
    'Company': item.company_name,
    'Trip Type': item.trip_type,
    'One-Side KM': item.one_side_km,
    'Multiplier': item.multiplier,
    'Total KM': item.total_km,
    'Fuel Amount (₹)': item.fuel_amount,
    'Notes': item.notes || '',
  }));

  // Add Summary Row
  const totalKm = items.reduce((sum, item) => sum + item.total_km, 0);
  const totalFuel = items.reduce((sum, item) => sum + item.fuel_amount, 0);
  const costPerKm = totalKm > 0 ? (totalFuel / totalKm).toFixed(2) : '0.00';

  dataRows.push({
    'Trip Date': 'TOTAL',
    'Driver Name': '',
    'Driver Phone': '',
    'Vehicle Reg': '',
    'Company': '',
    'Trip Type': '' as any,
    'One-Side KM': '' as any,
    'Multiplier': '' as any,
    'Total KM': totalKm as any,
    'Fuel Amount (₹)': totalFuel as any,
    'Notes': `Fleet Avg Cost: ₹${costPerKm}/KM`,
  });

  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 14 }, // Trip Date
    { wch: 22 }, // Driver Name
    { wch: 16 }, // Driver Phone
    { wch: 16 }, // Vehicle Reg
    { wch: 28 }, // Company
    { wch: 12 }, // Trip Type
    { wch: 14 }, // One-Side KM
    { wch: 12 }, // Multiplier
    { wch: 12 }, // Total KM
    { wch: 16 }, // Fuel Amount (₹)
    { wch: 30 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fleet Report');

  XLSX.writeFile(workbook, filename);
}
