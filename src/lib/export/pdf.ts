import { DetailedReportItem, DutySessionReportItem, LoginAuditItem, ReportFilterCriteria } from '@/types';
import { formatDateTimeIST } from '@/lib/timezone';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export function exportToPDF(
  items: DetailedReportItem[],
  filters?: ReportFilterCriteria,
  filename: string = 'fleet-report.pdf'
) {
  if (!items || items.length === 0) {
    alert('No data available to export');
    return;
  }

  // Create A4 Landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  // Calculate aggregates
  const totalKm = items.reduce((sum, item) => sum + item.total_km, 0);
  const totalEarnings = items.reduce((sum, item) => sum + (item.earnings || 0), 0);
  const totalFuel = items.reduce((sum, item) => sum + item.fuel_amount, 0);
  const totalNet = totalEarnings - totalFuel;
  const costPerKm = totalKm > 0 ? (totalFuel / totalKm).toFixed(2) : '0.00';

  // Title Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('FLEET MANAGEMENT - ACTIVITY & EXPENSE REPORT', 40, 40);

  // Subheader & Metadata
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  const dateRangeStr = filters
    ? `Date Range: ${filters.startDate} to ${filters.endDate} | Timezone: Asia/Kolkata (IST)`
    : 'Timezone: Asia/Kolkata (IST)';
  doc.text(dateRangeStr, 40, 58);

  // Summary Metrics Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 70, 762, 45, 4, 4, 'FD');

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(`Total Records: ${items.length}`, 50, 97);
  doc.text(`Distance: ${totalKm.toFixed(1)} KM`, 160, 97);
  doc.text(`Gross Earnings: ₹${totalEarnings.toFixed(2)}`, 290, 97);
  doc.text(`Fuel: ₹${totalFuel.toFixed(2)}`, 440, 97);
  doc.text(`Avg KM Cost: ₹${costPerKm}/KM`, 550, 97);
  doc.text(`Net Profit: ₹${totalNet.toFixed(2)}`, 680, 97);

  // Prepare table data
  const tableData = items.map((item) => {
    const rate = item.billing_rate_per_km || 0;
    const earnings = item.earnings || 0;
    const net = item.net_profit ?? (earnings - item.fuel_amount);
    const kmCost = item.total_km > 0 && item.fuel_amount > 0 ? `₹${(item.fuel_amount / item.total_km).toFixed(2)}` : '-';
    return [
      item.trip_date,
      item.driver_name,
      item.vehicle_reg || 'N/A',
      item.company_name,
      item.trip_type,
      `${item.one_side_km} km`,
      `x${item.multiplier}`,
      `${item.total_km} km`,
      rate > 0 ? `₹${rate}` : '-',
      `₹${earnings.toFixed(2)}`,
      `₹${item.fuel_amount.toFixed(2)}`,
      kmCost,
      `₹${net.toFixed(2)}`,
      item.notes || '-',
    ];
  });

  // Append Total Row
  tableData.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    `${totalKm.toFixed(1)} km`,
    '',
    `₹${totalEarnings.toFixed(2)}`,
    `₹${totalFuel.toFixed(2)}`,
    `₹${costPerKm}/km`,
    `₹${totalNet.toFixed(2)}`,
    `Fleet Avg: ₹${costPerKm}/KM`,
  ]);

  autoTable(doc, {
    startY: 125,
    head: [
      [
        'Date',
        'Driver',
        'Vehicle Reg',
        'Company',
        'Trip Type',
        '1-Side KM',
        'Multi',
        'Total KM',
        'Rate/KM',
        'Gross (₹)',
        'Fuel (₹)',
        'Cost/KM',
        'Net (₹)',
        'Notes',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Blue 600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      fontStyle: 'bold',
      textColor: [15, 23, 42],
    },
    margin: { left: 40, right: 40 },
    didParseCell: function (data) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });

  doc.save(filename);
}

export function exportWorkingHoursToPDF(
  items: DutySessionReportItem[],
  filters?: ReportFilterCriteria,
  filename: string = 'working-hours-report.pdf'
) {
  if (!items || items.length === 0) {
    alert('No data available to export');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const totalMins = items.reduce((sum, item) => sum + item.total_minutes, 0);
  const totalHours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;
  const totalTrips = items.reduce((sum, item) => sum + item.trips_count, 0);
  const totalKm = items.reduce((sum, item) => sum + (item.total_km || 0), 0);

  // Title Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('FLEET MANAGEMENT - DRIVER WORKING HOURS REPORT', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateRangeStr = filters
    ? `Date Range: ${filters.startDate} to ${filters.endDate} | Timezone: Asia/Kolkata (IST)`
    : 'Timezone: Asia/Kolkata (IST)';
  doc.text(dateRangeStr, 40, 58);

  // Metrics Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 70, 762, 45, 4, 4, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Shifts: ${items.length}`, 50, 97);
  doc.text(`Total Working Time: ${totalHours}h ${remainingMins.toString().padStart(2, '0')}m`, 190, 97);
  doc.text(`Trips Handled: ${totalTrips}`, 400, 97);
  doc.text(`Distance Logged: ${totalKm.toFixed(1)} KM`, 560, 97);

  const tableData = items.map((item) => [
    item.session_date,
    item.driver_name + (item.driver_username ? ` (@${item.driver_username})` : ''),
    item.vehicle_reg || 'Unassigned',
    formatDateTimeIST(item.start_time),
    item.end_time ? formatDateTimeIST(item.end_time) : 'Active / On Duty',
    item.formatted_duration,
    item.trips_count.toString(),
    `${(item.total_km || 0).toFixed(1)} km`,
    item.status,
    item.notes || '-',
  ]);

  tableData.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    `${totalHours}h ${remainingMins.toString().padStart(2, '0')}m`,
    totalTrips.toString(),
    `${totalKm.toFixed(1)} km`,
    `${items.length} Shifts`,
    '',
  ]);

  autoTable(doc, {
    startY: 125,
    head: [
      [
        'Shift Date',
        'Driver',
        'Vehicle Plate',
        'Shift Start (IST)',
        'Shift End (IST)',
        'Duration',
        'Trips',
        'Total KM',
        'Status',
        'Notes',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [147, 51, 234], // Purple 600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40 },
    didParseCell: function (data) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });

  doc.save(filename);
}

export function exportLoginDetailsToPDF(
  items: LoginAuditItem[],
  filters?: ReportFilterCriteria,
  filename: string = 'login-details-report.pdf'
) {
  if (!items || items.length === 0) {
    alert('No data available to export');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('FLEET MANAGEMENT - LOGIN & AUDIT REPORT', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateRangeStr = filters
    ? `Date Range: ${filters.startDate} to ${filters.endDate} | Timezone: Asia/Kolkata (IST)`
    : 'Timezone: Asia/Kolkata (IST)';
  doc.text(dateRangeStr, 40, 58);

  const tableData = items.map((item) => [
    formatDateTimeIST(item.login_time),
    item.full_name,
    `@${item.username}`,
    item.role,
    item.device_info,
    item.status,
  ]);

  autoTable(doc, {
    startY: 80,
    head: [
      [
        'Login Timestamp (IST)',
        'Full Name',
        'Username',
        'Role',
        'Device & Platform',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // Blue 500
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(filename);
}

