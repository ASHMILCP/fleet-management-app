import { DetailedReportItem, ReportFilterCriteria } from '@/types';
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
  const totalFuel = items.reduce((sum, item) => sum + item.fuel_amount, 0);
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

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(`Total Records: ${items.length}`, 60, 97);
  doc.text(`Total Distance: ${totalKm.toFixed(1)} KM`, 210, 97);
  doc.text(`Total Fuel Expense: ₹${totalFuel.toFixed(2)}`, 390, 97);
  doc.text(`Fleet Avg Cost/KM: ₹${costPerKm}/KM`, 590, 97);

  // Prepare table data
  const tableData = items.map((item) => [
    item.trip_date,
    item.driver_name,
    item.vehicle_reg || 'N/A',
    item.company_name,
    item.trip_type,
    `${item.one_side_km} km`,
    `x${item.multiplier}`,
    `${item.total_km} km`,
    `₹${item.fuel_amount}`,
    item.notes || '-',
  ]);

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
    `₹${totalFuel.toFixed(2)}`,
    `Avg: ₹${costPerKm}/KM`,
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
        'Fuel (₹)',
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
