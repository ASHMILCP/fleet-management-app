'use client';

import {
  Profile,
  Vehicle,
  Company,
  DutySession,
  Trip,
  FuelLog,
  DriverTodaySummary,
  AdminSummaryMetrics,
  DetailedReportItem,
  ReportFilterCriteria,
} from '@/types';
import {
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_COMPANIES,
  INITIAL_DUTY_SESSIONS,
  INITIAL_TRIPS,
  INITIAL_FUEL_LOGS,
  INITIAL_ADMIN,
} from './mockData';
import { getTodayDateIST, calculateWorkingHours, formatTimeIST } from './timezone';

const STORAGE_KEYS = {
  DRIVERS: 'fleet_drivers_v1',
  VEHICLES: 'fleet_vehicles_v1',
  COMPANIES: 'fleet_companies_v1',
  DUTY_SESSIONS: 'fleet_duty_sessions_v1',
  TRIPS: 'fleet_trips_v1',
  FUEL_LOGS: 'fleet_fuel_logs_v1',
  CURRENT_USER: 'fleet_current_user_v1',
};

// Safe LocalStorage helpers
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving to localStorage ${key}:`, err);
  }
}

export class FleetStore {
  // Current User Session
  static getCurrentUser(): Profile | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as Profile;
    } catch {
      return null;
    }
  }

  static setCurrentUser(profile: Profile): void {
    setItem(STORAGE_KEYS.CURRENT_USER, profile);
    if (typeof document !== 'undefined') {
      document.cookie = `fleet_demo_role=${profile.role}; path=/; max-age=86400`;
    }
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
      const cookieNames = ['fleet_demo_role', 'sb-access-token', 'sb-refresh-token'];
      cookieNames.forEach((name) => {
        document.cookie = `${name}=; path=/; expires=${pastDate}; max-age=0`;
        document.cookie = `${name}=; path=/driver; expires=${pastDate}; max-age=0`;
        document.cookie = `${name}=; path=/admin; expires=${pastDate}; max-age=0`;
      });
    }
  }

  // Vehicles
  static getVehicles(): Vehicle[] {
    return getItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  }

  static getActiveVehicles(): Vehicle[] {
    return this.getVehicles().filter((v) => v.is_active);
  }

  static saveVehicle(vehicle: Partial<Vehicle> & { registration_number: string; model: string }): Vehicle {
    const vehicles = this.getVehicles();
    if (vehicle.id) {
      const idx = vehicles.findIndex((v) => v.id === vehicle.id);
      if (idx !== -1) {
        vehicles[idx] = { ...vehicles[idx], ...vehicle } as Vehicle;
        setItem(STORAGE_KEYS.VEHICLES, vehicles);
        return vehicles[idx];
      }
    }
    const newVehicle: Vehicle = {
      id: crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}`,
      registration_number: vehicle.registration_number.toUpperCase().trim(),
      model: vehicle.model.trim(),
      fuel_type: vehicle.fuel_type || 'CNG',
      is_active: vehicle.is_active !== undefined ? vehicle.is_active : true,
      created_at: new Date().toISOString(),
    };
    vehicles.unshift(newVehicle);
    setItem(STORAGE_KEYS.VEHICLES, vehicles);
    return newVehicle;
  }

  static toggleVehicleStatus(id: string): void {
    const vehicles = this.getVehicles();
    const idx = vehicles.findIndex((v) => v.id === id);
    if (idx !== -1) {
      vehicles[idx].is_active = !vehicles[idx].is_active;
      setItem(STORAGE_KEYS.VEHICLES, vehicles);
    }
  }

  static deleteVehicle(id: string): void {
    const vehicles = this.getVehicles();
    const filtered = vehicles.filter((v) => v.id !== id);
    setItem(STORAGE_KEYS.VEHICLES, filtered);
  }

  // Companies
  static getCompanies(): Company[] {
    return getItem<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  }

  static getActiveCompanies(): Company[] {
    return this.getCompanies().filter((c) => c.is_active);
  }

  static saveCompany(company: Partial<Company> & { name: string }): Company {
    const companies = this.getCompanies();
    if (company.id) {
      const idx = companies.findIndex((c) => c.id === company.id);
      if (idx !== -1) {
        companies[idx] = { ...companies[idx], ...company } as Company;
        setItem(STORAGE_KEYS.COMPANIES, companies);
        return companies[idx];
      }
    }
    const newCompany: Company = {
      id: crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`,
      name: company.name.trim(),
      contact_person: company.contact_person?.trim(),
      phone: company.phone?.trim(),
      email: company.email?.trim(),
      billing_rate_per_km: company.billing_rate_per_km || 0,
      is_active: company.is_active !== undefined ? company.is_active : true,
      created_at: new Date().toISOString(),
    };
    companies.unshift(newCompany);
    setItem(STORAGE_KEYS.COMPANIES, companies);
    return newCompany;
  }

  static toggleCompanyStatus(id: string): void {
    const companies = this.getCompanies();
    const idx = companies.findIndex((c) => c.id === id);
    if (idx !== -1) {
      companies[idx].is_active = !companies[idx].is_active;
      setItem(STORAGE_KEYS.COMPANIES, companies);
    }
  }

  static deleteCompany(id: string): void {
    const companies = this.getCompanies();
    const filtered = companies.filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.COMPANIES, filtered);
  }

  // Drivers
  static getDrivers(): Profile[] {
    return getItem<Profile[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  }

  static getActiveDrivers(): Profile[] {
    return this.getDrivers().filter((d) => d.is_active);
  }

  static saveDriver(driver: Partial<Profile> & { full_name: string }): Profile {
    const drivers = this.getDrivers();
    if (driver.id) {
      const idx = drivers.findIndex((d) => d.id === driver.id);
      if (idx !== -1) {
        const updateData: Partial<Profile> = { ...driver };
        if (!driver.password) {
          delete updateData.password;
        }
        drivers[idx] = { ...drivers[idx], ...updateData } as Profile;
        setItem(STORAGE_KEYS.DRIVERS, drivers);
        return drivers[idx];
      }
    }
    const newDriver: Profile = {
      id: crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}`,
      role: 'DRIVER',
      full_name: driver.full_name.trim(),
      username: driver.username?.trim(),
      password: driver.password?.trim(),
      phone: driver.phone?.trim(),
      license_number: driver.license_number?.trim(),
      assigned_vehicle_id: driver.assigned_vehicle_id,
      is_active: driver.is_active !== undefined ? driver.is_active : true,
      created_at: new Date().toISOString(),
    };
    drivers.unshift(newDriver);
    setItem(STORAGE_KEYS.DRIVERS, drivers);
    return newDriver;
  }

  static deleteDriver(id: string): void {
    const drivers = this.getDrivers();
    const filtered = drivers.filter((d) => d.id !== id);
    setItem(STORAGE_KEYS.DRIVERS, filtered);
  }

  static toggleDriverStatus(id: string): void {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex((d) => d.id === id);
    if (idx !== -1) {
      drivers[idx].is_active = !drivers[idx].is_active;
      setItem(STORAGE_KEYS.DRIVERS, drivers);
    }
  }

  static authenticateUser(usernameOrEmail: string, passwordInput: string): Profile | null {
    const query = usernameOrEmail.trim().toLowerCase();
    const pass = passwordInput.trim();

    // Check Admin
    const admin = INITIAL_ADMIN;
    const adminUserMatch = admin.username?.toLowerCase() === query || query === 'admin' || query.includes('admin');
    const adminPassMatch = admin.password === pass || pass === 'admin123';
    if (adminUserMatch && adminPassMatch && admin.is_active) {
      return admin;
    }

    // Check Drivers
    const drivers = this.getDrivers();
    const matchedDriver = drivers.find((d) => {
      const uMatch = d.username?.toLowerCase() === query || d.full_name.toLowerCase().includes(query) || (d.phone && d.phone.includes(query));
      const pMatch = d.password ? d.password === pass : true;
      return uMatch && pMatch && d.is_active;
    });

    return matchedDriver || null;
  }

  // Duty Sessions
  static getDutySessions(): DutySession[] {
    return getItem<DutySession[]>(STORAGE_KEYS.DUTY_SESSIONS, INITIAL_DUTY_SESSIONS);
  }

  static getActiveDutySession(driverId: string): DutySession | null {
    const sessions = this.getDutySessions();
    return (
      sessions.find((s) => s.driver_id === driverId && s.status === 'ACTIVE') || null
    );
  }

  static startDuty(driverId: string, vehicleId?: string, notes?: string): DutySession {
    const sessions = this.getDutySessions();
    // End any existing active session first
    sessions.forEach((s) => {
      if (s.driver_id === driverId && s.status === 'ACTIVE') {
        s.status = 'COMPLETED';
        s.end_time = new Date().toISOString();
      }
    });

    const newSession: DutySession = {
      id: crypto.randomUUID ? crypto.randomUUID() : `duty-${Date.now()}`,
      driver_id: driverId,
      vehicle_id: vehicleId,
      start_time: new Date().toISOString(),
      end_time: null,
      status: 'ACTIVE',
      notes: notes || undefined,
      created_at: new Date().toISOString(),
    };

    sessions.unshift(newSession);
    setItem(STORAGE_KEYS.DUTY_SESSIONS, sessions);
    return newSession;
  }

  static endDuty(driverId: string): DutySession | null {
    const sessions = this.getDutySessions();
    const active = sessions.find((s) => s.driver_id === driverId && s.status === 'ACTIVE');
    if (!active) return null;

    active.status = 'COMPLETED';
    active.end_time = new Date().toISOString();
    setItem(STORAGE_KEYS.DUTY_SESSIONS, sessions);
    return active;
  }

  // Trips
  static getTrips(): Trip[] {
    return getItem<Trip[]>(STORAGE_KEYS.TRIPS, INITIAL_TRIPS);
  }

  static addTrip(trip: Omit<Trip, 'id' | 'created_at'>): Trip {
    const trips = this.getTrips();
    const newTrip: Trip = {
      ...trip,
      id: crypto.randomUUID ? crypto.randomUUID() : `trip-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    trips.unshift(newTrip);
    setItem(STORAGE_KEYS.TRIPS, trips);
    return newTrip;
  }

  // Fuel Logs
  static getFuelLogs(): FuelLog[] {
    return getItem<FuelLog[]>(STORAGE_KEYS.FUEL_LOGS, INITIAL_FUEL_LOGS);
  }

  static addFuelLog(fuel: Omit<FuelLog, 'id' | 'created_at'>): FuelLog {
    const fuelLogs = this.getFuelLogs();
    const newFuel: FuelLog = {
      ...fuel,
      id: crypto.randomUUID ? crypto.randomUUID() : `fuel-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    fuelLogs.unshift(newFuel);
    setItem(STORAGE_KEYS.FUEL_LOGS, fuelLogs);
    return newFuel;
  }

  // Today's Driver Summary
  static getDriverTodaySummary(driverId: string): DriverTodaySummary {
    const today = getTodayDateIST();
    const sessions = this.getDutySessions().filter(
      (s) => s.driver_id === driverId && s.start_time.startsWith(today)
    );

    // Active or most recent session for today
    const currentActive = this.getActiveDutySession(driverId);
    const primarySession = currentActive || sessions[0] || null;

    const startTime = primarySession ? primarySession.start_time : null;
    const endTime = primarySession?.end_time || null;

    const working = calculateWorkingHours(startTime, endTime);

    // Trips today for this driver
    const driverTripsToday = this.getTrips().filter(
      (t) => t.driver_id === driverId && t.trip_date === today
    );
    const totalTrips = driverTripsToday.length;
    const totalKm = driverTripsToday.reduce((sum, t) => sum + Number(t.total_km || 0), 0);

    // Fuel spent today for this driver
    const driverFuelToday = this.getFuelLogs().filter(
      (f) => f.driver_id === driverId && f.log_date === today
    );
    const fuelExpense = driverFuelToday.reduce((sum, f) => sum + Number(f.amount || 0), 0);

    const fuelCostPerKm = totalKm > 0 ? parseFloat((fuelExpense / totalKm).toFixed(2)) : 0;

    return {
      dutySession: primarySession,
      startTime,
      endTime,
      workingHoursText: working.text,
      workingHoursDecimal: working.hoursDecimal,
      totalTrips,
      totalKm,
      fuelExpense,
      fuelCostPerKm,
    };
  }

  // Admin Metrics
  static getAdminMetrics(): AdminSummaryMetrics {
    const today = getTodayDateIST();
    const drivers = this.getDrivers();
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter((d) => d.is_active).length;

    const activeSessions = this.getDutySessions().filter((s) => s.status === 'ACTIVE');
    const onDutyDrivers = activeSessions.length;

    const tripsToday = this.getTrips().filter((t) => t.trip_date === today);
    const todayTrips = tripsToday.length;
    const todayKm = tripsToday.reduce((sum, t) => sum + Number(t.total_km || 0), 0);

    const fuelToday = this.getFuelLogs().filter((f) => f.log_date === today);
    const todayFuelExpense = fuelToday.reduce((sum, f) => sum + Number(f.amount || 0), 0);

    const todayFuelCostPerKm = todayKm > 0 ? parseFloat((todayFuelExpense / todayKm).toFixed(2)) : 0;

    return {
      totalDrivers,
      activeDrivers,
      onDutyDrivers,
      todayTrips,
      todayKm,
      todayFuelExpense,
      todayFuelCostPerKm,
    };
  }

  // Filtered Reports Data
  static getDetailedReports(filters: ReportFilterCriteria): DetailedReportItem[] {
    const trips = this.getTrips();
    const drivers = this.getDrivers();
    const companies = this.getCompanies();
    const vehicles = this.getVehicles();
    const fuelLogs = this.getFuelLogs();

    // Map lookup
    const driverMap = new Map(drivers.map((d) => [d.id, d]));
    const companyMap = new Map(companies.map((c) => [c.id, c]));
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    // Filter trips
    const filteredTrips = trips.filter((t) => {
      if (filters.startDate && t.trip_date < filters.startDate) return false;
      if (filters.endDate && t.trip_date > filters.endDate) return false;
      if (filters.driverId !== 'ALL' && t.driver_id !== filters.driverId) return false;
      if (filters.companyId !== 'ALL' && t.company_id !== filters.companyId) return false;
      return true;
    });

    return filteredTrips.map((t) => {
      const driver = driverMap.get(t.driver_id);
      const company = companyMap.get(t.company_id);
      const vehicle = t.vehicle_id ? vehicleMap.get(t.vehicle_id) : undefined;

      // Find any fuel logged by this driver on that trip date
      const fuelOnDate = fuelLogs
        .filter((f) => f.driver_id === t.driver_id && f.log_date === t.trip_date)
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      return {
        id: t.id,
        trip_date: t.trip_date,
        driver_name: driver?.full_name || 'Unknown Driver',
        driver_phone: driver?.phone,
        vehicle_reg: vehicle?.registration_number,
        company_name: company?.name || 'Unknown Company',
        trip_type: t.trip_type,
        one_side_km: Number(t.one_side_km),
        multiplier: t.multiplier,
        total_km: Number(t.total_km),
        fuel_amount: fuelOnDate,
        created_at: t.created_at,
        notes: t.notes,
      };
    });
  }
}
