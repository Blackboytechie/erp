import { supabase } from '../config/supabaseClient';

export async function checkAuthStatus() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Auth error:', error.message);
    return false;
  }
  
  if (!user) {
    console.error('No user found');
    return false;
  }
  
  return true;
} 