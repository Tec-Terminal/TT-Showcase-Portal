import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generate and download a PDF receipt
 */
export async function downloadReceiptPDF(
  receiptElementId: string = "payment-receipt",
  filename: string = "payment-receipt.pdf"
): Promise<void> {
  try {
    const element = document.getElementById(receiptElementId);
    if (!element) {
      console.error("Receipt element not found with ID:", receiptElementId);
      throw new Error("Receipt element not found. Please refresh the page and try again.");
    }

    // Make element temporarily visible for capture
    const originalStyle = element.style.cssText;
    const originalParent = element.parentElement;
    const originalNextSibling = element.nextSibling;
    
    // Create a container for the element
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = element.offsetWidth + 'px';
    container.style.zIndex = '9999';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.backgroundColor = '#ffffff';
    
    // Move element to container
    container.appendChild(element);
    document.body.appendChild(container);
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create canvas with error handling for lab() colors
    let canvas;
    try {
      canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: element.scrollWidth || element.offsetWidth,
        height: element.scrollHeight || element.offsetHeight,
        onclone: (clonedDoc, element) => {
          // Convert all styles in the cloned document to avoid lab() colors
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            
            // Get computed styles from the original document
            const originalEl = document.querySelector(
              `[data-receipt-id="${htmlEl.getAttribute('data-receipt-id')}"]`
            ) || htmlEl;
            
            try {
              const computed = window.getComputedStyle(originalEl as Element);
              
              // Force explicit hex/rgb colors, avoiding lab()
              const getSafeColor = (color: string, fallback: string) => {
                if (!color || color.includes('lab') || color.includes('Lab')) {
                  return fallback;
                }
                // Convert rgb/rgba to hex if needed
                if (color.startsWith('rgb')) {
                  const matches = color.match(/\d+/g);
                  if (matches && matches.length >= 3) {
                    const r = parseInt(matches[0]);
                    const g = parseInt(matches[1]);
                    const b = parseInt(matches[2]);
                    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                  }
                }
                return color;
              };
              
              // Set background color
              const bgColor = computed.backgroundColor;
              if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                htmlEl.style.backgroundColor = getSafeColor(bgColor, '#ffffff');
              }
              
              // Set text color
              const textColor = computed.color;
              if (textColor) {
                htmlEl.style.color = getSafeColor(textColor, '#111827');
              }
              
              // Set border color
              const borderColor = computed.borderColor;
              if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
                htmlEl.style.borderColor = getSafeColor(borderColor, '#e5e7eb');
              }
            } catch (e) {
              // Ignore color parsing errors, use defaults
              htmlEl.style.backgroundColor = htmlEl.style.backgroundColor || '#ffffff';
              htmlEl.style.color = htmlEl.style.color || '#111827';
            }
          });
        },
      });
    } catch (error: any) {
      // Restore element
      if (originalParent && originalNextSibling) {
        originalParent.insertBefore(element, originalNextSibling);
      } else if (originalParent) {
        originalParent.appendChild(element);
      }
      element.style.cssText = originalStyle;
      if (container.parentElement) {
        document.body.removeChild(container);
      }
      
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }

    // Restore element to original position
    if (originalParent && originalNextSibling) {
      originalParent.insertBefore(element, originalNextSibling);
    } else if (originalParent) {
      originalParent.appendChild(element);
    }
    element.style.cssText = originalStyle;
    document.body.removeChild(container);

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageHeight = pdf.internal.pageSize.height;
    let heightLeft = imgHeight;
    let position = 0;

    // Add image to PDF
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download the PDF
    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

/**
 * Format currency for receipt display
 */
export function formatCurrency(amount: number): string {
  return `NGN ${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for receipt display
 */
export function formatReceiptDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

