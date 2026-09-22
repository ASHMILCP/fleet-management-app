'use server';

import { createClient } from '@/lib/supabase/server';
import { DutySession } from '@/types';
import { revalidatePath } from 'next/cache';

export async function startDutySession(driverId: string, vehicleId?: string, notes?: string) {
  try {
    const supabase = await createClient();

    // Close any existing active session
    await supabase
      .from('duty_sessions')
      .update({
        status: 'COMPLETED',
        end_time: new Date().toISOString(),
      })
      .eq('driver_id', driverId)
      .eq('status', 'ACTIVE');

    const { data, error } = await supabase
      .from('duty_sessions')
      .insert({
        driver_id: driverId,
        vehicle_id: vehicleId || null,
        start_time: new Date().toISOString(),
        status: 'ACTIVE',
        notes: notes || null,
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

export async function endDutySession(sessionId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('duty_sessions')
      .update({
        status: 'COMPLETED',
        end_time: new Date().toISOString(),
      })
      .eq('id', sessionId)
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
