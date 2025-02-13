import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation } from '../types/quotation';
import { supabase } from '@/config/supabaseClient';

interface PDFTemplate {
  id: string;
  name: string;
  description: string | null;
  header_text: string | null;
  footer_text: string | null;
  terms_conditions: string[];
  company_details: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    gst: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url: string | null;
  is_default: boolean;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
};

export const generateQuotationPDF = async (quotation: Quotation, returnBase64: boolean = false): Promise<string> => {
  // Get the default template
  const { data: templates, error } = await supabase
    .from('pdf_templates')
    .select('*')
    .eq('is_default', true)
    .limit(1);

  if (error) {
    console.error('Error fetching template:', error.message);
    throw error;
  }

  const template = templates[0] as PDFTemplate;
  const doc = new jsPDF();
  const primaryColor = hexToRgb(template.colors.primary);

  // Add tracking pixel
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/tracking`;
  const trackingImage = `<img src="${trackingUrl}?quotation_id=${quotation.id}&event_type=opened" style="display:none" />`;
  doc.html(trackingImage, { x: 0, y: 0 });

  // Add logo if available
  if (template.logo_url) {
    try {
      doc.addImage(template.logo_url, 'PNG', 14, 10, 40, 40);
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }

  // Add company header
  doc.setFontSize(20);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(template.company_details.name, template.logo_url ? 60 : 14, 20);

  // Add company details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const companyDetails = [
    template.company_details.address,
    `Phone: ${template.company_details.phone}`,
    `Email: ${template.company_details.email}`,
    `Website: ${template.company_details.website}`,
    `GST: ${template.company_details.gst}`
  ];
  doc.text(companyDetails, template.logo_url ? 60 : 14, 30);

  // Add custom header text if available
  if (template.header_text) {
    doc.setFontSize(12);
    doc.text(template.header_text, 14, 60);
  }

  // Add quotation details
  const startY = template.header_text ? 80 : 70;
  doc.setFontSize(12);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('Quotation', 14, startY);
  doc.setTextColor(0, 0, 0);
  doc.text(`No: Q-${quotation.id.slice(0, 8).toUpperCase()}`, 14, startY + 7);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, startY + 14);
  doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}`, 14, startY + 21);

  // Add customer details
  doc.text('To:', 14, startY + 35);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.customer_name, 14, startY + 42);
  doc.setFont('helvetica', 'normal');

  // Add items table
  const tableData = quotation.items.map(item => [
    item.product.name,
    item.product.sku,
    item.quantity.toString(),
    `₹${item.price.toFixed(2)}`,
    `₹${(item.price * item.quantity).toFixed(2)}`
  ]);

  const getLighterColor = (color: { r: number, g: number, b: number }) => ({
    r: Math.min(1, color.r + 0.9),
    g: Math.min(1, color.g + 0.9),
    b: Math.min(1, color.b + 0.9),
  });

  const secondaryColor = hexToRgb(template.colors.secondary);
  const lighterSecondaryColor = getLighterColor(secondaryColor);

  autoTable(doc, {
    startY: startY + 55,
    head: [['Product', 'SKU', 'Quantity', 'Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [Math.round(primaryColor.r * 255), Math.round(primaryColor.g * 255), Math.round(primaryColor.b * 255)] as [number, number, number],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [Math.round(lighterSecondaryColor.r * 255), Math.round(lighterSecondaryColor.g * 255), Math.round(lighterSecondaryColor.b * 255)] as [number, number, number],
    },
    foot: [[
      { content: 'Total Amount:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `₹${quotation.total_amount.toFixed(2)}`, styles: { fontStyle: 'bold' } }
    ]],
  });

  // Add terms and conditions
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.text('Terms and Conditions:', 14, finalY + 20);
  doc.setFontSize(10);
  doc.text(template.terms_conditions, 14, finalY + 30);

  // Add custom footer text if available
  if (template.footer_text) {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(template.footer_text, 14, pageHeight - 20);
  }

  if (returnBase64) {
    // Return base64 string for preview or email attachment
    return doc.output('datauristring');
  } else {
    // Record download event
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quotation_id: quotation.id,
        event_type: 'downloaded',
        recipient_email: quotation.customer_name // Using customer name as recipient for direct downloads
      })
    }).catch(console.error);

    // Download the PDF
    doc.save(`Quotation-${quotation.id.slice(0, 8).toUpperCase()}.pdf`);
    return '';
  }
}; 