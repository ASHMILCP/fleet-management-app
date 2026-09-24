import { Profile, Vehicle, Company, DutySession, Trip, FuelLog, UberEarning } from '@/types';

export const INITIAL_VEHICLES: Vehicle[] = [];
export const INITIAL_COMPANIES: Company[] = [];
export const INITIAL_DRIVERS: Profile[] = [];

export const INITIAL_ADMIN: Profile = {
  id: 'a0000000-0000-0000-0000-000000000000',
  role: 'ADMIN',
  full_name: 'Fleet Administrator',
  username: 'admin',
  password: 'admin123',
  phone: '+91 98999 99999',
  is_active: true,
  created_at: '2026-01-01T00:00:00+05:30',
};

export const INITIAL_DUTY_SESSIONS: DutySession[] = [];
export const INITIAL_TRIPS: Trip[] = [];
export const INITIAL_FUEL_LOGS: FuelLog[] = [];
export const INITIAL_UBER_EARNINGS: UberEarning[] = [];
