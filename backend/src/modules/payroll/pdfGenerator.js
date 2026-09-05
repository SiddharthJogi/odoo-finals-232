const PDFDocument = require('pdfkit');

/**
 * Generates a PDF for a given payslip and returns a Promise that resolves to a Buffer.
 */
function generatePayslipPdfBuffer(payslip) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // --- Header ---
      doc.fontSize(24).font('Helvetica-Bold').text('PeoplePay360', { align: 'left' });
      doc.fontSize(10).font('Helvetica').fillColor('gray')
        .text('123 Business Avenue, Suite 100', { align: 'left' })
        .text('City, State, 12345', { align: 'left' })
        .text('info@peoplepay360.com', { align: 'left' });

      doc.moveUp(4);
      doc.fontSize(20).fillColor('black').text('PAYSLIP', { align: 'right' });
      doc.fontSize(10).fillColor('gray').text(`ID: #${String(payslip.id).padStart(6, '0')}`, { align: 'right' });
      doc.text(`Status: ${payslip.status.toUpperCase()}`, { align: 'right' });
      doc.moveDown(3);

      // --- Employee Info ---
      doc.rect(50, 150, 495, 70).fillAndStroke('#f9fafb', '#e5e7eb');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(11)
        .text('Employee Details', 65, 160);
      doc.font('Helvetica').fontSize(10)
        .text(`Name: ${payslip.employee_name || 'Employee #' + payslip.employee_id}`, 65, 175)
        .text(`Worked Days: ${payslip.worked_days}`, 65, 190)
        .text(`Contract ID: ${payslip.contract_id}`, 300, 175)
        .text(`Bank Account: ${payslip.bank_account || 'N/A'}`, 300, 190);
      doc.moveDown(4);

      // --- Breakdown Table ---
      const tableTop = 250;

      // Table Header
      doc.rect(50, tableTop, 495, 20).fillAndStroke('#374151', '#374151');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
        .text('Description', 60, tableTop + 5)
        .text('Category', 250, tableTop + 5)
        .text('Amount', 400, tableTop + 5, { align: 'right', width: 130 });

      // Table Rows
      let y = tableTop + 25;
      doc.fillColor('black').font('Helvetica');

      for (const line of payslip.lines || []) {
        doc.text(line.label, 60, y)
          .text(line.category, 250, y)
          .text('₹' + Number(line.value).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 400, y, { align: 'right', width: 130 });
        
        y += 20;
        
        // Add new page if table gets too long
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      }

      // --- Totals ---
      doc.moveDown(2);
      y += 20;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      
      y += 15;
      doc.font('Helvetica-Bold').fontSize(12)
        .text('Gross Total:', 300, y)
        .text('₹' + Number(payslip.gross_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 400, y, { align: 'right', width: 130 });

      y += 25;
      doc.rect(300, y - 10, 245, 35).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.fillColor('#065f46').fontSize(14)
        .text('Net Pay:', 310, y)
        .text('₹' + Number(payslip.net_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 400, y, { align: 'right', width: 120 });

      // --- Footer ---
      doc.fillColor('gray').font('Helvetica-Oblique').fontSize(9)
        .text('This is a system-generated document. No signature required.', 50, 780, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePayslipPdfBuffer
};
