import { supabase } from '@/integrations/supabase/client';
import { DriverDetails } from '@/types/database';

export async function updateDriverLocation(userId: string, coordinates: [number, number]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('driver_details')
      .update({ current_location: `ST_SetSRID(ST_MakePoint(${coordinates[0]}, ${coordinates[1]}), 4326)` })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating driver location:', error);
    return false;
  }
};

export async function getDriverLocation(userId: string): Promise<[number, number] | null> {
  try {
    const { data, error } = await supabase
      .from('driver_details')
      .select('current_location')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    if (!data?.current_location) return null;

    // Convert geometry point to coordinates
    const point = data.current_location as DriverDetails['current_location'];
    const coordinates = [point.x, point.y] as [number, number];
    return coordinates;
  } catch (error) {
    console.error('Error getting driver location:', error);
    return null;
  }
};
