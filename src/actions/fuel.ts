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

    // Ensure driver exists in drivers table
    if (params.driverId) {
      const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', params.driverId).maybeSingle();
      if (!drvCheck) {
        await supabase.from('drivers').upsert({
          id: params.driverId,
          user_id: params.driverId,
          driver_id_code: 'DRV-' + params.driverId.slice(0, 6).toUpperCase(),
          status: 'ACTIVE',
        }).then(() => null, () => null);
      }
    }

    const cleanNotes = params.notes
      ? (params.litersOrKg ? `${params.litersOrKg} L/Kg | ${params.notes}` : params.notes)
      : (params.litersOrKg ? `${params.litersOrKg} L/Kg` : null);

    const { data, error } = await supabase
      .from('fuel_expenses')
      .insert({
        driver_id: params.driverId,
        vehicle_id: params.vehicleId || null,
        fuel_type: params.fuelType || 'CNG',
        amount: params.amount,
        expense_date: params.logDate || getTodayDateIST(),
        created_at: new Date().toISOString(),
        notes: cleanNotes,
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

export async function deleteFuelLogAction(fuelId: string) {
  try {
    const supabase = await createClient();
    const cleanId = fuelId.startsWith('fuel-') ? fuelId.replace('fuel-', '') : fuelId;

    const { error } = await supabase.from('fuel_expenses').delete().eq('id', cleanId);
    if (error) throw error;

    revalidatePath('/driver');
    revalidatePath('/driver/history');
    revalidatePath('/admin');
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
