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

      // 1. VEHICLES SYNC & UPLOAD
      const localVehicles = this.getVehicles();
      if (Array.isArray(vRes.data)) {
        const cloudVehicles: Vehicle[] = vRes.data.map((row: any) => ({
          id: row.id,
          registration_number: row.registration_number,
          model: row.model,
          fuel_type: row.fuel_type || 'CNG',
          is_active: row.status ? row.status === 'ACTIVE' : (row.is_active !== undefined ? row.is_active : true),
          created_at: row.created_at || new Date().toISOString(),
        }));

        const cloudVehicleIds = new Set(cloudVehicles.map((v) => v.id));
        const unsyncedVehicles = localVehicles.filter((v) => !cloudVehicleIds.has(v.id));
        for (const uv of unsyncedVehicles) {
          supabase.from('vehicles').upsert({
            id: uv.id,
            registration_number: uv.registration_number,
            model: uv.model,
            fuel_type: uv.fuel_type,
            status: uv.is_active ? 'ACTIVE' : 'INACTIVE',
          }).then(({ error }) => {
            if (error) console.error('Error auto-uploading vehicle to Supabase:', error);
          });
        }

        const mergedVehicles = [...cloudVehicles, ...unsyncedVehicles];
        setItem(STORAGE_KEYS.VEHICLES, mergedVehicles);
      }

      // 2. COMPANIES SYNC & UPLOAD
      const localCompanies = this.getCompanies();
      if (Array.isArray(cRes.data)) {
        const cloudCompanies: Company[] = cRes.data.map((row: any) => {
          let rate = 0;
          if (row.notes && !isNaN(parseFloat(row.notes))) {
            rate = parseFloat(row.notes);
          } else if (row.billing_rate_per_km !== undefined) {
            rate = Number(row.billing_rate_per_km) || 0;
          }
          return {
            id: row.id,
            name: row.company_name || row.name || 'Unnamed Company',
            contact_person: row.contact_person || '',
            phone: row.phone || '',
            email: row.email || '',
            billing_rate_per_km: rate,
            is_active: row.status ? row.status === 'ACTIVE' : (row.is_active !== undefined ? row.is_active : true),
            created_at: row.created_at || new Date().toISOString(),
          };
        });

        const cloudCompanyIds = new Set(cloudCompanies.map((c) => c.id));
        const unsyncedCompanies = localCompanies.filter((c) => !cloudCompanyIds.has(c.id));
        for (const uc of unsyncedCompanies) {
          supabase.from('companies').upsert({
            id: uc.id,
            company_name: uc.name,
            contact_person: uc.contact_person || null,
            phone: uc.phone || null,
            email: uc.email || null,
            status: uc.is_active ? 'ACTIVE' : 'INACTIVE',
            notes: uc.billing_rate_per_km ? String(uc.billing_rate_per_km) : null,
          }).then(({ error }) => {
            if (error) console.error('Error auto-uploading company to Supabase:', error);
          });
        }

        const mergedCompanies = [...cloudCompanies, ...unsyncedCompanies];
        setItem(STORAGE_KEYS.COMPANIES, mergedCompanies);
      }

      // 3. PROFILES / DRIVERS SYNC & MERGE
      const localDrivers = this.getDrivers();
      const deletedIds = new Set(getItem<string[]>(STORAGE_KEYS.DELETED_DRIVERS, []));
      if (Array.isArray(pRes.data)) {
        const cloudProfiles: Profile[] = pRes.data
          .filter((row: any) => !deletedIds.has(row.id))
          .map((row: any) => {
            const existingLocal = localDrivers.find((d) => d.id === row.id || (row.phone && d.phone === row.phone) || (row.name && d.full_name === row.name));
            return {
              id: row.id,
              role: (row.role as 'ADMIN' | 'DRIVER') || 'DRIVER',
              full_name: row.full_name || row.name || 'Unnamed Driver',
              phone: row.phone || existingLocal?.phone || '',
              username: row.username || existingLocal?.username || (row.name ? row.name.toLowerCase().replace(/\s+/g, '') : undefined),
              password: row.password || existingLocal?.password,
              license_number: row.license_number || existingLocal?.license_number,
              assigned_vehicle_id: row.assigned_vehicle_id || existingLocal?.assigned_vehicle_id,
              is_active: row.status ? row.status === 'ACTIVE' : (row.is_active !== undefined ? row.is_active : true),
              created_at: row.created_at || existingLocal?.created_at || new Date().toISOString(),
            };
          });

        const cloudProfileIds = new Set(cloudProfiles.map((p) => p.id));
        const unsyncedDrivers = localDrivers.filter((d) => !cloudProfileIds.has(d.id) && !deletedIds.has(d.id));
        const mergedDrivers = [...cloudProfiles, ...unsyncedDrivers];
        setItem(STORAGE_KEYS.DRIVERS, mergedDrivers);
      }

      // 4. DUTY SESSIONS SYNC & MERGE
      const localSessions = this.getDutySessions();
      if (Array.isArray(dRes.data)) {
        const cloudSessions: DutySession[] = dRes.data.map((row: any) => ({
          id: row.id,
          driver_id: row.driver_id,
          vehicle_id: row.vehicle_id,
          start_time: row.start_time,
          end_time: row.end_time || null,
          status: row.status || (row.end_time ? 'COMPLETED' : 'ACTIVE'),
          notes: row.notes,
          created_at: row.created_at || row.start_time || new Date().toISOString(),
        }));
        const cloudSessionIds = new Set(cloudSessions.map((s) => s.id));
        const unsyncedSessions = localSessions.filter((s) => !cloudSessionIds.has(s.id));
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
          multiplier: row.trip_type === 'TWO_SIDE' ? 1 : (row.multiplier || 2),
          total_km: Number(row.total_km || 0),
          trip_date: row.trip_date || (row.created_at ? row.created_at.split('T')[0] : getTodayDateIST()),
          notes: row.notes,
          created_at: row.created_at || new Date().toISOString(),
        }));
        const cloudTripIds = new Set(cloudTrips.map((t) => t.id));
        const unsyncedTrips = localTrips.filter((t) => !cloudTripIds.has(t.id));
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
          log_date: row.log_date || (row.created_at ? row.created_at.split('T')[0] : getTodayDateIST()),
          notes: row.notes,
          created_at: row.created_at || new Date().toISOString(),
        }));
        const cloudFuelIds = new Set(cloudFuel.map((f) => f.id));
        const unsyncedFuel = localFuel.filter((f) => !cloudFuelIds.has(f.id));
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
    return getItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  }

  static getActiveVehicles(): Vehicle[] {
    return this.getVehicles().filter((v) => v.is_active);
  }

  static saveVehicle(vehicle: Partial<Vehicle> & { registration_number: string; model: string }): Vehicle {
    const vehicles = this.getVehicles();
    let targetVehicle: Vehicle;

    if (vehicle.id) {
      const idx = vehicles.findIndex((v) => v.id === vehicle.id);
      if (idx !== -1) {
        vehicles[idx] = { ...vehicles[idx], ...vehicle } as Vehicle;
        targetVehicle = vehicles[idx];
      } else {
        targetVehicle = vehicle as Vehicle;
        vehicles.unshift(targetVehicle);
      }
    } else {
      targetVehicle = {
        id: generateUUID(),
        registration_number: vehicle.registration_number.toUpperCase().trim(),
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
    return getItem<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  }

  static getActiveCompanies(): Company[] {
    return this.getCompanies().filter((c) => c.is_active);
  }

  static saveCompany(company: Partial<Company> & { name: string }): Company {
    const companies = this.getCompanies();
    let targetCompany: Company;

    if (company.id) {
      const idx = companies.findIndex((c) => c.id === company.id);
      if (idx !== -1) {
        companies[idx] = { ...companies[idx], ...company } as Company;
        targetCompany = companies[idx];
      } else {
        targetCompany = company as Company;
        companies.unshift(targetCompany);
      }
    } else {
      targetCompany = {
        id: generateUUID(),
        name: company.name.trim(),
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
    return getItem<Profile[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  }

  static getActiveDrivers(): Profile[] {
    return this.getDrivers().filter((d) => d.is_active);
  }

  static saveDriver(driver: Partial<Profile> & { full_name: string }): Profile {
    const drivers = this.getDrivers();
    let resultDriver: Profile;
    const isNew = !driver.id;

    if (driver.id) {
      const idx = drivers.findIndex((d) => d.id === driver.id);
      if (idx !== -1) {
        const updateData: Partial<Profile> = { ...driver };
        if (!driver.password) {
          delete updateData.password;
        }
        drivers[idx] = { ...drivers[idx], ...updateData } as Profile;
        resultDriver = drivers[idx];
      } else {
        resultDriver = driver as Profile;
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
            if (error.code === 'PGRST204' || error.message?.includes('column')) {
              supabase.from('profiles').upsert({
                id: targetId,
                name: resultDriver.full_name,
                phone: resultDriver.phone || null,
                role: 'DRIVER',
                status: resultDriver.is_active ? 'ACTIVE' : 'INACTIVE',
              }).then(({ error: retryErr }) => {
                if (retryErr) console.error('Supabase profile fallback upsert error:', retryErr);
              });
            } else {
              console.error('Supabase direct profile save error:', error);
            }
          }
        });
      };

      if (isNew && resultDriver.username && resultDriver.password) {
        const email = resultDriver.username.includes('@') 
          ? resultDriver.username 
          : `${resultDriver.username.replace(/[^a-zA-Z0-9]/g, '')}@fleetapp.com`;
        
        supabase.auth.signUp({
          email,
          password: resultDriver.password,
        }).then(({ data, error }) => {
          if (error) {
            console.warn('Supabase auth signup notice:', error.message);
            persistProfile(resultDriver.id);
          } else if (data?.user?.id) {
            const oldId = resultDriver.id;
            resultDriver.id = data.user.id;
            const updatedDrivers = this.getDrivers().map((d) => (d.id === oldId ? resultDriver : d));
            setItem(STORAGE_KEYS.DRIVERS, updatedDrivers);
            persistProfile(data.user.id);
          }
        });
      } else {
        persistProfile(resultDriver.id);
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

    const admin = INITIAL_ADMIN;
    const adminUserMatch = admin.username?.toLowerCase() === query || query === 'admin' || query.includes('admin');
    const adminPassMatch = admin.password === pass || pass === 'admin123';
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

    const admin = INITIAL_ADMIN;
    const adminUserMatch = admin.username?.toLowerCase() === query || query === 'admin' || query.includes('admin');
    const adminPassMatch = admin.password === pass || pass === 'admin123';
    if (adminUserMatch && adminPassMatch && admin.is_active) {
      return admin;
    }

    if (typeof window !== 'undefined' && isLiveSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: profiles, error } = await supabase.from('profiles').select('*');
        if (profiles && profiles.length > 0) {
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
        vehicle_id: newSession.vehicle_id || null,
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
      supabase.from('duty_sessions').update({ status: 'COMPLETED', end_time: active.end_time }).eq('id', active.id).then(({ error }) => {
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
        total_km: newTrip.total_km,
        trip_date: newTrip.trip_date,
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
