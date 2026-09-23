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
  DutySessionReportItem,
  LoginAuditItem,
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
  LOGIN_AUDITS: 'fleet_login_audits_v1',
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
      const [vRes, cRes, pRes, dRes, tRes, fRes, drvRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('companies').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('duty_sessions').select('*'),
        supabase.from('trips').select('*'),
        supabase.from('fuel_expenses').select('*'),
        supabase.from('drivers').select('*'),
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
      
      // Build a map of driver ID/user_id to vehicle_id from Supabase drivers table
      const driverVehicleMap = new Map<string, string | null>();
      if (Array.isArray(drvRes.data)) {
        for (const drv of drvRes.data) {
          if (drv.id) driverVehicleMap.set(drv.id, drv.vehicle_id || null);
          if (drv.user_id) driverVehicleMap.set(drv.user_id, drv.vehicle_id || null);
        }
      }

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
            
            // Resolve assigned vehicle:
            // 1. Check Supabase drivers table mapping by id or user_id
            // 2. Check row.assigned_vehicle_id or row.vehicle_id
            // 3. Fallback to existing local driver assignment
            let resolvedVehicleId: string | undefined = undefined;
            if (driverVehicleMap.has(row.id)) {
              resolvedVehicleId = driverVehicleMap.get(row.id) || undefined;
            } else if (row.user_id && driverVehicleMap.has(row.user_id)) {
              resolvedVehicleId = driverVehicleMap.get(row.user_id) || undefined;
            } else if (row.assigned_vehicle_id) {
              resolvedVehicleId = row.assigned_vehicle_id;
            } else if (row.vehicle_id) {
              resolvedVehicleId = row.vehicle_id;
            } else if (existingLocal?.assigned_vehicle_id) {
              resolvedVehicleId = existingLocal.assigned_vehicle_id;
            }

            cloudProfiles.push({
              id: row.id,
              role: 'DRIVER' as const,
              full_name: row.full_name || row.name || 'Unnamed Driver',
              phone: row.phone || existingLocal?.phone || '',
              username: row.username || existingLocal?.username || (row.name ? row.name.toLowerCase().replace(/\s+/g, '') : undefined),
              password: row.password || existingLocal?.password,
              license_number: row.license_number || existingLocal?.license_number,
              assigned_vehicle_id: resolvedVehicleId,
              is_active: row.status ? row.status === 'ACTIVE' : (row.is_active !== undefined ? row.is_active : true),
              created_at: row.created_at || existingLocal?.created_at || new Date().toISOString(),
            });
          }
        }
        setItem(STORAGE_KEYS.DRIVERS, cloudProfiles);

        // If the currently logged-in user is a driver, keep their session profile in sync
        const current = this.getCurrentUser();
        if (current && current.role === 'DRIVER') {
          const matchedProfile = cloudProfiles.find((d) => d.id === current.id && d.is_active);
          if (!matchedProfile) {
            this.logout();
          } else {
            this.setCurrentUser({
              ...current,
              ...matchedProfile,
            });
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
          multiplier: (Number(row.km_multiplier) === 1 || row.trip_type === 'TWO_SIDE' ? 1 : 2) as (1 | 2),
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

  static async saveDriverAsync(driver: Partial<Profile> & { full_name: string }): Promise<Profile> {
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

    // If current logged-in user is this driver, keep session updated immediately
    const current = this.getCurrentUser();
    if (current && current.id === resultDriver.id) {
      this.setCurrentUser({
        ...current,
        ...resultDriver,
      });
    }

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const targetId = resultDriver.id;

        const payload: Record<string, any> = {
          id: targetId,
          name: resultDriver.full_name,
          phone: resultDriver.phone || null,
          role: 'DRIVER',
          status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
        };
        if (resultDriver.username) payload.username = resultDriver.username;
        if (resultDriver.password) payload.password = resultDriver.password;

        const { error: pErr } = await supabase.from('profiles').upsert(payload);
        if (pErr) console.error('Supabase direct profile save error:', pErr);

        const rawCode = (resultDriver.username || resultDriver.full_name || '001')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 10);
        const driverCode = 'DRV-' + (rawCode || targetId.slice(0, 6).toUpperCase());
        const targetVehId = resultDriver.assigned_vehicle_id || null;

        // Upsert to drivers table with vehicle_id
        const { error: dErr } = await supabase.from('drivers').upsert({
          id: targetId,
          user_id: targetId,
          driver_id_code: driverCode,
          vehicle_id: targetVehId,
          status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
        });
        if (dErr) console.error('Supabase direct drivers upsert error:', dErr);

        // Also run direct update on drivers table to guarantee vehicle_id is written regardless of primary keying
        await supabase.from('drivers').update({
          vehicle_id: targetVehId,
          status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
        }).or(`id.eq.${targetId},user_id.eq.${targetId}`);

        // Try updating profiles.assigned_vehicle_id if column exists
        try {
          await supabase.from('profiles').update({
            assigned_vehicle_id: targetVehId,
          }).eq('id', targetId);
        } catch {
          // profiles.assigned_vehicle_id column optional
        }

        // Background auth signup if new driver with credentials
        if (isNew && resultDriver.username && resultDriver.password) {
          const email = resultDriver.username.includes('@') 
            ? resultDriver.username 
            : `${resultDriver.username.replace(/[^a-zA-Z0-9]/g, '')}@fleetapp.com`;
          
          supabase.auth.signUp({
            email,
            password: resultDriver.password,
          }).then(async ({ data, error }) => {
            if (!error && data?.user?.id && data.user.id !== resultDriver.id) {
              const oldId = resultDriver.id;
              resultDriver.id = data.user.id;
              const updatedDrivers = this.getDrivers().map((d) => (d.id === oldId ? resultDriver : d));
              setItem(STORAGE_KEYS.DRIVERS, updatedDrivers);
              
              await supabase.from('profiles').upsert({
                id: data.user.id,
                name: resultDriver.full_name,
                phone: resultDriver.phone || null,
                role: 'DRIVER',
                status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
                username: resultDriver.username,
                password: resultDriver.password,
              });

              await supabase.from('drivers').upsert({
                id: data.user.id,
                user_id: data.user.id,
                driver_id_code: driverCode,
                vehicle_id: targetVehId,
                status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
              });
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Supabase saveDriverAsync error:', err);
      }
    }

    return resultDriver;
  }

  static saveDriver(driver: Partial<Profile> & { full_name: string }): Profile {
    const drivers = this.getDrivers();
    let resultDriver: Profile;
    const cleanUser = driver.username?.trim().toLowerCase();

    const existingById = driver.id ? drivers.find((d) => d.id === driver.id) : null;
    const existingByUser = !driver.id && cleanUser ? drivers.find((d) => d.username?.toLowerCase() === cleanUser) : null;
    const target = existingById || existingByUser;

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

    // Call async persistence in background
    this.saveDriverAsync(driver).catch((e) => console.error('saveDriver background error:', e));

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
        const newStatus = drivers[idx].is_active ? 'ACTIVE' : 'INACTIVE';
        supabase.from('profiles').update({ status: newStatus }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggle driver status error:', error);
        });
        supabase.from('drivers').update({ status: newStatus }).or(`id.eq.${id},user_id.eq.${id}`).then(({ error }) => {
          if (error) console.error('Supabase toggle drivers table status error:', error);
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
            let assignedVehId = matched.assigned_vehicle_id;

            // Guarantee that this driver has a matching row in public.drivers table
            // so trips, duty_sessions, and fuel_expenses foreign keys will never fail
            if (matched.role !== 'ADMIN') {
              const rawCode = (matched.username || matched.name || '001')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 10);
              const driverCode = 'DRV-' + (rawCode || matched.id.slice(0, 6).toUpperCase());

              // Look up drivers table to get current vehicle_id
              const { data: drvRow } = await supabase
                .from('drivers')
                .select('*')
                .or(`id.eq.${matched.id},user_id.eq.${matched.id}`)
                .maybeSingle();

              if (drvRow?.vehicle_id) {
                assignedVehId = drvRow.vehicle_id;
              }

              await supabase.from('drivers').upsert({
                id: matched.id,
                user_id: matched.id,
                driver_id_code: drvRow?.driver_id_code || driverCode,
                vehicle_id: assignedVehId || null,
                status: 'ACTIVE',
              });
            }

            const driverProfile: Profile = {
              id: matched.id,
              role: matched.role || 'DRIVER',
              full_name: matched.name || matched.full_name || 'Driver',
              username: matched.username,
              password: matched.password,
              phone: matched.phone,
              license_number: matched.license_number,
              assigned_vehicle_id: assignedVehId,
              is_active: true,
              created_at: matched.created_at || new Date().toISOString(),
            };

            this.setCurrentUser(driverProfile);
            return driverProfile;
          }
          // The database query succeeded and this user does not exist or was deleted.
          return null;
        }
      } catch (err) {
        console.error('Supabase async auth check error:', err);
      }
    }

    return this.authenticateUser(usernameOrEmail, passwordInput);
  }

  // Duty Sessions
  static async fetchDutySessionsAsync(): Promise<DutySession[]> {
    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('duty_sessions')
          .select('*')
          .order('start_time', { ascending: false });

        if (!error && Array.isArray(data)) {
          const sessions: DutySession[] = data.map((d: any) => ({
            id: d.id,
            driver_id: d.driver_id,
            vehicle_id: d.vehicle_id,
            start_time: d.start_time,
            end_time: d.end_time,
            status: !d.end_time ? 'ACTIVE' : 'COMPLETED',
            notes: d.notes,
            created_at: d.created_at || d.start_time,
          }));
          setItem(STORAGE_KEYS.DUTY_SESSIONS, sessions);
          return sessions;
        }
      } catch (err) {
        console.error('Supabase fetchDutySessionsAsync error:', err);
      }
    }
    return this.getDutySessions();
  }

  static getDutySessions(): DutySession[] {
    return getItem<DutySession[]>(STORAGE_KEYS.DUTY_SESSIONS, INITIAL_DUTY_SESSIONS);
  }

  static async getActiveDutySessionAsync(driverId: string): Promise<DutySession | null> {
    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('duty_sessions')
          .select('*')
          .eq('driver_id', driverId)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            driver_id: data.driver_id,
            vehicle_id: data.vehicle_id,
            start_time: data.start_time,
            end_time: data.end_time,
            status: 'ACTIVE',
            notes: data.notes,
            created_at: data.created_at || data.start_time,
          };
        } else if (!error && !data) {
          return null;
        }
      } catch (err) {
        console.error('Supabase getActiveDutySessionAsync error:', err);
      }
    }
    return this.getActiveDutySession(driverId);
  }

  static getActiveDutySession(driverId: string): DutySession | null {
    const sessions = this.getDutySessions();
    return (
      sessions.find((s) => s.driver_id === driverId && s.status === 'ACTIVE') || null
    );
  }

  static async startDutyAsync(driverId: string, vehicleId?: string, notes?: string): Promise<DutySession> {
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

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        // Ensure driver exists in drivers table
        const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', driverId).maybeSingle();
        if (!drvCheck) {
          const { data: drvUserCheck } = await supabase.from('drivers').select('id').eq('user_id', driverId).maybeSingle();
          if (!drvUserCheck) {
            await supabase.from('drivers').insert({
              id: driverId,
              user_id: driverId,
              driver_id_code: 'DRV-' + driverId.slice(0, 6).toUpperCase(),
              status: 'ACTIVE',
            });
          }
        }

        // Close any currently active sessions for this driver in Supabase
        await supabase.from('duty_sessions').update({
          end_time: new Date().toISOString(),
        }).eq('driver_id', driverId).is('end_time', null);

        const { data, error } = await supabase.from('duty_sessions').insert({
          id: newSession.id,
          driver_id: newSession.driver_id,
          session_date: getTodayDateIST(),
          start_time: newSession.start_time,
          end_time: null,
        }).select().single();

        if (error) {
          console.error('Supabase start duty insert error:', error);
        } else if (data) {
          newSession.id = data.id;
        }
      } catch (err) {
        console.error('Supabase startDutyAsync error:', err);
      }
    }

    const sessions = this.getDutySessions();
    sessions.forEach((s) => {
      if (s.driver_id === driverId && s.status === 'ACTIVE') {
        s.status = 'COMPLETED';
        s.end_time = new Date().toISOString();
      }
    });
    sessions.unshift(newSession);
    setItem(STORAGE_KEYS.DUTY_SESSIONS, sessions);

    return newSession;
  }

  static startDuty(driverId: string, vehicleId?: string, notes?: string): DutySession {
    this.startDutyAsync(driverId, vehicleId, notes);
    const sessions = this.getDutySessions();
    return sessions[0] || {
      id: generateUUID(),
      driver_id: driverId,
      vehicle_id: vehicleId,
      start_time: new Date().toISOString(),
      end_time: null,
      status: 'ACTIVE',
      notes,
      created_at: new Date().toISOString(),
    };
  }

  static async endDutyAsync(driverId: string): Promise<DutySession | null> {
    const sessions = this.getDutySessions();
    const active = sessions.find((s) => s.driver_id === driverId && s.status === 'ACTIVE');
    const nowIso = new Date().toISOString();

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const diffMs = active?.start_time ? new Date(nowIso).getTime() - new Date(active.start_time).getTime() : 0;
        const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

        if (active?.id) {
          await supabase.from('duty_sessions').update({
            end_time: nowIso,
            total_working_minutes: totalMinutes,
          }).eq('id', active.id);
        } else {
          await supabase.from('duty_sessions').update({
            end_time: nowIso,
            total_working_minutes: totalMinutes,
          }).eq('driver_id', driverId).is('end_time', null);
        }
      } catch (err) {
        console.error('Supabase endDutyAsync error:', err);
      }
    }

    if (active) {
      active.status = 'COMPLETED';
      active.end_time = nowIso;
      setItem(STORAGE_KEYS.DUTY_SESSIONS, sessions);
    }
    return active || null;
  }

  static endDuty(driverId: string): DutySession | null {
    this.endDutyAsync(driverId);
    const sessions = this.getDutySessions();
    const active = sessions.find((s) => s.driver_id === driverId && s.status === 'ACTIVE');
    if (active) {
      active.status = 'COMPLETED';
      active.end_time = new Date().toISOString();
      setItem(STORAGE_KEYS.DUTY_SESSIONS, sessions);
    }
    return active || null;
  }

  // Trips (Cloud-First)
  static getTrips(): Trip[] {
    return getItem<Trip[]>(STORAGE_KEYS.TRIPS, INITIAL_TRIPS);
  }

  static async fetchTripsAsync(): Promise<Trip[]> {
    if (typeof window === 'undefined' || !isLiveSupabaseConfigured()) {
      return this.getTrips();
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const cloudTrips: Trip[] = data.map((row: any) => ({
          id: row.id,
          driver_id: row.driver_id,
          company_id: row.company_id,
          vehicle_id: row.vehicle_id,
          duty_session_id: row.duty_session_id,
          one_side_km: Number(row.entered_km || row.one_side_km || 0),
          trip_type: row.trip_type || 'ONE_SIDE',
          multiplier: (Number(row.km_multiplier) === 1 || row.trip_type === 'TWO_SIDE' ? 1 : 2) as (1 | 2),
          total_km: Number(row.total_km || 0),
          trip_date: row.trip_date || (row.created_at ? row.created_at.split('T')[0] : getTodayDateIST()),
          notes: row.notes,
          created_at: row.created_at || new Date().toISOString(),
        }));
        setItem(STORAGE_KEYS.TRIPS, cloudTrips);
        return cloudTrips;
      }
    } catch (err) {
      console.error('Supabase fetchTripsAsync error:', err);
    }
    return this.getTrips();
  }

  static async addTripAsync(trip: Omit<Trip, 'id' | 'created_at'>): Promise<Trip> {
    const newId = generateUUID();
    const today = trip.trip_date || getTodayDateIST();
    const newTrip: Trip = {
      ...trip,
      id: newId,
      trip_date: today,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();

      // Ensure driver exists in drivers table to satisfy foreign key constraint
      const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', newTrip.driver_id).maybeSingle();
      if (!drvCheck) {
        const { data: drvUserCheck } = await supabase.from('drivers').select('id').eq('user_id', newTrip.driver_id).maybeSingle();
        if (!drvUserCheck) {
          await supabase.from('drivers').insert({
            id: newTrip.driver_id,
            user_id: newTrip.driver_id,
            driver_id_code: 'DRV-' + newTrip.driver_id.slice(0, 6).toUpperCase(),
            status: 'ACTIVE',
          });
        }
      }

      const { data, error } = await supabase.from('trips').insert({
        id: newTrip.id,
        driver_id: newTrip.driver_id,
        company_id: newTrip.company_id,
        vehicle_id: newTrip.vehicle_id || null,
        entered_km: newTrip.one_side_km,
        trip_type: newTrip.trip_type,
        km_multiplier: newTrip.multiplier || (newTrip.trip_type === 'TWO_SIDE' ? 1 : 2),
        total_km: newTrip.total_km,
        trip_date: today,
        notes: newTrip.notes || null,
      }).select().single();

      if (error) {
        console.error('Supabase direct trip insert error:', error);
        throw new Error(error.message || 'Failed to save trip to cloud database');
      }

      if (data) {
        newTrip.id = data.id;
        newTrip.created_at = data.created_at || newTrip.created_at;
      }
    }

    const trips = this.getTrips();
    trips.unshift(newTrip);
    setItem(STORAGE_KEYS.TRIPS, trips);

    return newTrip;
  }

  static addTrip(trip: Omit<Trip, 'id' | 'created_at'>): Trip {
    this.addTripAsync(trip).catch((err) => console.error('addTrip fallback error:', err));
    const trips = this.getTrips();
    const newTrip: Trip = {
      ...trip,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    trips.unshift(newTrip);
    setItem(STORAGE_KEYS.TRIPS, trips);
    return newTrip;
  }

  // Fuel Logs (Cloud-First)
  static getFuelLogs(): FuelLog[] {
    return getItem<FuelLog[]>(STORAGE_KEYS.FUEL_LOGS, INITIAL_FUEL_LOGS);
  }

  static async fetchFuelLogsAsync(): Promise<FuelLog[]> {
    if (typeof window === 'undefined' || !isLiveSupabaseConfigured()) {
      return this.getFuelLogs();
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('fuel_expenses').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const cloudFuel: FuelLog[] = data.map((row: any) => ({
          id: row.id,
          driver_id: row.driver_id,
          vehicle_id: row.vehicle_id,
          duty_session_id: row.duty_session_id,
          fuel_type: row.fuel_type || 'CNG',
          amount: Number(row.amount || 0),
          liters_or_kg: row.liters_or_kg || row.quantity,
          log_date: row.expense_date || (row.created_at ? row.created_at.split('T')[0] : getTodayDateIST()),
          notes: row.notes,
          created_at: row.created_at || new Date().toISOString(),
        }));
        setItem(STORAGE_KEYS.FUEL_LOGS, cloudFuel);
        return cloudFuel;
      }
    } catch (err) {
      console.error('Supabase fetchFuelLogsAsync error:', err);
    }
    return this.getFuelLogs();
  }

  static async addFuelLogAsync(fuel: Omit<FuelLog, 'id' | 'created_at'>): Promise<FuelLog> {
    const newId = generateUUID();
    const today = fuel.log_date || getTodayDateIST();
    const newFuel: FuelLog = {
      ...fuel,
      id: newId,
      log_date: today,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      const supabase = createClient();

      // Ensure driver exists in drivers table
      const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', newFuel.driver_id).maybeSingle();
      if (!drvCheck) {
        const { data: drvUserCheck } = await supabase.from('drivers').select('id').eq('user_id', newFuel.driver_id).maybeSingle();
        if (!drvUserCheck) {
          await supabase.from('drivers').insert({
            id: newFuel.driver_id,
            user_id: newFuel.driver_id,
            driver_id_code: 'DRV-' + newFuel.driver_id.slice(0, 6).toUpperCase(),
            status: 'ACTIVE',
          });
        }
      }

      const { data, error } = await supabase.from('fuel_expenses').insert({
        id: newFuel.id,
        driver_id: newFuel.driver_id,
        vehicle_id: newFuel.vehicle_id || null,
        fuel_type: newFuel.fuel_type || 'CNG',
        amount: newFuel.amount,
        expense_date: today,
        notes: newFuel.notes || null,
      }).select().single();

      if (error) {
        console.error('Supabase direct fuel insert error:', error);
        throw new Error(error.message || 'Failed to save fuel expense to cloud database');
      }

      if (data) {
        newFuel.id = data.id;
        newFuel.created_at = data.created_at || newFuel.created_at;
      }
    }

    const fuelLogs = this.getFuelLogs();
    fuelLogs.unshift(newFuel);
    setItem(STORAGE_KEYS.FUEL_LOGS, fuelLogs);

    return newFuel;
  }

  static addFuelLog(fuel: Omit<FuelLog, 'id' | 'created_at'>): FuelLog {
    this.addFuelLogAsync(fuel).catch((err) => console.error('addFuelLog fallback error:', err));
    const fuelLogs = this.getFuelLogs();
    const newFuel: FuelLog = {
      ...fuel,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    fuelLogs.unshift(newFuel);
    setItem(STORAGE_KEYS.FUEL_LOGS, fuelLogs);
    return newFuel;
  }

  // Today's Driver Summary (Cloud-First)
  static async fetchDriverTodaySummaryAsync(driverId: string): Promise<DriverTodaySummary> {
    const today = getTodayDateIST();

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const [dRes, tRes, fRes] = await Promise.all([
          supabase.from('duty_sessions').select('*').eq('driver_id', driverId),
          supabase.from('trips').select('*').eq('driver_id', driverId).eq('trip_date', today),
          supabase.from('fuel_expenses').select('*').eq('driver_id', driverId).eq('expense_date', today),
        ]);

        const sessions = Array.isArray(dRes.data) ? dRes.data : [];
        const activeSession = sessions.find((s: any) => !s.end_time);
        const todaySessions = sessions.filter((s: any) => s.session_date === today || (s.start_time && String(s.start_time).startsWith(today)));
        const primarySession = activeSession || todaySessions[0] || null;

        const startTime = primarySession ? primarySession.start_time : null;
        const endTime = primarySession?.end_time || null;
        const working = calculateWorkingHours(startTime, endTime);

        const trips = Array.isArray(tRes.data) ? tRes.data : [];
        const totalTrips = trips.length;
        const totalKm = trips.reduce((sum: number, t: any) => sum + Number(t.total_km || 0), 0);

        const fuel = Array.isArray(fRes.data) ? fRes.data : [];
        const fuelExpense = fuel.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
        const fuelCostPerKm = totalKm > 0 ? parseFloat((fuelExpense / totalKm).toFixed(2)) : 0;

        return {
          dutySession: primarySession ? {
            id: primarySession.id,
            driver_id: primarySession.driver_id,
            vehicle_id: primarySession.vehicle_id,
            start_time: primarySession.start_time,
            end_time: primarySession.end_time,
            status: primarySession.end_time ? 'COMPLETED' : 'ACTIVE',
            notes: primarySession.notes,
            created_at: primarySession.created_at || primarySession.start_time,
          } : null,
          startTime,
          endTime,
          workingHoursText: working?.text || '0h 00m',
          workingHoursDecimal: working?.hoursDecimal || 0,
          totalTrips,
          totalKm,
          fuelExpense,
          fuelCostPerKm,
        };
      } catch (err) {
        console.error('Supabase fetchDriverTodaySummaryAsync error:', err);
      }
    }

    return this.getDriverTodaySummary(driverId);
  }

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

  // Admin Metrics (Cloud-First)
  static async fetchAdminMetricsAsync(): Promise<AdminSummaryMetrics> {
    const today = getTodayDateIST();

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const [pRes, dRes, tRes, fRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('role', 'DRIVER'),
          supabase.from('duty_sessions').select('*'),
          supabase.from('trips').select('*').eq('trip_date', today),
          supabase.from('fuel_expenses').select('*').eq('expense_date', today),
        ]);

        const drivers = Array.isArray(pRes.data) ? pRes.data : [];
        const totalDrivers = drivers.length;
        const activeDrivers = drivers.filter((d: any) => (d.status ? d.status === 'ACTIVE' : d.is_active !== false)).length;

        const duty = Array.isArray(dRes.data) ? dRes.data : [];
        const onDutyDrivers = duty.filter((s: any) => !s.end_time).length;

        const trips = Array.isArray(tRes.data) ? tRes.data : [];
        const todayTrips = trips.length;
        const todayKm = trips.reduce((sum: number, t: any) => sum + Number(t.total_km || 0), 0);

        const fuel = Array.isArray(fRes.data) ? fRes.data : [];
        const todayFuelExpense = fuel.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
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
      } catch (err) {
        console.error('Supabase fetchAdminMetricsAsync error:', err);
      }
    }

    return this.getAdminMetrics();
  }

  static getAdminMetrics(): AdminSummaryMetrics {
    const today = getTodayDateIST();
    const drivers = this.getDrivers();
    const activeDriverIds = new Set(drivers.filter((d) => d.is_active).map((d) => d.id));
    const totalDrivers = drivers.length;
    const activeDrivers = activeDriverIds.size;

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

  // Filtered Reports Data (Cloud-First)
  static async fetchDetailedReportsAsync(filters: ReportFilterCriteria): Promise<DetailedReportItem[]> {
    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const [tRes, fRes, pRes, cRes, vRes] = await Promise.all([
          supabase.from('trips').select('*'),
          supabase.from('fuel_expenses').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('companies').select('*'),
          supabase.from('vehicles').select('*'),
        ]);

        const trips = Array.isArray(tRes.data) ? tRes.data : [];
        const fuelLogs = Array.isArray(fRes.data) ? fRes.data : [];
        const drivers = Array.isArray(pRes.data) ? pRes.data : [];
        const companies = Array.isArray(cRes.data) ? cRes.data : [];
        const vehicles = Array.isArray(vRes.data) ? vRes.data : [];

        const driverMap = new Map(drivers.map((d: any) => [d.id, d]));
        const companyMap = new Map(companies.map((c: any) => [c.id, c]));
        const vehicleMap = new Map(vehicles.map((v: any) => [v.id, v]));

        // Filter trips
        const filteredTrips = trips.filter((t: any) => {
          if (filters.startDate && t.trip_date < filters.startDate) return false;
          if (filters.endDate && t.trip_date > filters.endDate) return false;
          if (filters.driverId !== 'ALL' && t.driver_id !== filters.driverId) return false;
          if (filters.companyId !== 'ALL' && t.company_id !== filters.companyId) return false;
          return true;
        });

        const assignedFuelDates = new Set<string>();

        const items: DetailedReportItem[] = filteredTrips.map((t: any) => {
          const driver = driverMap.get(t.driver_id);
          const company = companyMap.get(t.company_id);
          const vehicle = t.vehicle_id ? vehicleMap.get(t.vehicle_id) : undefined;

          const dateKey = `${t.driver_id}_${t.trip_date}`;
          let fuelOnDate = 0;
          if (!assignedFuelDates.has(dateKey)) {
            fuelOnDate = fuelLogs
              .filter((f: any) => f.driver_id === t.driver_id && (f.expense_date === t.trip_date || f.log_date === t.trip_date))
              .reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
            assignedFuelDates.add(dateKey);
          }

          let ratePerKm = 0;
          if (company?.notes && !isNaN(parseFloat(company.notes))) {
            ratePerKm = parseFloat(company.notes);
          } else if (company?.billing_rate_per_km !== undefined) {
            ratePerKm = Number(company.billing_rate_per_km) || 0;
          }

          const totalKm = Number(t.total_km || 0);
          const earnings = parseFloat((totalKm * ratePerKm).toFixed(2));
          const netProfit = parseFloat((earnings - fuelOnDate).toFixed(2));

          return {
            id: t.id,
            trip_date: t.trip_date,
            driver_name: driver?.name || driver?.full_name || 'Driver',
            driver_phone: driver?.phone,
            vehicle_reg: vehicle?.registration_number,
            company_name: company?.company_name || company?.name || 'Client',
            billing_rate_per_km: ratePerKm,
            trip_type: t.trip_type || 'ONE_SIDE',
            one_side_km: Number(t.entered_km || t.one_side_km || 0),
            multiplier: Number(t.km_multiplier || (t.trip_type === 'TWO_SIDE' ? 1 : 2)),
            total_km: totalKm,
            earnings: earnings,
            fuel_amount: fuelOnDate,
            net_profit: netProfit,
            created_at: t.created_at || new Date().toISOString(),
            notes: t.notes,
          };
        });

        // Also include standalone fuel expenses where driver had no trips on that day
        if (filters.companyId === 'ALL') {
          const filteredFuel = fuelLogs.filter((f: any) => {
            const fDate = f.expense_date || f.log_date;
            if (filters.startDate && fDate < filters.startDate) return false;
            if (filters.endDate && fDate > filters.endDate) return false;
            if (filters.driverId !== 'ALL' && f.driver_id !== filters.driverId) return false;
            const dateKey = `${f.driver_id}_${fDate}`;
            return !assignedFuelDates.has(dateKey);
          });

          const standaloneMap = new Map<string, { driver_id: string; log_date: string; amount: number; notes?: string; vehicle_id?: string }>();
          for (const f of filteredFuel) {
            const fDate = f.expense_date || f.log_date;
            const key = `${f.driver_id}_${fDate}`;
            const existing = standaloneMap.get(key);
            if (existing) {
              existing.amount += Number(f.amount || 0);
            } else {
              standaloneMap.set(key, {
                driver_id: f.driver_id,
                log_date: fDate,
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
              driver_name: driver?.name || driver?.full_name || 'Driver',
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
      } catch (err) {
        console.error('Supabase fetchDetailedReportsAsync error:', err);
      }
    }

    return this.getDetailedReports(filters);
  }

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

  // ==========================================
  // WORKING HOURS & DUTY REPORTS
  // ==========================================
  static async fetchWorkingHoursReportsAsync(filters: ReportFilterCriteria): Promise<DutySessionReportItem[]> {
    let rawSessions: any[] = [];
    let drivers: Profile[] = this.getDrivers();
    let vehicles: Vehicle[] = this.getVehicles();
    let trips: Trip[] = this.getTrips();

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const [dRes, pRes, vRes, tRes, drvRes] = await Promise.all([
          supabase.from('duty_sessions').select('*').order('start_time', { ascending: false }),
          supabase.from('profiles').select('*'),
          supabase.from('vehicles').select('*'),
          supabase.from('trips').select('*'),
          supabase.from('drivers').select('*'),
        ]);

        const drvMap = new Map<string, string | null>();
        if (Array.isArray(drvRes.data)) {
          for (const drv of drvRes.data) {
            if (drv.id) drvMap.set(drv.id, drv.vehicle_id || null);
            if (drv.user_id) drvMap.set(drv.user_id, drv.vehicle_id || null);
          }
        }

        if (Array.isArray(dRes.data)) rawSessions = dRes.data;
        if (Array.isArray(pRes.data)) {
          drivers = pRes.data.map((p: any) => ({
            id: p.id,
            role: (p.role as 'ADMIN' | 'DRIVER') || 'DRIVER',
            full_name: p.full_name || p.name || 'Driver',
            username: p.username,
            password: p.password,
            phone: p.phone,
            license_number: p.license_number,
            assigned_vehicle_id: drvMap.get(p.id) || drvMap.get(p.user_id) || p.assigned_vehicle_id || undefined,
            is_active: p.status ? p.status === 'ACTIVE' : true,
            created_at: p.created_at || new Date().toISOString(),
          }));
        }
        if (Array.isArray(vRes.data)) {
          vehicles = vRes.data.map((v: any) => ({
            id: v.id,
            registration_number: v.registration_number,
            model: v.model,
            fuel_type: v.fuel_type || 'CNG',
            is_active: v.status ? v.status === 'ACTIVE' : true,
            created_at: v.created_at || new Date().toISOString(),
          }));
        }
        if (Array.isArray(tRes.data)) {
          trips = tRes.data.map((t: any) => ({
            id: t.id,
            driver_id: t.driver_id,
            company_id: t.company_id,
            vehicle_id: t.vehicle_id,
            duty_session_id: t.duty_session_id,
            one_side_km: Number(t.entered_km || t.one_side_km || 0),
            trip_type: t.trip_type || 'ONE_SIDE',
            multiplier: (Number(t.km_multiplier) === 1 || t.trip_type === 'TWO_SIDE' ? 1 : 2) as (1 | 2),
            total_km: Number(t.total_km || 0),
            trip_date: t.trip_date || (t.created_at ? t.created_at.split('T')[0] : getTodayDateIST()),
            notes: t.notes,
            created_at: t.created_at,
          }));
        }
      } catch (err) {
        console.error('Supabase fetchWorkingHoursReportsAsync error:', err);
      }
    }

    if (rawSessions.length === 0) {
      rawSessions = this.getDutySessions();
    }

    const driverMap = new Map(drivers.map((d) => [d.id, d]));
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    const items: DutySessionReportItem[] = [];

    for (const s of rawSessions) {
      const driver = driverMap.get(s.driver_id);
      const vehicleId = s.vehicle_id || driver?.assigned_vehicle_id;
      const vehicle = vehicleId ? vehicleMap.get(vehicleId) : undefined;
      const sessionDate = s.session_date || (s.start_time ? s.start_time.split('T')[0] : getTodayDateIST());

      // Filter by date
      if (filters.startDate && sessionDate < filters.startDate) continue;
      if (filters.endDate && sessionDate > filters.endDate) continue;

      // Filter by driver
      if (filters.driverId !== 'ALL' && s.driver_id !== filters.driverId) continue;

      const duration = calculateWorkingHours(s.start_time, s.end_time);
      const totalMinutes = s.total_working_minutes ? Number(s.total_working_minutes) : duration.totalMinutes;

      // Format human-readable duration
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const formattedDuration = `${hours}h ${mins.toString().padStart(2, '0')}m`;

      // Find trips related to this session/driver on this date
      const matchingTrips = trips.filter((t) =>
        t.duty_session_id === s.id || (t.driver_id === s.driver_id && t.trip_date === sessionDate)
      );
      const totalKm = matchingTrips.reduce((sum, t) => sum + (t.total_km || 0), 0);

      items.push({
        id: s.id,
        driver_id: s.driver_id,
        driver_name: driver?.full_name || 'Driver',
        driver_username: driver?.username,
        driver_phone: driver?.phone,
        session_date: sessionDate,
        start_time: s.start_time,
        end_time: s.end_time || null,
        total_minutes: totalMinutes,
        formatted_duration: formattedDuration,
        vehicle_reg: vehicle?.registration_number,
        vehicle_model: vehicle?.model,
        status: s.end_time ? 'COMPLETED' : 'ACTIVE',
        trips_count: matchingTrips.length,
        total_km: totalKm,
        notes: s.notes,
        created_at: s.created_at || s.start_time,
      });
    }

    return items.sort((a, b) => {
      const tA = new Date(a.start_time).getTime();
      const tB = new Date(b.start_time).getTime();
      return tB - tA;
    });
  }

  // ==========================================
  // LOGIN DETAILS & AUDIT TRACKING
  // ==========================================
  static async recordLoginAuditAsync(
    user: Profile,
    details?: { device?: string; ip?: string; method?: string }
  ): Promise<void> {
    const auditItem: LoginAuditItem = {
      id: generateUUID(),
      user_id: user.id,
      username: user.username || user.full_name.toLowerCase().replace(/\s+/g, ''),
      full_name: user.full_name,
      role: user.role,
      login_time: new Date().toISOString(),
      device_info: details?.device || 'Web Browser',
      status: 'SUCCESS',
      phone: user.phone || '',
      ip_address: details?.ip || 'Direct Session',
    };

    const localAudits = getItem<LoginAuditItem[]>(STORAGE_KEYS.LOGIN_AUDITS, []);
    localAudits.unshift(auditItem);
    setItem(STORAGE_KEYS.LOGIN_AUDITS, localAudits.slice(0, 200));

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('login_audits').insert({
          id: auditItem.id,
          user_id: auditItem.user_id,
          username: auditItem.username,
          full_name: auditItem.full_name,
          role: auditItem.role,
          login_time: auditItem.login_time,
          device_info: auditItem.device_info,
          status: auditItem.status,
          ip_address: auditItem.ip_address,
        });
      } catch (err) {
        // Safe fallback if login_audits table is not created in Supabase yet
      }
    }
  }

  static async fetchLoginAuditsAsync(filters: ReportFilterCriteria): Promise<LoginAuditItem[]> {
    let audits = getItem<LoginAuditItem[]>(STORAGE_KEYS.LOGIN_AUDITS, []);
    let drivers: Profile[] = this.getDrivers();
    let dutySessions: any[] = [];

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const [aRes, pRes, dRes, drvRes] = await Promise.all([
          supabase.from('login_audits').select('*').order('login_time', { ascending: false }),
          supabase.from('profiles').select('*'),
          supabase.from('duty_sessions').select('*').order('start_time', { ascending: false }),
          supabase.from('drivers').select('*'),
        ]);

        const drvMap = new Map<string, string | null>();
        if (Array.isArray(drvRes.data)) {
          for (const drv of drvRes.data) {
            if (drv.id) drvMap.set(drv.id, drv.vehicle_id || null);
            if (drv.user_id) drvMap.set(drv.user_id, drv.vehicle_id || null);
          }
        }

        if (Array.isArray(aRes.data) && aRes.data.length > 0) {
          audits = aRes.data.map((a: any) => ({
            id: a.id,
            user_id: a.user_id,
            username: a.username,
            full_name: a.full_name,
            role: a.role as 'ADMIN' | 'DRIVER',
            login_time: a.login_time,
            device_info: a.device_info || 'Web Portal',
            status: a.status || 'SUCCESS',
            ip_address: a.ip_address,
          }));
        }

        if (Array.isArray(pRes.data)) {
          drivers = pRes.data.map((p: any) => ({
            id: p.id,
            role: (p.role as 'ADMIN' | 'DRIVER') || 'DRIVER',
            full_name: p.full_name || p.name || 'Driver',
            username: p.username,
            password: p.password,
            phone: p.phone,
            license_number: p.license_number,
            assigned_vehicle_id: drvMap.get(p.id) || drvMap.get(p.user_id) || p.assigned_vehicle_id || undefined,
            is_active: p.status ? p.status === 'ACTIVE' : true,
            created_at: p.created_at || new Date().toISOString(),
          }));
        }

        if (Array.isArray(dRes.data)) {
          dutySessions = dRes.data;
        }
      } catch (err) {
        console.error('Supabase fetchLoginAuditsAsync error:', err);
      }
    }

    if (dutySessions.length === 0) {
      dutySessions = this.getDutySessions();
    }

    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    // Synthesize verified login timestamps from duty sessions (each clock-in is a login event)
    const syntheticDutyLogins: LoginAuditItem[] = [];
    for (const ds of dutySessions) {
      const driver = driverMap.get(ds.driver_id);
      if (ds.start_time) {
        syntheticDutyLogins.push({
          id: `duty-login-${ds.id}`,
          user_id: ds.driver_id,
          username: driver?.username || (driver?.full_name ? driver.full_name.toLowerCase().replace(/\s+/g, '') : 'driver'),
          full_name: driver?.full_name || 'Driver',
          role: 'DRIVER',
          login_time: ds.start_time,
          device_info: 'Mobile PWA App • Shift Clock-In',
          status: 'SUCCESS',
          phone: driver?.phone || '',
          ip_address: 'Active Fleet Session',
        });
      }
    }

    // Synthesize profile registration / initial login events
    const registrationLogins: LoginAuditItem[] = [];
    for (const d of drivers) {
      if (d.created_at) {
        registrationLogins.push({
          id: `reg-login-${d.id}`,
          user_id: d.id,
          username: d.username || d.full_name.toLowerCase().replace(/\s+/g, ''),
          full_name: d.full_name,
          role: d.role,
          login_time: d.created_at,
          device_info: 'Driver Account Created & First Login',
          status: 'SUCCESS',
          phone: d.phone || '',
          ip_address: 'System Onboarding',
        });
      }
    }

    // Combine all and de-duplicate
    const allCombined = [...audits, ...syntheticDutyLogins, ...registrationLogins];
    const seen = new Set<string>();
    const deduplicated: LoginAuditItem[] = [];

    for (const item of allCombined) {
      const key = `${item.user_id}_${item.login_time.slice(0, 16)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(item);
      }
    }

    // Filter
    const filtered = deduplicated.filter((item) => {
      const dateStr = item.login_time ? item.login_time.split('T')[0] : '';
      if (filters.startDate && dateStr && dateStr < filters.startDate) return false;
      if (filters.endDate && dateStr && dateStr > filters.endDate) return false;
      if (filters.driverId !== 'ALL' && item.user_id !== filters.driverId) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const tA = new Date(a.login_time).getTime();
      const tB = new Date(b.login_time).getTime();
      return tB - tA;
    });
  }
}


