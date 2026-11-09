'use server';

import { createClient } from '@/lib/supabase/server';
import { getTodayDateIST, formatTimeIST } from '@/lib/timezone';
import { revalidatePath } from 'next/cache';
import { DutyType } from '@/types';

export async function startDutySession(
  driverId: string,
  vehicleId?: string,
  notes?: string,
  dutyType: DutyType = 'NAVY'
) {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    // Ensure driver exists in drivers table
    const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', driverId).maybeSingle();
    if (!drvCheck) {
      await supabase.from('drivers').upsert({
        id: driverId,
        user_id: driverId,
        driver_id_code: 'DRV-' + driverId.slice(0, 6).toUpperCase(),
        status: 'ACTIVE',
      }).then(() => null, () => null);
    }

    // Close any existing active session (end_time is null)
    // If starting UBER, explicitly mark any open NAVY session as auto-ended
    const { data: openSessions } = await supabase
      .from('duty_sessions')
      .select('id, start_time, duty_type, notes')
      .eq('driver_id', driverId)
      .is('end_time', null);

    if (openSessions && openSessions.length > 0) {
      for (const open of openSessions) {
        const diffMs = open.start_time ? new Date(nowIso).getTime() - new Date(open.start_time).getTime() : 0;
        const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        const prevDutyType = open.duty_type || 'NAVY';
        let autoNote = open.notes || '';
        if (prevDutyType === 'NAVY' && dutyType === 'UBER') {
          autoNote = (autoNote ? `${autoNote} | ` : '') + `[Auto-ended: Switched to Uber at ${formatTimeIST(nowIso)}]`;
        } else if (prevDutyType === 'UBER' && dutyType === 'NAVY') {
          autoNote = (autoNote ? `${autoNote} | ` : '') + `[Auto-ended: Switched to Navy Duty at ${formatTimeIST(nowIso)}]`;
        }

        await supabase
          .from('duty_sessions')
          .update({
            end_time: nowIso,
            total_working_minutes: totalMinutes,
            notes: autoNote || undefined,
          })
          .eq('id', open.id);
      }
    }

    const { data, error } = await supabase
      .from('duty_sessions')
      .insert({
        driver_id: driverId,
        vehicle_id: vehicleId || null,
        duty_type: dutyType,
        session_date: getTodayDateIST(),
        start_time: nowIso,
        end_time: null,
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

export async function endDutySession(
  sessionId: string,
  totalKm?: number,
  notes?: string
) {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('duty_sessions')
      .select('id, start_time, notes')
      .eq('id', sessionId)
      .maybeSingle();

    const diffMs = session?.start_time ? new Date(nowIso).getTime() - new Date(session.start_time).getTime() : 0;
    const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    const updatedNotes = notes
      ? (session?.notes ? `${session.notes} | ${notes}` : notes)
      : session?.notes;

    const updatePayload: Record<string, any> = {
      end_time: nowIso,
      total_working_minutes: totalMinutes,
    };
    if (totalKm !== undefined && totalKm !== null && !isNaN(totalKm)) {
      updatePayload.total_km = totalKm;
    }
    if (updatedNotes) {
      updatePayload.notes = updatedNotes;
    }

    const { data, error } = await supabase
      .from('duty_sessions')
      .update(updatePayload)
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
