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
    const multiplier = params.tripType === 'TWO_SIDE' ? 2 : 1;
    const totalKm = parseFloat((params.oneSideKm * multiplier).toFixed(2));

    const { data, error } = await supabase
      .from('trips')
      .insert({
        driver_id: params.driverId,
        company_id: params.companyId,
        vehicle_id: params.vehicleId || null,
        duty_session_id: params.dutySessionId || null,
        one_side_km: params.oneSideKm,
        trip_type: params.tripType,
        multiplier,
        total_km: totalKm,
        trip_date: getTodayDateIST(),
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
