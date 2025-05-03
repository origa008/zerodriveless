import { supabase } from '@/integrations/supabase/client';

export const updateDriverLocation = async (userId: string, location: [number, number]) => {
  try {
    const { error } = await supabase
      .from('driver_details')
      .update({ current_location: { coordinates: location } })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating driver location:', error);
    throw error;
  }
};

export const getDriverLocation = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('driver_details')
      .select('current_location')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data.current_location?.coordinates || null;
  } catch (error) {
    console.error('Error getting driver location:', error);
    throw error;
  }
};
