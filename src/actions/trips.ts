'use server';

import { createClient } from '@/lib/supabase/server';
import { TripType } from '@/types';
import { getTodayDateIST } from '@/lib/timezone';
import { revalidatePath } from 'next/cache';

export async function createTripAction(params: {
  driverId: string;
  companyId: string;
  vehicleId?: string;
  dutySessionId?: string;
  oneSideKm: number;
  tripType: TripType;
  notes?: string;
}) {
  try {
    const supabase = await createClient();
    const multiplier = params.tripType === 'ONE_SIDE' ? 2 : 1;
    const totalKm = parseFloat((params.oneSideKm * multiplier).toFixed(2));

    const { data, error } = await supabase
      .from('trips')
      .insert({
        driver_id: params.driverId,
        company_id: params.companyId,
        vehicle_id: params.vehicleId || null,
        duty_session_id: params.dutySessionId || null,
        one_side_km: params.oneSideKm,
        entered_km: params.oneSideKm,
        trip_type: params.tripType,
        multiplier,
        km_multiplier: multiplier,
        total_km: totalKm,
        trip_date: getTodayDateIST(),
        notes: params.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/driver');
    revalidatePath('/admin');
    revalidatePath('/admin/reports');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTripAction(params: {
  id: string;
  driverId: string;
  companyId: string;
  vehicleId?: string;
  oneSideKm: number;
  tripType: TripType;
  multiplier?: 1 | 2;
  totalKm?: number;
  tripDate?: string;
  notes?: string;
}) {
  try {
    const supabase = await createClient();
    const multiplier = params.multiplier || (params.tripType === 'ONE_SIDE' ? 2 : 1);
    const totalKm = params.totalKm !== undefined ? params.totalKm : parseFloat((params.oneSideKm * multiplier).toFixed(2));
    const tripDate = params.tripDate || getTodayDateIST();

    const payload: Record<string, any> = {
      driver_id: params.driverId,
      company_id: params.companyId,
      vehicle_id: params.vehicleId || null,
      entered_km: params.oneSideKm,
      trip_type: params.tripType,
      km_multiplier: multiplier,
      total_km: totalKm,
      trip_date: tripDate,
      notes: params.notes || null,
    };

    const { data, error } = await supabase
      .from('trips')
      .update(payload)
      .eq('id', params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('updateTripAction error:', error);
      throw error;
    }

    revalidatePath('/driver');
    revalidatePath('/admin');
    revalidatePath('/admin/reports');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTripAction(tripId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;
    revalidatePath('/driver');
    revalidatePath('/admin');
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
