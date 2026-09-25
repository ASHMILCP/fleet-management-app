export type UserRole = 'ADMIN' | 'DRIVER';
export type FuelType = 'CNG' | 'PETROL';
export type TripType = 'ONE_SIDE' | 'TWO_SIDE';
export type DutyStatus = 'ACTIVE' | 'COMPLETED';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  username?: string;
  password?: string;
  phone?: string;
  license_number?: string;
  assigned_vehicle_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // joined fields
  assigned_vehicle?: Vehicle;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  model: string;
  fuel_type: FuelType;
  is_active: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  billing_rate_per_km?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface DutySession {
  id: string;
  driver_id: string;
  vehicle_id?: string;
  start_time: string;
  end_time?: string | null;
  status: DutyStatus;
  notes?: string;
  created_at: string;
  // joined fields
  driver?: Profile;
  vehicle?: Vehicle;
}

export interface Trip {
  id: string;
  driver_id: string;
  company_id: string;
  vehicle_id?: string;
  duty_session_id?: string | null;
  one_side_km: number;
  trip_type: TripType;
  multiplier: 1 | 2;
  total_km: number;
  trip_date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
  // joined fields
  company?: Company;
  driver?: Profile;
  vehicle?: Vehicle;
}

export interface FuelLog {
  id: string;
  driver_id: string;
  vehicle_id?: string;
  duty_session_id?: string | null;
  fuel_type: FuelType;
  amount: number;
  liters_or_kg?: number | null;
  log_date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
  // joined fields
  driver?: Profile;
  vehicle?: Vehicle;
}

export interface UberEarning {
  id: string;
  driver_id: string;
  vehicle_id?: string;
  duty_session_id?: string | null;
  amount: number;
  rides_count?: number | null;
  earnings_date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
  // joined fields
  driver?: Profile;
  vehicle?: Vehicle;
}

export interface DriverTodaySummary {
  dutySession: DutySession | null;
  startTime: string | null;
  endTime: string | null;
  workingHoursText: string;
  workingHoursDecimal: number;
  totalTrips: number;
  totalKm: number;
  fuelExpense: number;
  fuelCostPerKm: number; // fuelExpense / totalKm
  uberEarnings: number;
  tripEarnings: number;
  totalEarnings: number;
  netEarnings: number;
}

export interface AdminSummaryMetrics {
  totalDrivers: number;
  activeDrivers: number;
  onDutyDrivers: number;
  todayTrips: number;
  todayKm: number;
  todayFuelExpense: number;
  todayFuelCostPerKm: number;
  todayUberEarnings?: number;
  todayTotalEarnings?: number;
}

export interface ReportFilterCriteria {
  startDate: string;
  endDate: string;
  driverId: string; // 'ALL' or UUID
  companyId: string; // 'ALL' or UUID
}

export interface DetailedReportItem {
  id: string;
  trip_date: string;
  driver_name: string;
  driver_phone?: string;
  vehicle_reg?: string;
  company_name: string;
  trip_type: TripType;
  one_side_km: number;
  multiplier: number;
  total_km: number;
  billing_rate_per_km: number;
  earnings: number;
  fuel_amount: number;
  fuel_cost_per_km?: number; // fuel_amount / total_km
  net_profit?: number;
  created_at: string;
  notes?: string;
}

export interface DutySessionReportItem {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_username?: string;
  driver_phone?: string;
  session_date: string;
  start_time: string;
  end_time?: string | null;
  total_minutes: number;
  formatted_duration: string;
  vehicle_reg?: string;
  vehicle_model?: string;
  status: DutyStatus;
  trips_count: number;
  total_km?: number;
  notes?: string;
  created_at?: string;
}

export interface LoginAuditItem {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  role: UserRole;
  login_time: string;
  device_info: string;
  status: 'SUCCESS' | 'FAILED';
  ip_address?: string;
  phone?: string;
}

export interface DutyNotification {
  id: string;
  type: 'DUTY_STARTED' | 'DUTY_ENDED';
  driver_id: string;
  driver_name: string;
  driver_username?: string;
  driver_phone?: string;
  vehicle_reg?: string;
  session_id?: string;
  timestamp: string;
  duration_text?: string;
  notes?: string;
  read?: boolean;
}


