import { DetailedReportItem, DutySessionReportItem, LoginAuditItem } from '@/types';
import { formatDateTimeIST } from '@/lib/timezone';

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
    'Rate/KM (₹)',
    'Gross Earnings (₹)',
    'Fuel Amount (₹)',
    'Net Profit (₹)',
    'Notes',
  ];

  const rows = items.map((item) => {
    const rate = item.billing_rate_per_km || 0;
    const earnings = item.earnings || 0;
    const net = item.net_profit ?? (earnings - item.fuel_amount);
    return [
      item.trip_date,
      `"${item.driver_name.replace(/"/g, '""')}"`,
      `"${(item.driver_phone || '').replace(/"/g, '""')}"`,
      `"${(item.vehicle_reg || '').replace(/"/g, '""')}"`,
      `"${item.company_name.replace(/"/g, '""')}"`,
      item.trip_type,
      item.one_side_km,
      item.multiplier,
      item.total_km,
      rate,
      earnings.toFixed(2),
      item.fuel_amount.toFixed(2),
      net.toFixed(2),
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  // Calculate totals
  const totalKm = items.reduce((sum, item) => sum + item.total_km, 0);
  const totalEarnings = items.reduce((sum, item) => sum + (item.earnings || 0), 0);
  const totalFuel = items.reduce((sum, item) => sum + item.fuel_amount, 0);
  const totalNet = totalEarnings - totalFuel;

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
    '',
    totalEarnings.toFixed(2),
    totalFuel.toFixed(2),
    totalNet.toFixed(2),
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

export function exportWorkingHoursToCSV(
  items: DutySessionReportItem[],
  filename: string = 'working-hours-report.csv'
) {
  if (!items || items.length === 0) {
    alert('No data available to export');
    return;
  }

  const headers = [
    'Shift Date',
    'Driver Name',
    'Username',
    'Phone',
    'Vehicle Plate',
    'Shift Start (IST)',
    'Shift End (IST)',
    'Working Duration',
    'Total Minutes',
    'Trips Completed',
    'Total KM',
    'Status',
    'Notes',
  ];

  const rows = items.map((item) => [
    item.session_date,
    `"${item.driver_name.replace(/"/g, '""')}"`,
    `"${(item.driver_username ? '@' + item.driver_username : '').replace(/"/g, '""')}"`,
    `"${(item.driver_phone || '').replace(/"/g, '""')}"`,
    `"${(item.vehicle_reg || 'Unassigned').replace(/"/g, '""')}"`,
    `"${formatDateTimeIST(item.start_time).replace(/"/g, '""')}"`,
    `"${(item.end_time ? formatDateTimeIST(item.end_time) : 'Active / On Duty').replace(/"/g, '""')}"`,
    `"${item.formatted_duration.replace(/"/g, '""')}"`,
    item.total_minutes,
    item.trips_count,
    (item.total_km || 0).toFixed(1),
    item.status,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
  ]);

  const totalMins = items.reduce((sum, item) => sum + item.total_minutes, 0);
  const totalHours = Math.floor(totalMins / 60);
  const totalRemainingMins = totalMins % 60;
  const totalKm = items.reduce((sum, item) => sum + (item.total_km || 0), 0);
  const totalTrips = items.reduce((sum, item) => sum + item.trips_count, 0);

  const totalRow = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    `"${totalHours}h ${totalRemainingMins.toString().padStart(2, '0')}m"`,
    totalMins,
    totalTrips,
    totalKm.toFixed(1),
    `"${items.length} Shifts"`,
    '',
  ];

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(',')), totalRow.join(',')].join('\r\n');

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

export function exportLoginDetailsToCSV(
  items: LoginAuditItem[],
  filename: string = 'login-details-report.csv'
) {
  if (!items || items.length === 0) {
    alert('No data available to export');
    return;
  }

  const headers = [
    'Login Date & Time (IST)',
    'Driver / User',
    'Username',
    'Role',
    'Phone',
    'Device & Platform',
    'IP / Session Ref',
    'Status',
  ];

  const rows = items.map((item) => [
    `"${formatDateTimeIST(item.login_time).replace(/"/g, '""')}"`,
    `"${item.full_name.replace(/"/g, '""')}"`,
    `"@${item.username.replace(/"/g, '""')}"`,
    item.role,
    `"${(item.phone || '').replace(/"/g, '""')}"`,
    `"${item.device_info.replace(/"/g, '""')}"`,
    `"${(item.ip_address || '').replace(/"/g, '""')}"`,
    item.status,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(',\r\n'))].join('\r\n');

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

