import { supabase } from '../config/supabaseClient';

export async function getInvoices(startDate?: string) {
  try {
    let query = supabase
      .from('invoices')
      .select('*');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

export async function createInvoice(invoiceData: {
  total_amount: number;
  customer_name: string;
  invoice_number: string;
  due_date: string;
}) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert([
        {
          ...invoiceData,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

export async function updateInvoice(
  id: string,
  updates: Partial<{
    total_amount: number;
    customer_name: string;
    invoice_number: string;
    due_date: string;
    status: string;
  }>
) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
} 