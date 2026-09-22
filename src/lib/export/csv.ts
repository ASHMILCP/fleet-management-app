import { DetailedReportItem } from '@/types';

export function exportToCSV(items: DetailedReportItem[], filename: string = 'fleet-report.csv') {
  if (!items || items.length === 0) {
    alert('No data available to export');
    return;
  }

  const headers = [
    'Trip Date',
    'Driver Name',
    'Phone',
    'Vehicle Reg No',
    'Company Name',
    'Trip Type',
    'One-Side KM',
    'Multiplier',
    'Total KM',
    'Fuel Amount (₹)',
    'Notes',
  ];

  const rows = items.map((item) => [
    item.trip_date,
    `"${item.driver_name.replace(/"/g, '""')}"`,
    `"${(item.driver_phone || '').replace(/"/g, '""')}"`,
    `"${(item.vehicle_reg || '').replace(/"/g, '""')}"`,
    `"${item.company_name.replace(/"/g, '""')}"`,
    item.trip_type,
    item.one_side_km,
    item.multiplier,
    item.total_km,
    item.fuel_amount,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
  ]);

  // Calculate totals
  const totalKm = items.reduce((sum, item) => sum + item.total_km, 0);
  const totalFuel = items.reduce((sum, item) => sum + item.fuel_amount, 0);

  const totalRow = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalKm.toFixed(2),
    totalFuel.toFixed(2),
    '',
  ];

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel
    [headers.join(','), ...rows.map((r) => r.join(',')), totalRow.join(',')].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
