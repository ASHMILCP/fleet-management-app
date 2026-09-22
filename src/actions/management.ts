'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Driver Management
export async function toggleDriverActive(driverId: string, currentStatus: boolean) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', driverId);

    if (error) throw error;
    revalidatePath('/admin/drivers');
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
