// Declare the global html2pdf variable from the CDN script
declare global {
  interface Window {
    html2pdf: any;
  }
}

/**
 * Compiles a DOM element into a high-fidelity PDF, triggers download, and returns the PDF Blob.
 * @param elementId The HTML ID of the container element representing the paper sheet (e.g. 'invoice-paper')
 * @param filename The output filename for the downloaded PDF
 */
export const compileInvoicePDF = async (elementId: string, filename: string): Promise<Blob> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with ID '${elementId}' not found in DOM.`);
  }

  // Setup options for html2pdf
  const opt = {
    margin:        [0.4, 0.4, 0.4, 0.4], // inches [top, left, bottom, right]
    filename:      filename,
    image:         { type: 'jpeg', quality: 0.98 },
    html2canvas:   { 
      scale: 2, // Higher scale increases text sharpness/resolution in the PDF
      useCORS: true, 
      letterRendering: true,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF:         { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  try {
    if (!window.html2pdf) {
      throw new Error("html2pdf library is not loaded. Check index.html script tag.");
    }

    // Initialize the html2pdf worker
    const worker = window.html2pdf().set(opt).from(element);
    
    // Trigger download
    await worker.save();
    
    // Generate the PDF blob for database storage upload
    const pdfBlob = await worker.output('blob', 'pdf');
    return pdfBlob;
  } catch (error) {
    console.error("PDF generation failed:", error);
    throw error;
  }
};
