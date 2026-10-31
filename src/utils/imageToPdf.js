/**
 * مبدل سبک و استاندارد عکس به فایل PDF درون مرورگر (Client-side Images to PDF Converter)
 * ویژه دانشجویان جهت تبدیل و ادغام عکس‌های برگه‌های دست‌نویس به یک فایل PDF کم‌حجم و استاندارد
 */

/**
 * تبدیل آرایه‌ای از آبجکت‌های File (تصاویر) به یک شیء File با پسوند .pdf
 * @param {File[]} imageFiles
 * @param {string} outputFileName
 * @returns {Promise<File>}
 */
export async function convertImagesToPdf(imageFiles, outputFileName = 'assignment_submission.pdf') {
  if (!imageFiles || imageFiles.length === 0) {
    throw new Error('حداقل یک تصویر باید انتخاب شود.');
  }

  // ۱. پردازش و فشرده‌سازی هر تصویر روی کانواس
  const processedPages = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const pageData = await processImageFileToJpeg(file);
    processedPages.push(pageData);
  }

  // ۲. تولید فایل PDF استاندارد بر اساس مشخصات PDF-1.4
  const pdfBlob = buildPdfFromJpegPages(processedPages);

  return new File([pdfBlob], outputFileName, { type: 'application/pdf' });
}

/**
 * بارگذاری تصویر روی Canvas و استخراج باینری JPEG
 */
function processImageFileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // ابعاد استاندارد با حفظ نسبت تصویر (حداکثر عرض یا ارتفاع ۱۶۰۰ پیکسل جهت کیفیت عالی و حجم پایین)
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // پس‌زمینه سفید برای تصاویر شفاف (PNG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('خطا در فشرده‌سازی تصویر'));
            }
            const blobReader = new FileReader();
            blobReader.onload = () => {
              const arrayBuffer = blobReader.result;
              const uint8 = new Uint8Array(arrayBuffer);
              resolve({
                width: w,
                height: h,
                jpegBytes: uint8,
              });
            };
            blobReader.onerror = reject;
            blobReader.readAsArrayBuffer(blob);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error(`امکان بارگذاری تصویر ${file.name} وجود ندارد.`));
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * ساخت ساختار باینری PDF 1.4 با پشتیبانی از فیلتر DCTDecode (JPEG)
 */
function buildPdfFromJpegPages(pages) {
  const chunks = [];
  const xrefOffsets = [];

  function write(str) {
    const encoder = new TextEncoder();
    chunks.push(encoder.encode(str));
  }

  function writeBytes(uint8) {
    chunks.push(uint8);
  }

  function currentOffset() {
    return chunks.reduce((acc, c) => acc + c.byteLength, 0);
  }

  // هدر استاندارد PDF
  write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const pageCount = pages.length;
  const pageObjIds = [];

  // اشیاء لازم برای هر صفحه:
  // obj 1: Catalog
  // obj 2: Pages
  // برای هر صفحه i (شروع از 0):
  // pageObj: 3 + i * 3
  // contentObj: 3 + i * 3 + 1
  // imageObj: 3 + i * 3 + 2

  for (let i = 0; i < pageCount; i++) {
    pageObjIds.push(3 + i * 3);
  }

  // Obj 1: Catalog
  xrefOffsets[1] = currentOffset();
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages Tree
  xrefOffsets[2] = currentOffset();
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  write(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pageCount} >>\nendobj\n`);

  // برای هر صفحه:
  for (let i = 0; i < pageCount; i++) {
    const p = pages[i];
    const pageId = 3 + i * 3;
    const contentId = 3 + i * 3 + 1;
    const imageId = 3 + i * 3 + 2;

    // نسبت صفحه استاندارد در واحد پوینت (PDF Points: 72 points per inch)
    // تناسب ابعاد بر اساس تصویر
    const ptWidth = Math.round((p.width / 96) * 72);
    const ptHeight = Math.round((p.height / 96) * 72);

    // شیء Page
    xrefOffsets[pageId] = currentOffset();
    write(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth} ${ptHeight}] /Resources << /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );

    // شیء Content Stream
    const streamContent = `q ${ptWidth} 0 0 ${ptHeight} 0 0 cm /Im1 Do Q\n`;
    const streamLen = new TextEncoder().encode(streamContent).byteLength;
    xrefOffsets[contentId] = currentOffset();
    write(`${contentId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj\n`);

    // شیء Image (JPEG DCTDecode)
    xrefOffsets[imageId] = currentOffset();
    write(
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`
    );
    writeBytes(p.jpegBytes);
    write('\nendstream\nendobj\n');
  }

  // جدول XREF
  const startXref = currentOffset();
  const totalObjs = 2 + pageCount * 3 + 1;
  write(`xref\n0 ${totalObjs}\n`);
  write('0000000000 65535 f \n');
  for (let id = 1; id < totalObjs; id++) {
    const off = String(xrefOffsets[id] || 0).padStart(10, '0');
    write(`${off} 00000 n \n`);
  }

  // تریلر
  write(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}
