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
import { createClient, isLiveSupabaseConfigured } from './supabase/client';

const STORAGE_KEYS = {
  DRIVERS: 'fleet_drivers_v1',
  VEHICLES: 'fleet_vehicles_v1',
  COMPANIES: 'fleet_companies_v1',
  DUTY_SESSIONS: 'fleet_duty_sessions_v1',
  TRIPS: 'fleet_trips_v1',
  FUEL_LOGS: 'fleet_fuel_logs_v1',
  CURRENT_USER: 'fleet_current_user_v1',
  INITIALIZED: 'fleet_initialized_v1',
  DELETED_DRIVERS: 'fleet_deleted_drivers_v1',
  ADMIN_PROFILE: 'fleet_admin_profile_v1',
};

// Safe LocalStorage helpers
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    const data = localStorage.getItem(key);
    if (data !== null) {
      const parsed = JSON.parse(data);
      if (Array.isArray(fallback) && !Array.isArray(parsed)) {
        return fallback;
      }
      return parsed;
    }
    return isInitialized === 'true' && Array.isArray(fallback) ? ([] as unknown as T) : fallback;
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

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

  // Admin Profile Management
  static getAdminProfile(): Profile {
    return getItem<Profile>(STORAGE_KEYS.ADMIN_PROFILE, INITIAL_ADMIN);
  }

  static updateAdminProfile(updates: Partial<Profile>): Profile {
    const current = this.getAdminProfile();
    const updated: Profile = {
      ...current,
      ...updates,
      id: current.id || INITIAL_ADMIN.id,
      role: 'ADMIN',
      is_active: true,
    };
    setItem(STORAGE_KEYS.ADMIN_PROFILE, updated);

    // If currently logged in as Admin, update current user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.role === 'ADMIN') {
      this.setCurrentUser(updated);
    }

    // Sync to Supabase cloud if configured
    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase
        .from('profiles')
        .upsert({
          id: updated.id,
          role: 'ADMIN',
          username: updated.username,
          password: updated.password,
          name: updated.full_name,
          full_name: updated.full_name,
          phone: updated.phone || '9999999999',
          status: 'ACTIVE',
        })
        .then(({ error }) => {
          if (error) console.error('Supabase admin profile update error:', error);
        });
    }

    return updated;
  }

  static clearAllDemoData(): void {
    if (typeof window === 'undefined') return;
    setItem(STORAGE_KEYS.INITIALIZED, 'true');
    setItem(STORAGE_KEYS.DRIVERS, []);
    setItem(STORAGE_KEYS.VEHICLES, []);
    setItem(STORAGE_KEYS.COMPANIES, []);
    setItem(STORAGE_KEYS.DUTY_SESSIONS, []);
    setItem(STORAGE_KEYS.TRIPS, []);
    setItem(STORAGE_KEYS.FUEL_LOGS, []);

    const current = this.getCurrentUser();
    if (current && current.role === 'DRIVER') {
      this.logout();
    }

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      Promise.all([
        supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('fuel_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('duty_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('profiles').delete().neq('role', 'ADMIN'),
        supabase.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]).catch((err) => console.error('Error clearing Supabase demo tables:', err));
    }
  }

  static importFleetData(data: {
    drivers?: Profile[];
    vehicles?: Vehicle[];
    companies?: Company[];
    duty_sessions?: DutySession[];
    trips?: Trip[];
    fuel_logs?: FuelLog[];
  }): void {
    if (typeof window === 'undefined') return;
    if (data.drivers && Array.isArray(data.drivers)) setItem(STORAGE_KEYS.DRIVERS, data.drivers);
    if (data.vehicles && Array.isArray(data.vehicles)) setItem(STORAGE_KEYS.VEHICLES, data.vehicles);
    if (data.companies && Array.isArray(data.companies)) setItem(STORAGE_KEYS.COMPANIES, data.companies);
    if (data.duty_sessions && Array.isArray(data.duty_sessions)) setItem(STORAGE_KEYS.DUTY_SESSIONS, data.duty_sessions);
    if (data.trips && Array.isArray(data.trips)) setItem(STORAGE_KEYS.TRIPS, data.trips);
    if (data.fuel_logs && Array.isArray(data.fuel_logs)) setItem(STORAGE_KEYS.FUEL_LOGS, data.fuel_logs);
    setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  static async syncWithSupabase(): Promise<void> {
    if (typeof window === 'undefined' || !isLiveSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const [vRes, cRes, pRes, dRes, tRes, fRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('companies').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('duty_sessions').select('*'),
        supabase.from('trips').select('*'),
        supabase.from('fuel_expenses').select('*'),
      ]);

      // 1. VEHICLES SYNC
      if (Array.isArray(vRes.data)) {
        const seenRegs = new Set<string>();
        const seenIds = new Set<string>();
        const cloudVehicles: Vehicle[] = [];

        for (const row of vRes.data) {
          if (!row || !row.id || !row.registration_number) continue;
          const cleanReg = row.registration_number.toUpperCase().replace(/\s+/g, '');
          if (!seenIds.has(row.id) && !seenRegs.has(cleanReg)) {
            seenIds.add(row.id);
            seenRegs.add(cleanReg);
            cloudVehicles.push({
              id: row.id,
              registration_number: row.registration_number.toUpperCase().trim(),
              model: row.model || '',
              fuel_type: row.fuel_type || 'CNG',
              is_active: row.status ? row.status === 'ACTIVE' : (row.is_active !== undefined ? row.is_active : true),
              created_at: row.created_at || new Date().toISOString(),
            });
          }
        }
        // Supabase is the single source of truth for vehicles. Never auto-upload local duplicates!
        setItem(STORAGE_KEYS.VEHICLES, cloudVehicles);
      }

      // 2. COMPANIES SYNC
      if (Array.isArray(cRes.data)) {
        const seenNames = new Set<string>();
        const seenIds = new Set<string>();
        const cloudCompanies: Company[] = [];

        for (const row of cRes.data) {
          if (!row || !row.id) continue;
          const rawName = row.company_name || row.name || '';
          if (!rawName.trim()) continue;
          const cleanName = rawName.trim().toLowerCase();
          if (!seenIds.has(row.id) && !seenNames.has(cleanName)) {
            seenIds.add(row.id);
            seenNames.add(cleanName);
            let rate = 0;
            if (row.notes && !isNaN(parseFloat(row.notes))) {
              rate = parseFloat(row.notes);
            } else if (row.billing_rate_per_km !== undefined) {
              rate = Number(row.billing_rate_per_km) || 0;
            }
            cloudCompanies.push({
              id: row.id,
              name: rawName.trim(),
              contact_person: row.contact_person || '',
              phone: row.phone || '',
              email: row.email || '',
              billing_rate_per_km: rate,
              is_active: row.status ? row.status === 'ACTIVE' : (row.is_active !== undefined ? row.is_active : true),
              created_at: row.created_at || new Date().toISOString(),
            });
          }
        }
        // Supabase is the single source of truth for companies. Never auto-upload local duplicates!
        setItem(STORAGE_KEYS.COMPANIES, cloudCompanies);
      }

      // 3. PROFILES / DRIVERS SYNC
      const localDrivers = this.getDrivers();
      if (Array.isArray(pRes.data)) {
        // Sync cloud admin if present
        const adminRow = pRes.data.find((row: any) => row.role === 'ADMIN' || row.id === INITIAL_ADMIN.id);
        if (adminRow) {
          const currentAdmin = this.getAdminProfile();
          const syncedAdmin: Profile = {
            id: adminRow.id || currentAdmin.id,
            role: 'ADMIN',
            full_name: adminRow.full_name || adminRow.name || currentAdmin.full_name,
            phone: adminRow.phone || currentAdmin.phone || '9999999999',
            username: adminRow.username || currentAdmin.username || 'admin',
            password: adminRow.password || currentAdmin.password || 'admin123',
            is_active: true,
            created_at: adminRow.created_at || currentAdmin.created_at,
          };
          setItem(STORAGE_KEYS.ADMIN_PROFILE, syncedAdmin);
        }

        const seenUsernames = new Set<string>();
        const seenIds = new Set<string>();
        const cloudProfiles: Profile[] = [];

        for (const row of pRes.data) {
          if (!row || !row.id) continue;
          if (row.role && row.role !== 'DRIVER') continue;
          const rawUser = row.username ? row.username.trim().toLowerCase() : row.id;
          if (!seenIds.has(row.id) && !seenUsernames.has(rawUser)) {
            seenIds.add(row.id);
            seenUsernames.add(rawUser);
            const existingLocal = localDrivers.find((d) => d.id === row.id || (row.username && d.username === row.username));
            cloudProfiles.push({
              id: row.id,
              role: 'DRIVER' as const,
              full_name: row.full_name || row.name || 'Unnamed Driver',
              phone: row.phone || existingLocal?.phone || '',
              username: row.username || existingLocal?.username || (row.name ? row.name.toLowerCase().replace(/\s+/g, '') : undefined),
              password: row.password || existingLocal?.password,
              license_number: row.license_number || existingLocal?.license_number,
              assigned_vehicle_id: row.assigned_vehicle_id || existingLocal?.assigned_vehicle_id,
              is_active: row.status ? row.status === 'ACTIVE' : (row.is_active !== undefined ? row.is_active : true),
              created_at: row.created_at || existingLocal?.created_at || new Date().toISOString(),
            });
          }
        }
        setItem(STORAGE_KEYS.DRIVERS, cloudProfiles);

        // If the currently logged-in user is a driver that was deleted from Supabase, log them out immediately
        const current = this.getCurrentUser();
        if (current && current.role === 'DRIVER') {
          const stillExists = cloudProfiles.some((d) => d.id === current.id && d.is_active);
          if (!stillExists) {
            this.logout();
          }
        }
      }

      // 4. DUTY SESSIONS SYNC & MERGE
      const localSessions = this.getDutySessions();
      if (Array.isArray(dRes.data)) {
        const cloudSessions: DutySession[] = dRes.data.map((row: any) => ({
          id: row.id,
          driver_id: row.driver_id,
          vehicle_id: row.vehicle_id || localDrivers.find((d) => d.id === row.driver_id)?.assigned_vehicle_id,
          start_time: row.start_time,
          end_time: row.end_time || null,
          status: row.end_time ? 'COMPLETED' : 'ACTIVE',
          notes: row.notes,
          created_at: row.created_at || row.start_time || new Date().toISOString(),
        }));
        const cloudSessionIds = new Set(cloudSessions.map((s) => s.id));
        const unsyncedSessions = localSessions.filter((s) => !cloudSessionIds.has(s.id));
        for (const us of unsyncedSessions) {
          supabase.from('duty_sessions').upsert({
            id: us.id,
            driver_id: us.driver_id,
            session_date: (us.start_time ? us.start_time.split('T')[0] : getTodayDateIST()),
            start_time: us.start_time,
            end_time: us.end_time || null,
          }).then(({ error }) => {
            if (error) console.error('Error auto-uploading duty session to Supabase:', error);
          });
        }
        const mergedSessions = [...cloudSessions, ...unsyncedSessions];
        setItem(STORAGE_KEYS.DUTY_SESSIONS, mergedSessions);
      }

      // 5. TRIPS SYNC & MERGE
      const localTrips = this.getTrips();
      if (Array.isArray(tRes.data)) {
        const cloudTrips: Trip[] = tRes.data.map((row: any) => ({
          id: row.id,
          driver_id: row.driver_id,
          company_id: row.company_id,
          vehicle_id: row.vehicle_id,
          duty_session_id: row.duty_session_id,
          one_side_km: row.entered_km || row.one_side_km || (row.total_km ? (row.trip_type === 'ONE_SIDE' ? row.total_km / 2 : row.total_km) : 0),
          trip_type: row.trip_type || 'ONE_SIDE',
          multiplier: row.km_multiplier || (row.trip_type === 'TWO_SIDE' ? 1 : (row.multiplier || 2)),
          total_km: Number(row.total_km || 0),
          trip_date: row.trip_date || (row.created_at ? row.created_at.split('T')[0] : getTodayDateIST()),
          notes: row.notes,
          created_at: row.created_at || new Date().toISOString(),
        }));
        const cloudTripIds = new Set(cloudTrips.map((t) => t.id));
        const unsyncedTrips = localTrips.filter((t) => !cloudTripIds.has(t.id));
        for (const ut of unsyncedTrips) {
          supabase.from('trips').upsert({
            id: ut.id,
            driver_id: ut.driver_id,
            company_id: ut.company_id,
            vehicle_id: ut.vehicle_id || null,
            entered_km: ut.one_side_km,
            trip_type: ut.trip_type,
            km_multiplier: ut.multiplier || (ut.trip_type === 'TWO_SIDE' ? 1 : 2),
            total_km: ut.total_km,
            trip_date: ut.trip_date,
            notes: ut.notes || null,
          }).then(({ error }) => {
            if (error) console.error('Error auto-uploading trip to Supabase:', error);
          });
        }
        const mergedTrips = [...cloudTrips, ...unsyncedTrips];
        setItem(STORAGE_KEYS.TRIPS, mergedTrips);
      }

      // 6. FUEL LOGS SYNC & MERGE
      const localFuel = this.getFuelLogs();
      if (Array.isArray(fRes.data)) {
        const cloudFuel: FuelLog[] = fRes.data.map((row: any) => ({
          id: row.id,
          driver_id: row.driver_id,
          vehicle_id: row.vehicle_id,
          duty_session_id: row.duty_session_id,
          fuel_type: row.fuel_type || 'CNG',
          amount: Number(row.amount || 0),
          liters_or_kg: row.liters_or_kg || row.quantity,
          log_date: row.expense_date || row.log_date || (row.created_at ? row.created_at.split('T')[0] : getTodayDateIST()),
          notes: row.notes,
          created_at: row.created_at || new Date().toISOString(),
        }));
        const cloudFuelIds = new Set(cloudFuel.map((f) => f.id));
        const unsyncedFuel = localFuel.filter((f) => !cloudFuelIds.has(f.id));
        for (const uf of unsyncedFuel) {
          supabase.from('fuel_expenses').upsert({
            id: uf.id,
            driver_id: uf.driver_id,
            vehicle_id: uf.vehicle_id || null,
            fuel_type: uf.fuel_type || 'CNG',
            amount: uf.amount,
            expense_date: uf.log_date || getTodayDateIST(),
            notes: uf.notes || null,
          }).then(({ error }) => {
            if (error) console.error('Error auto-uploading fuel log to Supabase:', error);
          });
        }
        const mergedFuel = [...cloudFuel, ...unsyncedFuel];
        setItem(STORAGE_KEYS.FUEL_LOGS, mergedFuel);
      }

      setItem(STORAGE_KEYS.INITIALIZED, 'true');
    } catch (err) {
      console.error('Error syncing with Supabase:', err);
    }
  }

  // Vehicles
  static getVehicles(): Vehicle[] {
    const raw = getItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
    const seenRegs = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated: Vehicle[] = [];
    for (const v of raw) {
      if (!v || !v.id || !v.registration_number) continue;
      const cleanReg = v.registration_number.toUpperCase().replace(/\s+/g, '');
      if (!seenIds.has(v.id) && !seenRegs.has(cleanReg)) {
        seenIds.add(v.id);
        seenRegs.add(cleanReg);
        deduplicated.push(v);
      }
    }
    return deduplicated;
  }

  static getActiveVehicles(): Vehicle[] {
    return this.getVehicles().filter((v) => v.is_active);
  }

  static saveVehicle(vehicle: Partial<Vehicle> & { registration_number: string; model: string }): Vehicle {
    const vehicles = this.getVehicles();
    let targetVehicle: Vehicle;
    const cleanReg = vehicle.registration_number.toUpperCase().trim();
    const normReg = cleanReg.replace(/\s+/g, '');

    const existingById = vehicle.id ? vehicles.find((v) => v.id === vehicle.id) : null;
    const existingByReg = !vehicle.id ? vehicles.find((v) => v.registration_number.toUpperCase().replace(/\s+/g, '') === normReg) : null;
    const target = existingById || existingByReg;

    if (target) {
      const idx = vehicles.findIndex((v) => v.id === target.id);
      targetVehicle = {
        ...target,
        ...vehicle,
        id: target.id,
        registration_number: cleanReg,
        model: vehicle.model ? vehicle.model.trim() : target.model,
        fuel_type: vehicle.fuel_type || target.fuel_type,
        is_active: vehicle.is_active !== undefined ? vehicle.is_active : target.is_active,
      };
      if (idx !== -1) {
        vehicles[idx] = targetVehicle;
      } else {
        vehicles.unshift(targetVehicle);
      }
    } else {
      targetVehicle = {
        id: generateUUID(),
        registration_number: cleanReg,
        model: vehicle.model.trim(),
        fuel_type: vehicle.fuel_type || 'CNG',
        is_active: vehicle.is_active !== undefined ? vehicle.is_active : true,
        created_at: new Date().toISOString(),
      };
      vehicles.unshift(targetVehicle);
    }

    setItem(STORAGE_KEYS.VEHICLES, vehicles);

    // Direct Supabase Cloud write
    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase.from('vehicles').upsert({
        id: targetVehicle.id,
        registration_number: targetVehicle.registration_number,
        model: targetVehicle.model,
        fuel_type: targetVehicle.fuel_type,
        status: targetVehicle.is_active ? 'ACTIVE' : 'INACTIVE',
      }).then(({ error }) => {
        if (error) console.error('Supabase direct vehicle save error:', error);
      });
    }

    return targetVehicle;
  }

  static toggleVehicleStatus(id: string): void {
    const vehicles = this.getVehicles();
    const idx = vehicles.findIndex((v) => v.id === id);
    if (idx !== -1) {
      vehicles[idx].is_active = !vehicles[idx].is_active;
      setItem(STORAGE_KEYS.VEHICLES, vehicles);

      if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
        const supabase = createClient();
        supabase.from('vehicles').update({ status: vehicles[idx].is_active ? 'ACTIVE' : 'INACTIVE' }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggle vehicle status error:', error);
        });
      }
    }
  }

  static deleteVehicle(id: string): void {
    const vehicles = this.getVehicles();
    const filtered = vehicles.filter((v) => v.id !== id);
    setItem(STORAGE_KEYS.VEHICLES, filtered);

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase.from('vehicles').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase vehicle delete error:', error);
      });
    }
  }

  // Companies
  static getCompanies(): Company[] {
    const raw = getItem<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated: Company[] = [];
    for (const c of raw) {
      if (!c || !c.id || !c.name) continue;
      const cleanName = c.name.trim().toLowerCase();
      if (!seenIds.has(c.id) && !seenNames.has(cleanName)) {
        seenIds.add(c.id);
        seenNames.add(cleanName);
        deduplicated.push(c);
      }
    }
    return deduplicated;
  }

  static getActiveCompanies(): Company[] {
    return this.getCompanies().filter((c) => c.is_active);
  }

  static saveCompany(company: Partial<Company> & { name: string }): Company {
    const companies = this.getCompanies();
    let targetCompany: Company;
    const cleanName = company.name.trim();
    const lowerName = cleanName.toLowerCase();

    // Check if updating by ID, or if a company with this name already exists
    const existingById = company.id ? companies.find((c) => c.id === company.id) : null;
    const existingByName = !company.id ? companies.find((c) => c.name.trim().toLowerCase() === lowerName) : null;
    const target = existingById || existingByName;

    if (target) {
      const idx = companies.findIndex((c) => c.id === target.id);
      targetCompany = {
        ...target,
        ...company,
        id: target.id,
        name: cleanName,
        billing_rate_per_km: company.billing_rate_per_km !== undefined ? company.billing_rate_per_km : target.billing_rate_per_km,
        is_active: company.is_active !== undefined ? company.is_active : target.is_active,
      };
      if (idx !== -1) {
        companies[idx] = targetCompany;
      } else {
        companies.unshift(targetCompany);
      }
    } else {
      targetCompany = {
        id: generateUUID(),
        name: cleanName,
        contact_person: company.contact_person?.trim(),
        phone: company.phone?.trim(),
        email: company.email?.trim(),
        billing_rate_per_km: company.billing_rate_per_km || 0,
        is_active: company.is_active !== undefined ? company.is_active : true,
        created_at: new Date().toISOString(),
      };
      companies.unshift(targetCompany);
    }

    setItem(STORAGE_KEYS.COMPANIES, companies);

    // Direct Supabase Cloud write
    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase.from('companies').upsert({
        id: targetCompany.id,
        company_name: targetCompany.name,
        contact_person: targetCompany.contact_person || null,
        phone: targetCompany.phone || null,
        email: targetCompany.email || null,
        status: targetCompany.is_active ? 'ACTIVE' : 'INACTIVE',
        notes: targetCompany.billing_rate_per_km ? String(targetCompany.billing_rate_per_km) : null,
      }).then(({ error }) => {
        if (error) console.error('Supabase direct company save error:', error);
      });
    }

    return targetCompany;
  }

  static toggleCompanyStatus(id: string): void {
    const companies = this.getCompanies();
    const idx = companies.findIndex((c) => c.id === id);
    if (idx !== -1) {
      companies[idx].is_active = !companies[idx].is_active;
      setItem(STORAGE_KEYS.COMPANIES, companies);

      if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
        const supabase = createClient();
        supabase.from('companies').update({ status: companies[idx].is_active ? 'ACTIVE' : 'INACTIVE' }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggle company status error:', error);
        });
      }
    }
  }

  static deleteCompany(id: string): void {
    const companies = this.getCompanies();
    const filtered = companies.filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.COMPANIES, filtered);

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase.from('companies').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase company delete error:', error);
      });
    }
  }

  // Drivers
  static getDrivers(): Profile[] {
    const raw = getItem<Profile[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    const seenUsernames = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated: Profile[] = [];
    for (const d of raw) {
      if (!d || !d.id) continue;
      const cleanUser = d.username ? d.username.trim().toLowerCase() : d.id;
      if (!seenIds.has(d.id) && !seenUsernames.has(cleanUser)) {
        seenIds.add(d.id);
        seenUsernames.add(cleanUser);
        deduplicated.push(d);
      }
    }
    return deduplicated;
  }

  static getActiveDrivers(): Profile[] {
    return this.getDrivers().filter((d) => d.is_active);
  }

  static saveDriver(driver: Partial<Profile> & { full_name: string }): Profile {
    const drivers = this.getDrivers();
    let resultDriver: Profile;
    const cleanUser = driver.username?.trim().toLowerCase();

    const existingById = driver.id ? drivers.find((d) => d.id === driver.id) : null;
    const existingByUser = !driver.id && cleanUser ? drivers.find((d) => d.username?.toLowerCase() === cleanUser) : null;
    const target = existingById || existingByUser;
    const isNew = !target;

    if (target) {
      const idx = drivers.findIndex((d) => d.id === target.id);
      const updateData: Partial<Profile> = { ...driver, id: target.id };
      if (!driver.password) {
        delete updateData.password;
      }
      resultDriver = { ...target, ...updateData } as Profile;
      if (idx !== -1) {
        drivers[idx] = resultDriver;
      } else {
        drivers.unshift(resultDriver);
      }
    } else {
      resultDriver = {
        id: generateUUID(),
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
      drivers.unshift(resultDriver);
    }
    setItem(STORAGE_KEYS.DRIVERS, drivers);

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      
      const persistProfile = (targetId: string) => {
        const payload: Record<string, any> = {
          id: targetId,
          name: resultDriver.full_name,
          phone: resultDriver.phone || null,
          role: 'DRIVER',
          status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
        };
        if (resultDriver.username) payload.username = resultDriver.username;
        if (resultDriver.password) payload.password = resultDriver.password;

        supabase.from('profiles').upsert(payload).then(({ error }) => {
          if (error) {
            console.error('Supabase direct profile save error:', error);
          } else {
            const rawCode = (resultDriver.username || resultDriver.full_name || '001')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 10);
            const driverCode = 'DRV-' + (rawCode || targetId.slice(0, 6).toUpperCase());
            supabase.from('drivers').upsert({
              id: targetId,
              user_id: targetId,
              driver_id_code: driverCode,
              status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
            }).then(({ error: dErr }) => {
              if (dErr) console.error('Supabase direct drivers upsert error:', dErr);
            });
          }
        });
      };

      // Persist profile immediately to Supabase Cloud Database
      persistProfile(resultDriver.id);

      // Optionally register with Supabase Auth in background if credentials provided
      if (isNew && resultDriver.username && resultDriver.password) {
        const email = resultDriver.username.includes('@') 
          ? resultDriver.username 
          : `${resultDriver.username.replace(/[^a-zA-Z0-9]/g, '')}@fleetapp.com`;
        
        supabase.auth.signUp({
          email,
          password: resultDriver.password,
        }).then(({ data, error }) => {
          if (!error && data?.user?.id && data.user.id !== resultDriver.id) {
            const oldId = resultDriver.id;
            resultDriver.id = data.user.id;
            const updatedDrivers = this.getDrivers().map((d) => (d.id === oldId ? resultDriver : d));
            setItem(STORAGE_KEYS.DRIVERS, updatedDrivers);
            persistProfile(data.user.id);
          }
        }).catch(() => {});
      }
    }

    return resultDriver;
  }

  static async deleteDriverAsync(id: string): Promise<boolean> {
    const drivers = this.getDrivers();
    const filteredDrivers = drivers.filter((d) => d.id !== id);
    setItem(STORAGE_KEYS.DRIVERS, filteredDrivers);

    // Track deleted driver ID so syncWithSupabase never restores it
    const deleted = getItem<string[]>(STORAGE_KEYS.DELETED_DRIVERS, []);
    if (!deleted.includes(id)) {
      deleted.push(id);
      setItem(STORAGE_KEYS.DELETED_DRIVERS, deleted);
    }

    const sessions = this.getDutySessions();
    const filteredSessions = sessions.filter((s) => s.driver_id !== id);
    setItem(STORAGE_KEYS.DUTY_SESSIONS, filteredSessions);

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      try {
        // First delete child records that might cause foreign key blocks
        await Promise.allSettled([
          supabase.from('fuel_expenses').delete().eq('driver_id', id),
          supabase.from('trips').delete().eq('driver_id', id),
          supabase.from('duty_sessions').delete().eq('driver_id', id),
          supabase.from('drivers').delete().eq('user_id', id),
          supabase.from('drivers').delete().eq('id', id),
        ]);
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
          console.error('Supabase direct profile delete error:', error);
          return false;
        }
      } catch (err) {
        console.error('Supabase deleteDriverAsync error:', err);
      }
    }

    const current = this.getCurrentUser();
    if (current && current.id === id) {
      this.logout();
    }
    return true;
  }

  static deleteDriver(id: string): void {
    this.deleteDriverAsync(id);
  }

  static toggleDriverStatus(id: string): void {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex((d) => d.id === id);
    if (idx !== -1) {
      drivers[idx].is_active = !drivers[idx].is_active;
      setItem(STORAGE_KEYS.DRIVERS, drivers);

      if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
        const supabase = createClient();
        supabase.from('profiles').update({ status: drivers[idx].is_active ? 'ACTIVE' : 'INACTIVE' }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggle driver status error:', error);
        });
      }
    }
  }

  static authenticateUser(usernameOrEmail: string, passwordInput: string): Profile | null {
    const query = usernameOrEmail.trim().toLowerCase();
    const pass = passwordInput.trim();

    const admin = this.getAdminProfile();
    const adminUserMatch =
      admin.username?.toLowerCase() === query ||
      (query === 'admin' && admin.username?.toLowerCase() === 'admin');
    const adminPassMatch = admin.password === pass;
    if (adminUserMatch && adminPassMatch && admin.is_active) {
      return admin;
    }

    const drivers = this.getDrivers();
    const matchedDriver = drivers.find((d) => {
      const uMatch = d.username?.toLowerCase() === query || d.full_name.toLowerCase().includes(query) || (d.phone && d.phone.includes(query));
      const pMatch = d.password ? d.password === pass : true;
      return uMatch && pMatch && d.is_active;
    });

    return matchedDriver || null;
  }

  static async authenticateUserAsync(usernameOrEmail: string, passwordInput: string): Promise<Profile | null> {
    const query = usernameOrEmail.trim().toLowerCase();
    const pass = passwordInput.trim();

    const admin = this.getAdminProfile();
    const adminUserMatch =
      admin.username?.toLowerCase() === query ||
      (query === 'admin' && admin.username?.toLowerCase() === 'admin');
    const adminPassMatch = admin.password === pass;
    if (adminUserMatch && adminPassMatch && admin.is_active) {
      return admin;
    }

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: profiles, error } = await supabase.from('profiles').select('*');
        if (!error && Array.isArray(profiles)) {
          // Check for cloud admin
          const cloudAdmin = profiles.find((p: any) => p.role === 'ADMIN' || p.id === INITIAL_ADMIN.id);
          if (cloudAdmin) {
            const aUserMatch = (cloudAdmin.username && cloudAdmin.username.toLowerCase() === query) ||
                               (cloudAdmin.name && cloudAdmin.name.toLowerCase() === query) ||
                               (cloudAdmin.full_name && cloudAdmin.full_name.toLowerCase() === query);
            const aPassMatch = cloudAdmin.password ? cloudAdmin.password === pass : pass === 'admin123';
            if (aUserMatch && aPassMatch) {
              const syncedAdmin: Profile = {
                id: cloudAdmin.id || INITIAL_ADMIN.id,
                role: 'ADMIN',
                full_name: cloudAdmin.name || cloudAdmin.full_name || admin.full_name,
                username: cloudAdmin.username || admin.username || 'admin',
                password: cloudAdmin.password || admin.password || 'admin123',
                phone: cloudAdmin.phone || admin.phone || '9999999999',
                is_active: true,
                created_at: cloudAdmin.created_at || admin.created_at,
              };
              setItem(STORAGE_KEYS.ADMIN_PROFILE, syncedAdmin);
              return syncedAdmin;
            }
          }

          const matched = profiles.find((d: any) => {
            const isActive = d.status ? d.status === 'ACTIVE' : (d.is_active !== undefined ? d.is_active : true);
            if (!isActive) return false;

            const uMatch = (d.username && d.username.toLowerCase() === query) ||
                           (d.name && d.name.toLowerCase().includes(query)) ||
                           (d.full_name && d.full_name.toLowerCase().includes(query)) ||
                           (d.phone && d.phone.includes(query));
            const pMatch = d.password ? d.password === pass : true;
            return uMatch && pMatch;
          });
          if (matched) {
            return {
              id: matched.id,
              role: matched.role || 'DRIVER',
              full_name: matched.name || matched.full_name || 'Driver',
              username: matched.username,
              password: matched.password,
              phone: matched.phone,
              license_number: matched.license_number,
              assigned_vehicle_id: matched.assigned_vehicle_id,
              is_active: true,
              created_at: matched.created_at || new Date().toISOString(),
            };
          }
          // The database query succeeded and this user does not exist or was deleted.
          // DENY LOGIN! Do NOT fall back to local storage!
          return null;
        }
      } catch (err) {
        console.error('Supabase async auth check error:', err);
      }
    }

    return this.authenticateUser(usernameOrEmail, passwordInput);
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
    sessions.forEach((s) => {
      if (s.driver_id === driverId && s.status === 'ACTIVE') {
        s.status = 'COMPLETED';
        s.end_time = new Date().toISOString();
      }
    });

    const newSession: DutySession = {
      id: generateUUID(),
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

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase.from('duty_sessions').insert({
        id: newSession.id,
        driver_id: newSession.driver_id,
        session_date: getTodayDateIST(),
        start_time: newSession.start_time,
        end_time: null,
      }).then(({ error }) => {
        if (error) console.error('Supabase start duty insert error:', error);
      });
    }

    return newSession;
  }

  static endDuty(driverId: string): DutySession | null {
    const sessions = this.getDutySessions();
    const active = sessions.find((s) => s.driver_id === driverId && s.status === 'ACTIVE');
    if (!active) return null;

    active.status = 'COMPLETED';
    active.end_time = new Date().toISOString();
    setItem(STORAGE_KEYS.DUTY_SESSIONS, sessions);

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      const diffMs = active.start_time ? new Date(active.end_time).getTime() - new Date(active.start_time).getTime() : 0;
      const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      supabase.from('duty_sessions').update({
        end_time: active.end_time,
        total_working_minutes: totalMinutes,
      }).eq('id', active.id).then(({ error }) => {
        if (error) console.error('Supabase end duty update error:', error);
      });
    }

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
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    trips.unshift(newTrip);
    setItem(STORAGE_KEYS.TRIPS, trips);

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase.from('trips').insert({
        id: newTrip.id,
        driver_id: newTrip.driver_id,
        company_id: newTrip.company_id,
        vehicle_id: newTrip.vehicle_id || null,
        entered_km: newTrip.one_side_km,
        trip_type: newTrip.trip_type,
        km_multiplier: newTrip.multiplier || (newTrip.trip_type === 'TWO_SIDE' ? 1 : 2),
        total_km: newTrip.total_km,
        trip_date: newTrip.trip_date || getTodayDateIST(),
        notes: newTrip.notes || null,
      }).then(({ error }) => {
        if (error) console.error('Supabase direct trip insert error:', error);
      });
    }

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
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    fuelLogs.unshift(newFuel);
    setItem(STORAGE_KEYS.FUEL_LOGS, fuelLogs);

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();
      supabase.from('fuel_expenses').insert({
        id: newFuel.id,
        driver_id: newFuel.driver_id,
        vehicle_id: newFuel.vehicle_id || null,
        fuel_type: newFuel.fuel_type || 'CNG',
        amount: newFuel.amount,
        expense_date: newFuel.log_date || getTodayDateIST(),
        notes: newFuel.notes || null,
      }).then(({ error }) => {
        if (error) console.error('Supabase direct fuel insert error:', error);
      });
    }

    return newFuel;
  }

  // Today's Driver Summary
  static getDriverTodaySummary(driverId: string): DriverTodaySummary {
    const today = getTodayDateIST();
    const allSessions = this.getDutySessions();
    const sessions = Array.isArray(allSessions)
      ? allSessions.filter((s) => s && s.driver_id === driverId && s.start_time && String(s.start_time).startsWith(today))
      : [];

    const currentActive = this.getActiveDutySession(driverId);
    const primarySession = currentActive || sessions[0] || null;

    const startTime = primarySession ? primarySession.start_time : null;
    const endTime = primarySession?.end_time || null;

    const working = calculateWorkingHours(startTime, endTime);

    const allTrips = this.getTrips();
    const driverTripsToday = Array.isArray(allTrips)
      ? allTrips.filter((t) => t && t.driver_id === driverId && t.trip_date === today)
      : [];
    const totalTrips = driverTripsToday.length;
    const totalKm = driverTripsToday.reduce((sum, t) => sum + Number(t.total_km || 0), 0);

    const allFuel = this.getFuelLogs();
    const driverFuelToday = Array.isArray(allFuel)
      ? allFuel.filter((f) => f && f.driver_id === driverId && f.log_date === today)
      : [];
    const fuelExpense = driverFuelToday.reduce((sum, f) => sum + Number(f.amount || 0), 0);

    const fuelCostPerKm = totalKm > 0 ? parseFloat((fuelExpense / totalKm).toFixed(2)) : 0;

    return {
      dutySession: primarySession,
      startTime,
      endTime,
      workingHoursText: working?.text || '0h 00m',
      workingHoursDecimal: working?.hoursDecimal || 0,
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
    const activeDriverIds = new Set(drivers.filter((d) => d.is_active).map((d) => d.id));
    const totalDrivers = drivers.length;
    const activeDrivers = activeDriverIds.size;

    // Only count active duty sessions belonging to existing, active drivers
    const activeSessions = this.getDutySessions().filter(
      (s) => s.status === 'ACTIVE' && activeDriverIds.has(s.driver_id)
    );
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

    const assignedFuelDates = new Set<string>();

    const items: DetailedReportItem[] = filteredTrips.map((t) => {
      const driver = driverMap.get(t.driver_id);
      const company = companyMap.get(t.company_id);
      const vehicle = t.vehicle_id ? vehicleMap.get(t.vehicle_id) : undefined;

      const dateKey = `${t.driver_id}_${t.trip_date}`;
      let fuelOnDate = 0;
      if (!assignedFuelDates.has(dateKey)) {
        fuelOnDate = fuelLogs
          .filter((f) => f.driver_id === t.driver_id && f.log_date === t.trip_date)
          .reduce((sum, f) => sum + Number(f.amount || 0), 0);
        assignedFuelDates.add(dateKey);
      }

      const ratePerKm = Number(company?.billing_rate_per_km || 0);
      const totalKm = Number(t.total_km || 0);
      const earnings = parseFloat((totalKm * ratePerKm).toFixed(2));
      const netProfit = parseFloat((earnings - fuelOnDate).toFixed(2));

      return {
        id: t.id,
        trip_date: t.trip_date,
        driver_name: driver?.full_name || 'Unknown Driver',
        driver_phone: driver?.phone,
        vehicle_reg: vehicle?.registration_number,
        company_name: company?.name || 'Unknown Company',
        billing_rate_per_km: ratePerKm,
        trip_type: t.trip_type,
        one_side_km: Number(t.one_side_km),
        multiplier: t.multiplier,
        total_km: totalKm,
        earnings: earnings,
        fuel_amount: fuelOnDate,
        net_profit: netProfit,
        created_at: t.created_at,
        notes: t.notes,
      };
    });

    // Also include fuel expenses where driver had no trips on that day
    if (filters.companyId === 'ALL') {
      const filteredFuel = fuelLogs.filter((f) => {
        if (filters.startDate && f.log_date < filters.startDate) return false;
        if (filters.endDate && f.log_date > filters.endDate) return false;
        if (filters.driverId !== 'ALL' && f.driver_id !== filters.driverId) return false;
        const dateKey = `${f.driver_id}_${f.log_date}`;
        return !assignedFuelDates.has(dateKey);
      });

      const standaloneMap = new Map<string, { driver_id: string; log_date: string; amount: number; notes?: string; vehicle_id?: string }>();
      for (const f of filteredFuel) {
        const key = `${f.driver_id}_${f.log_date}`;
        const existing = standaloneMap.get(key);
        if (existing) {
          existing.amount += Number(f.amount || 0);
        } else {
          standaloneMap.set(key, {
            driver_id: f.driver_id,
            log_date: f.log_date,
            amount: Number(f.amount || 0),
            notes: f.notes,
            vehicle_id: f.vehicle_id,
          });
        }
      }

      standaloneMap.forEach((entry, key) => {
        const driver = driverMap.get(entry.driver_id);
        const vehicle = entry.vehicle_id ? vehicleMap.get(entry.vehicle_id) : undefined;
        items.push({
          id: `fuel-${key}`,
          trip_date: entry.log_date,
          driver_name: driver?.full_name || 'Unknown Driver',
          driver_phone: driver?.phone,
          vehicle_reg: vehicle?.registration_number,
          company_name: 'Fuel Log (Direct)',
          billing_rate_per_km: 0,
          trip_type: 'ONE_SIDE',
          one_side_km: 0,
          multiplier: 1,
          total_km: 0,
          earnings: 0,
          fuel_amount: entry.amount,
          net_profit: -entry.amount,
          created_at: entry.log_date + 'T12:00:00.000Z',
          notes: entry.notes || 'Fuel Purchase',
        });
      });
    }

    return items.sort((a, b) => (b.trip_date > a.trip_date ? 1 : b.trip_date < a.trip_date ? -1 : 0));
  }
}
