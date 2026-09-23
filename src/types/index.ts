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
}

export interface AdminSummaryMetrics {
  totalDrivers: number;
  activeDrivers: number;
  onDutyDrivers: number;
  todayTrips: number;
  todayKm: number;
  todayFuelExpense: number;
  todayFuelCostPerKm: number;
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
  net_profit?: number;
  created_at: string;
  notes?: string;
}
