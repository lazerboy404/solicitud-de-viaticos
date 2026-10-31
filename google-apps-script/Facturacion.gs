// Servicio privado: la interfaz HTML también se sirve desde este proyecto para
// utilizar google.script.run y respetar el acceso limitado a la organización.
const INVOICE_SETTINGS = Object.freeze({
  TEST_MODE: true,
  // Vacío = permite pruebas solo a la cuenta Google que ejecuta el servicio.
  TEST_EMAIL: '',
  PRODUCTION_EMAIL: 'facturacion@centralponiente.com.mx',
});

function doGet() {
  return HtmlService.createTemplateFromFile('factura').evaluate()
    .setTitle('Factura de estacionamiento · Solicitudes')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function autorizarFacturacion() {
  GmailApp.getAliases();
  Logger.log('Correo de prueba: ' + testRecipient_());
}

function testRecipient_() {
  const email = (INVOICE_SETTINGS.TEST_EMAIL || Session.getEffectiveUser().getEmail()).trim().toLowerCase();
  if (!email) throw new Error('Configura TEST_EMAIL con tu correo de prueba en Google Apps Script.');
  return email;
}

function invoiceDate_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('La fecha no es válida.');
  const parts = value.split('-').map(Number);
  const year = parts[0], month = parts[1], day = parts[2];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 2000 || year > 2100 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('La fecha no es válida.');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return { short: value.split('-').reverse().join('/'), long: String(day).padStart(2, '0') + ' de ' + months[month - 1] + ' de ' + year };
}

function invoiceAttachments_(files) {
  if (!Array.isArray(files) || files.length !== 2) throw new Error('Se necesitan el PDF fiscal y una foto del ticket.');
  let total = 0;
  return files.map(function (file, index) {
    if (!file || typeof file.name !== 'string' || typeof file.data !== 'string' || !file.data || file.data.length > 12 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)) throw new Error('Uno de los archivos no se pudo leer. Selecciónalo de nuevo.');
    const name = file.name.replace(/[\\/\r\n\x00-\x1f]/g, '_').slice(-120);
    const bytes = Utilities.base64Decode(file.data);
    total += bytes.length;
    if (!bytes.length || total > 8 * 1024 * 1024) throw new Error('Los archivos deben sumar como máximo 8 MB y no estar vacíos.');
    const b = bytes.slice(0, 12).map(function (value) { return value & 255; });
    let mime;
    if (index === 0) {
      if (!/\.pdf$/i.test(name) || b[0] !== 37 || b[1] !== 80 || b[2] !== 68 || b[3] !== 70 || b[4] !== 45) throw new Error('La constancia no es un archivo PDF válido.');
      mime = 'application/pdf';
    } else if (/\.jpe?g$/i.test(name) && b[0] === 255 && b[1] === 216 && b[2] === 255) {
      mime = 'image/jpeg';
    } else if (/\.png$/i.test(name) && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10) {
      mime = 'image/png';
    } else if (/\.webp$/i.test(name) && b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 && b[10] === 66 && b[11] === 80) {
      mime = 'image/webp';
    } else {
      throw new Error('La foto del ticket debe ser un archivo JPG, PNG o WEBP válido.');
    }
    return Utilities.newBlob(bytes, mime, name);
  });
}

function invoiceBody_(date) {
  return 'Buenos dias,\n\n' +
    'Por este medio le solicito de la manera más amable mi factura del estacionamiento ocupado el día ' + date.long + '.\n\n' +
    'Adjunto a este correo encontrará mi ticket y mi constancia de situación fiscal con los datos necesarios para la facturación.\n\n' +
    'Agradezco de antemano su atención y apoyo con esta solicitud.\n\n' +
    'Atentamente,\nEinar Ulises Arenas Hernandez';
}

function sendInvoiceRequest(payload) {
  let lock;
  try {
    if (!payload || typeof payload !== 'object') throw new Error('La solicitud no tiene un formato válido.');
    if (typeof payload.requestId !== 'string' || !/^[a-f0-9]{48}$/.test(payload.requestId)) throw new Error('La solicitud no tiene un identificador válido.');
    const expectedMode = INVOICE_SETTINGS.TEST_MODE ? 'test' : 'production';
    if (payload.mode !== expectedMode) throw new Error('El modo de prueba de la página y el de Google Apps Script no coinciden.');
    const recipient = INVOICE_SETTINGS.TEST_MODE ? testRecipient_() : INVOICE_SETTINGS.PRODUCTION_EMAIL;
    if (typeof payload.recipient !== 'string' || payload.recipient.trim().toLowerCase() !== recipient.toLowerCase()) {
      throw new Error(INVOICE_SETTINGS.TEST_MODE ? 'Para las pruebas, escribe el correo de la cuenta de Google que estás usando para abrir esta página.' : 'El destinatario no coincide con el correo de facturación configurado.');
    }
    const date = invoiceDate_(payload.date);
    const attachments = invoiceAttachments_(payload.attachments);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) throw new Error('Hay otro envío en proceso. Espera unos momentos y revisa Enviados antes de reintentar.');
    const cache = CacheService.getScriptCache();
    if (cache.get(payload.requestId) !== 'sent') {
      GmailApp.sendEmail(recipient, 'SOLICITUD DE FACTURA ' + date.short, invoiceBody_(date), {
        attachments: attachments,
        name: 'Einar Ulises Arenas Hernandez',
      });
      try { cache.put(payload.requestId, 'sent', 21600); } catch (cacheError) { /* El correo ya fue aceptado por Gmail. */ }
    }
    return { ok: true, recipient: recipient };
  } catch (error) {
    throw new Error(String(error.message || 'No se pudo completar el envío.'));
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
