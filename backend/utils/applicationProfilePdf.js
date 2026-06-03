const { downloadFileBufferFromUrl } = require('../config/googleDrive');

const COLORS = {
  primary: '#1e3a5f',
  text: '#1e293b',
  muted: '#64748b',
  border: '#cbd5e1',
  tableHeader: '#1e3a5f',
  tableHeaderText: '#ffffff',
  tableRowAlt: '#f8fafc'
};

const EXCLUDED_FIELD_KEYS = ['name', 'fullname', 'email', 'phone', 'mobilenumber', 'mobile', 'passportphoto'];

const EXPERIENCE_SUMMARY_KEYS = new Set([
  'totalexperienceyears',
  'teachingexperience',
  'salaryinctc',
  'currentsalary',
  'expectedsalary',
  'previousinstitutioncompany',
  'lastdesignation',
  'fromdate',
  'todate'
]);

const PAGE_MARGIN = 32;
const PHOTO_W = 82;
const PHOTO_H = 100;

const formatLabel = (key) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();

const getApplicationDataObject = (applicationData) => {
  if (!applicationData) return {};
  if (applicationData instanceof Map) {
    return Object.fromEntries(applicationData);
  }
  return applicationData;
};

const isResumeOrCertificate = (name = '') => {
  const n = name.toLowerCase();
  return n.includes('resume') || n.includes('cv') || n.includes('certificate');
};

const isImageDocument = (name = '', url = '') => {
  if (isResumeOrCertificate(name)) return false;
  const n = name.toLowerCase();
  const u = (url || '').toLowerCase();
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(n) || /\.(jpe?g|png|webp|gif)/i.test(u)) {
    return true;
  }
  return (
    n.includes('photo') ||
    n.includes('phot') ||
    n.includes('passport') ||
    n.includes('picture') ||
    n.includes('profile') ||
    n.includes('passportphoto')
  );
};

const resolvePassportPhotoUrl = (candidate) => {
  const appData = getApplicationDataObject(candidate.applicationData);
  const documents = candidate.documents || [];

  if (appData.passportPhoto && typeof appData.passportPhoto === 'string') {
    return appData.passportPhoto;
  }

  const photoDoc = documents.find((d) => isImageDocument(d?.name, d?.url));
  if (photoDoc?.url) return photoDoc.url;

  const passportFieldDoc = documents.find((d) => {
    const field = (d?.field || '').toLowerCase();
    return field.includes('passport') || field.includes('photo');
  });
  if (passportFieldDoc?.url) return passportFieldDoc.url;

  return null;
};

const parseJsonValue = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) || typeof parsed === 'object') return parsed;
    } catch {
      return null;
    }
  }
  return null;
};

const isEducationArray = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const first = arr[0];
  return first && (first.college || first.percentage || first.type);
};

const isExperienceArray = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const first = arr[0];
  return first && (first.organization || first.designation || first.duration || first.responsibilities);
};

const categorizeField = (key, value) => {
  const lowerKey = key.toLowerCase();

  if (EXPERIENCE_SUMMARY_KEYS.has(lowerKey)) {
    return { type: 'experienceSummary', key, value };
  }

  const parsed = parseJsonValue(value);
  if (parsed && isEducationArray(parsed)) {
    return { type: 'education', key, value: parsed };
  }
  if (parsed && isExperienceArray(parsed)) {
    return { type: 'experienceTable', key, value: parsed };
  }
  if (lowerKey.includes('education') && parsed) {
    return { type: 'education', key, value: parsed };
  }
  if (lowerKey.includes('experience') && !EXPERIENCE_SUMMARY_KEYS.has(lowerKey) && parsed) {
    return { type: 'experienceTable', key, value: parsed };
  }

  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return { type: 'skip' };
  }
  if (value === null || value === undefined || value === '') {
    return { type: 'skip' };
  }

  return { type: 'text', key, value };
};

const formatTextValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

/** Same field filter as FormSubmissions / CandidateManagement modal */
const getModalFilteredEntries = (appData) =>
  Object.entries(appData).filter(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (EXCLUDED_FIELD_KEYS.some((excluded) => lowerKey.includes(excluded))) return false;
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return false;
    }
    if (value === null || value === undefined || value === '') return false;
    return true;
  });

