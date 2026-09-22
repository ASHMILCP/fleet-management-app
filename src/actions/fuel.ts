'use server';

import { createClient } from '@/lib/supabase/server';
import { FuelType } from '@/types';
import { getTodayDateIST } from '@/lib/timezone';
import { revalidatePath } from 'next/cache';

export async function createFuelLogAction(params: {
  driverId: string;
  vehicleId?: string;
  dutySessionId?: string;
  fuelType: FuelType;
  amount: number;
  litersOrKg?: number;
  logDate?: string;
  notes?: string;
}) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('fuel_logs')
      .insert({
        driver_id: params.driverId,
        vehicle_id: params.vehicleId || null,
        duty_session_id: params.dutySessionId || null,
        fuel_type: params.fuelType,
        amount: params.amount,
        liters_or_kg: params.litersOrKg || null,
        log_date: params.logDate || getTodayDateIST(),
        notes: params.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/driver');
    revalidatePath('/admin');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
