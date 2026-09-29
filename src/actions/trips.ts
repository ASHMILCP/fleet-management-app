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
    // Ensure driver exists in drivers table to avoid foreign key violation
    if (params.driverId) {
      const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', params.driverId).maybeSingle();
      if (!drvCheck) {
        const { data: drvUserCheck } = await supabase.from('drivers').select('id').eq('user_id', params.driverId).maybeSingle();
        if (!drvUserCheck) {
          await supabase.from('drivers').insert({
            id: params.driverId,
            user_id: params.driverId,
            driver_id_code: 'DRV-' + params.driverId.slice(0, 6).toUpperCase(),
            status: 'ACTIVE',
          });
        }
      }
    }

    const cleanVehicleId = params.vehicleId && params.vehicleId !== 'null' && params.vehicleId !== 'undefined' ? params.vehicleId : null;
    const cleanNotes = params.notes && params.notes.trim() ? params.notes.trim() : null;

    const payload: Record<string, any> = {
      driver_id: params.driverId,
      company_id: params.companyId,
      vehicle_id: cleanVehicleId,
      entered_km: params.oneSideKm,
      trip_type: params.tripType,
      km_multiplier: multiplier,
      total_km: totalKm,
      trip_date: getTodayDateIST(),
      notes: cleanNotes,
    };

    let { data, error } = await supabase
      .from('trips')
      .insert(payload)
      .select()
      .single();

    if (error && (error.message?.includes('entered_km') || error.message?.includes('km_multiplier'))) {
      const fallbackPayload: Record<string, any> = { ...payload };
      fallbackPayload.one_side_km = fallbackPayload.entered_km;
      fallbackPayload.multiplier = fallbackPayload.km_multiplier;
      delete fallbackPayload.entered_km;
      delete fallbackPayload.km_multiplier;
      const retry = await supabase
        .from('trips')
        .insert(fallbackPayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    revalidatePath('/driver');
    revalidatePath('/driver/history');
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
    const cleanId = params.id.startsWith('uber-') ? params.id.replace('uber-', '') : params.id;
    const multiplier = params.multiplier || (params.tripType === 'ONE_SIDE' ? 2 : 1);
    const totalKm = params.totalKm !== undefined ? params.totalKm : parseFloat((params.oneSideKm * multiplier).toFixed(2));
    const tripDate = params.tripDate || getTodayDateIST();

    // Ensure driver exists in drivers table to avoid foreign key violation
    if (params.driverId) {
      const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', params.driverId).maybeSingle();
      if (!drvCheck) {
        const { data: drvUserCheck } = await supabase.from('drivers').select('id').eq('user_id', params.driverId).maybeSingle();
        if (!drvUserCheck) {
          await supabase.from('drivers').insert({
            id: params.driverId,
            user_id: params.driverId,
            driver_id_code: 'DRV-' + params.driverId.slice(0, 6).toUpperCase(),
            status: 'ACTIVE',
          });
        }
      }
    }

    const cleanVehicleId = params.vehicleId && params.vehicleId !== 'null' && params.vehicleId !== 'undefined' ? params.vehicleId : null;
    const cleanNotes = params.notes && params.notes.trim() ? params.notes.trim() : null;

    const payload: Record<string, any> = {
      driver_id: params.driverId,
      company_id: params.companyId,
      vehicle_id: cleanVehicleId,
      entered_km: params.oneSideKm,
      trip_type: params.tripType,
      km_multiplier: multiplier,
      total_km: totalKm,
      trip_date: tripDate,
      notes: cleanNotes,
    };

    let { data, error } = await supabase
      .from('trips')
      .update(payload)
      .eq('id', cleanId)
      .select()
      .maybeSingle();

    if (error && (error.message?.includes('entered_km') || error.message?.includes('km_multiplier'))) {
      const fallbackPayload: Record<string, any> = { ...payload };
      fallbackPayload.one_side_km = fallbackPayload.entered_km;
      fallbackPayload.multiplier = fallbackPayload.km_multiplier;
      delete fallbackPayload.entered_km;
      delete fallbackPayload.km_multiplier;
      const retry = await supabase
        .from('trips')
        .update(fallbackPayload)
        .eq('id', cleanId)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('updateTripAction error:', error);
      throw error;
    }

    // Also update uber_earnings if linked
    try {
      await supabase
        .from('uber_earnings')
        .update({
          driver_id: params.driverId,
          vehicle_id: cleanVehicleId,
          earnings_date: tripDate,
          amount: totalKm,
          notes: cleanNotes,
        })
        .eq('id', cleanId);
    } catch {
      // non-critical
    }

    revalidatePath('/driver');
    revalidatePath('/driver/history');
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
    const cleanId = tripId.startsWith('uber-') ? tripId.replace('uber-', '') : tripId;

    await Promise.all([
      supabase.from('trips').delete().eq('id', cleanId),
      supabase.from('uber_earnings').delete().eq('id', cleanId).then(() => null, () => null),
    ]);

    revalidatePath('/driver');
    revalidatePath('/driver/history');
    revalidatePath('/admin');
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
