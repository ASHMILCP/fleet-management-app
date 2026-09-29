'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Driver Management
export async function toggleDriverActive(driverId: string, currentStatus: boolean) {
  try {
    const supabase = await createClient();
    const newStatus = !currentStatus;
    
    await Promise.all([
      supabase
        .from('profiles')
        .update({ 
          is_active: newStatus,
          status: newStatus ? 'ACTIVE' : 'INACTIVE'
        })
        .eq('id', driverId),
      supabase
        .from('drivers')
        .update({ status: newStatus ? 'ACTIVE' : 'INACTIVE' })
        .or(`id.eq.${driverId},user_id.eq.${driverId}`)
    ]);

    revalidatePath('/admin/drivers');
    revalidatePath('/admin');
    revalidatePath('/driver');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDriverAction(params: {
  id: string;
  fullName: string;
  username?: string;
  password?: string;
  phone?: string;
  licenseNumber?: string;
  assignedVehicleId?: string;
  isActive?: boolean;
}) {
  try {
    const supabase = await createClient();
    const active = params.isActive !== false;

    // 1. Update profiles table
    const profilePayload: Record<string, any> = {
      name: params.fullName,
      phone: params.phone || null,
      status: active ? 'ACTIVE' : 'INACTIVE',
      is_active: active,
    };
    if (params.username) profilePayload.username = params.username.trim().toLowerCase();
    if (params.password && params.password.trim()) profilePayload.password = params.password.trim();
    if (params.licenseNumber !== undefined) profilePayload.license_number = params.licenseNumber.trim() || null;
    if (params.assignedVehicleId !== undefined) profilePayload.assigned_vehicle_id = params.assignedVehicleId || null;

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', params.id);

    if (profileError) {
      // If error was due to optional columns like is_active/license_number/assigned_vehicle_id, retry with core columns
      const corePayload: Record<string, any> = {
        name: params.fullName,
        phone: params.phone || null,
        status: active ? 'ACTIVE' : 'INACTIVE',
      };
      if (params.username) corePayload.username = params.username.trim().toLowerCase();
      if (params.password && params.password.trim()) corePayload.password = params.password.trim();

      const { error: retryError } = await supabase
        .from('profiles')
        .update(corePayload)
        .eq('id', params.id);

      if (retryError) throw retryError;
    }

    // 2. Update drivers table
    const targetVehId = params.assignedVehicleId || null;
    const cleanCode = 'DRV-' + (params.username || params.fullName || params.id.slice(0, 6))
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);

    const { error: driverError } = await supabase
      .from('drivers')
      .upsert({
        id: params.id,
        user_id: params.id,
        driver_id_code: cleanCode,
        vehicle_id: targetVehId,
        status: active ? 'ACTIVE' : 'INACTIVE',
      });

    if (driverError) {
      console.warn('Driver record update warning (non-fatal):', driverError);
    }

    revalidatePath('/admin/drivers');
    revalidatePath('/admin');
    revalidatePath('/admin/reports');
    revalidatePath('/driver');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Vehicle Management
export async function toggleVehicleActive(vehicleId: string, currentStatus: boolean) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('vehicles')
      .update({ is_active: !currentStatus })
      .eq('id', vehicleId);

    if (error) throw error;
    revalidatePath('/admin/vehicles');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Company Management
export async function toggleCompanyActive(companyId: string, currentStatus: boolean) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('companies')
      .update({ is_active: !currentStatus })
      .eq('id', companyId);

    if (error) throw error;
    revalidatePath('/admin/companies');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