const generateApplicationProfilePdf = async (candidate, res) => {
  const PDFDocument = require('pdfkit');
  const appData = getApplicationDataObject(candidate.applicationData);
  const passportPhotoUrl = resolvePassportPhotoUrl(candidate);
  const photoBuffer = await downloadFileBufferFromUrl(passportPhotoUrl);

  const candidateDisplayName =
    candidate.user?.name || candidate.personalDetails?.name || 'Unknown Candidate';
  const safeFileName = candidateDisplayName.replace(/[^a-z0-9]/gi, '_');

  const doc = new PDFDocument({
    margin: 0,
    size: 'A4',
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `Application Profile - ${candidateDisplayName}`,
      Author: 'Pydah Recruitment System',
      Subject: 'Candidate Application Profile'
    }
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=application_${safeFileName}_${new Date().toISOString().split('T')[0]}.pdf`
  );
  doc.pipe(res);
  let docEnded = false;
  const safeEnd = () => {
    if (!docEnded) {
      docEnded = true;
      try {
        doc.end();
      } catch {
        // stream may already be closed
      }
    }
  };

  try {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftX = PAGE_MARGIN;
    const fullWidth = pageWidth - PAGE_MARGIN * 2;
    const photoX = pageWidth - PAGE_MARGIN - PHOTO_W;
    const sideWidth = photoX - leftX - 14;
    const pageBottom = pageHeight - PAGE_MARGIN - 24;
    const footerTextY = pageHeight - PAGE_MARGIN - 14;

    const sectionHeaderH = 20;
    const sectionHeaderFont = 10;
    const tableHeaderH = 22;
    const tableHeaderFont = 9;
    const tableBodyFont = 8.5;
    const gridLabelFont = 8;
    const gridValueFont = 9;
    const sectionGap = 10;

    const documents = candidate.documents || [];
    const modalEntries = getModalFilteredEntries(appData);
    const textFields = [];
    const tableBlocks = [];

    modalEntries.forEach(([key, value]) => {
      const category = categorizeField(key, value);
      if (category.type === 'skip') return;
      if (category.type === 'education') {
        tableBlocks.push({
          label: formatLabel(key),
          headers: ['Level', 'College / University', 'Result'],
          rows: category.value.map((item) => [
            item.type || '—',
            item.college || '—',
            item.percentage || '—'
          ]),
          colWidths: [90, fullWidth - 170, 80]
        });
      } else if (category.type === 'experienceTable') {
        tableBlocks.push({
          label: formatLabel(key),
          headers: ['Organization', 'Designation', 'Duration', 'Responsibilities'],
          rows: category.value.map((item) => [
            item.organization || '—',
            item.designation || '—',
            item.duration || '—',
            item.responsibilities || '—'
          ]),
          colWidths: [100, 90, 55, fullWidth - 245]
        });
      } else {
        textFields.push([formatLabel(key), formatTextValue(category.value)]);
      }
    });

    let y = PAGE_MARGIN;

    const ensureSpace = (height) => {
      if (y + height > pageBottom) {
        doc.addPage();
        y = PAGE_MARGIN;
      }
    };

    const drawSectionHeader = (title) => {
      ensureSpace(sectionHeaderH + sectionGap);
      if (y > PAGE_MARGIN) y += sectionGap;
      doc.rect(leftX, y, fullWidth, sectionHeaderH).fill(COLORS.primary);
      doc.fillColor(COLORS.tableHeaderText).fontSize(sectionHeaderFont).font('Helvetica-Bold')
        .text(title, leftX + 8, y + 5, { width: fullWidth - 16 });
      doc.fillColor(COLORS.text);
      y += sectionHeaderH + 6;
    };

    const measureRowHeight = (cells, colWidths, fontSize) => {
      let maxCellH = 20;
      cells.forEach((cell, idx) => {
        const textH = doc.heightOfString(String(cell ?? '—'), {
          width: colWidths[idx] - 10,
          fontSize
        });
        maxCellH = Math.max(maxCellH, textH + 12);
      });
      return maxCellH;
    };

    const drawTable = ({ headers, rows, colWidths }) => {
      const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
      let tableY = y;

      const drawRow = (cells, isHeader, fillColor) => {
        const fontSize = isHeader ? tableHeaderFont : tableBodyFont;
        const h = isHeader ? tableHeaderH : measureRowHeight(cells, colWidths, fontSize);
        ensureSpace(h);

        if (tableY + h > pageBottom) {
          doc.addPage();
          tableY = PAGE_MARGIN;
          y = PAGE_MARGIN;
        }

        if (fillColor) {
          doc.rect(leftX, tableY, tableWidth, h).fill(fillColor);
        }
        doc.strokeColor(COLORS.border).lineWidth(0.5);
        doc.rect(leftX, tableY, tableWidth, h).stroke();

        let cellX = leftX;
        cells.forEach((cell, idx) => {
          if (idx > 0) {
            doc.moveTo(cellX, tableY).lineTo(cellX, tableY + h).stroke();
          }
          doc.fillColor(isHeader ? COLORS.tableHeaderText : COLORS.text)
            .fontSize(fontSize)
            .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
            .text(String(cell ?? '—'), cellX + 5, tableY + 6, {
              width: colWidths[idx] - 10,
              height: h - 8,
              align: 'left'
            });
          cellX += colWidths[idx];
        });
        tableY += h;
      };

      drawRow(headers, true, COLORS.tableHeader);
      rows.forEach((row, idx) => {
        drawRow(row, false, idx % 2 === 1 ? COLORS.tableRowAlt : '#ffffff');
      });

      y = tableY + 8;
    };

    const drawTextFieldGrid = (pairs) => {
      const columns = 3;
      const colWidth = (fullWidth - (columns - 1) * 12) / columns;
      const rowCount = Math.ceil(pairs.length / columns);

      for (let row = 0; row < rowCount; row += 1) {
        const rowPairs = [];
        for (let col = 0; col < columns; col += 1) {
          const index = row * columns + col;
          if (index < pairs.length) rowPairs.push(pairs[index]);
        }

        let rowHeight = 28;
        rowPairs.forEach(([, value]) => {
          const valueH = doc.heightOfString(String(value), { width: colWidth, fontSize: gridValueFont });
          rowHeight = Math.max(rowHeight, valueH + 20);
        });
        ensureSpace(rowHeight);

        rowPairs.forEach(([label, value], col) => {
          const x = leftX + col * (colWidth + 12);
          doc.fontSize(gridLabelFont).font('Helvetica-Bold').fillColor(COLORS.muted)
            .text(label, x, y, { width: colWidth });
          doc.fontSize(gridValueFont).font('Helvetica').fillColor(COLORS.text)
            .text(String(value), x, y + gridLabelFont + 4, { width: colWidth });
        });

        y += rowHeight;
      }
    };

    // ----- Title bar -----
    const titleBarH = 40;
    doc.rect(0, 0, pageWidth, titleBarH).fill(COLORS.primary);
    doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold')
      .text('Application Profile', leftX, 11, { width: sideWidth });
    doc.fontSize(8).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString('en-IN')}`, leftX, 27, { width: sideWidth });

    // ----- Photo (top-right, same as view dialog) -----
    const photoY = titleBarH + 8;
    doc.roundedRect(photoX, photoY, PHOTO_W, PHOTO_H, 4).lineWidth(1).strokeColor('#ffffff').stroke();
    if (photoBuffer) {
      try {
        doc.save();
        doc.roundedRect(photoX + 2, photoY + 2, PHOTO_W - 4, PHOTO_H - 4, 3).clip();
        doc.image(photoBuffer, photoX + 2, photoY + 2, {
          fit: [PHOTO_W - 4, PHOTO_H - 4],
          align: 'center',
          valign: 'center'
        });
        doc.restore();
      } catch {
        doc.fontSize(8).fillColor(COLORS.muted).text('N/A', photoX, photoY + 44, { width: PHOTO_W, align: 'center' });
      }
    } else {
      doc.fontSize(8).fillColor(COLORS.muted).text('No photo', photoX, photoY + 44, { width: PHOTO_W, align: 'center' });
    }
    doc.fillColor(COLORS.text);

    // ----- Candidate summary (left of photo — matches view dialog header) -----
    y = photoY;
    doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.primary)
      .text(candidateDisplayName, leftX, y, { width: sideWidth });
    y = doc.y + 6;

    doc.fontSize(gridValueFont).font('Helvetica').fillColor(COLORS.text)
      .text(formatTextValue(candidate.user?.email || appData.email), leftX, y, { width: sideWidth });
    y = doc.y + 3;

    const phone = candidate.user?.profile?.phone || appData.phone || appData.mobileNumber || appData.mobile;
    if (phone) {
      doc.text(`Phone: ${formatTextValue(phone)}`, leftX, y, { width: sideWidth });
      y = doc.y + 3;
    }

    const positionLine = [
      candidate.form?.position,
      candidate.form?.department,
      candidate.form?.campus
    ].filter(Boolean).join(' · ');
    if (positionLine) {
      doc.fillColor(COLORS.muted).text(positionLine, leftX, y, { width: sideWidth });
      y = doc.y + 3;
    }

    doc.fillColor(COLORS.text)
      .text(`Status: ${(candidate.status || 'pending').toUpperCase()}`, leftX, y, { width: sideWidth });

    y = Math.max(doc.y + 12, photoY + PHOTO_H + sectionGap);

    // ----- Application Responses (same fields as view dialog) -----
    if (textFields.length > 0 || tableBlocks.length > 0) {
      drawSectionHeader('Application Responses');

      if (textFields.length > 0) {
        drawTextFieldGrid(textFields);
        y += 4;
      }

      tableBlocks.forEach((block) => {
        ensureSpace(36);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary)
          .text(block.label, leftX, y, { width: fullWidth });
        doc.fillColor(COLORS.text);
        y = doc.y + 6;
        drawTable({
          headers: block.headers,
          rows: block.rows,
          colWidths: block.colWidths
        });
      });
    }

    // ----- Documents (same as view dialog) -----
    if (documents.length > 0) {
      drawSectionHeader('Documents');
      drawTable({
        headers: ['Document', 'Status'],
        rows: documents.map((d) => [d.name || 'Document', d.url ? 'Uploaded' : '—']),
        colWidths: [fullWidth - 90, 90]
      });
    }

    // ----- Footer on every page -----
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i += 1) {
      doc.switchToPage(i);
      const lineY = pageHeight - PAGE_MARGIN - 18;
      doc.moveTo(leftX, lineY).lineTo(pageWidth - PAGE_MARGIN, lineY).stroke(COLORS.border);
      doc.fontSize(8).fillColor(COLORS.muted)
        .text('Pydah Recruitment — Confidential Application Profile', leftX, footerTextY, {
          width: fullWidth,
          align: 'center'
        });
    }

    safeEnd();
  } catch (pdfError) {
    safeEnd();
    throw pdfError;
  }
};

module.exports = {
  generateApplicationProfilePdf,
  resolvePassportPhotoUrl,
  getApplicationDataObject
};
