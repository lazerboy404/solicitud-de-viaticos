// Servicio privado: la interfaz HTML también se sirve desde este proyecto para
// utilizar google.script.run y respetar el acceso limitado a la organización.
const INVOICE_SETTINGS = Object.freeze({
  TEST_MODE: false,
  // Vacío = permite pruebas solo a la cuenta Google que ejecuta el servicio.
  TEST_EMAIL: '',
  // ID privado del PDF en Drive. No pegues el ID en el sitio público de GitHub.
  TAX_CERTIFICATE_FILE_ID: '',
  TAX_CERTIFICATE_NAME: 'SAT Constancia.pdf',
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
  DriveApp.getRootFolder().getName();
  if (INVOICE_SETTINGS.TAX_CERTIFICATE_FILE_ID) DriveApp.getFileById(INVOICE_SETTINGS.TAX_CERTIFICATE_FILE_ID).getName();
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

function invoiceGreeting_() {
  const hour = Number(Utilities.formatDate(new Date(), 'America/Mexico_City', 'H'));
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function taxCertificate_() {
  if (!INVOICE_SETTINGS.TAX_CERTIFICATE_FILE_ID) throw new Error('Falta guardar tu constancia PDF en Google Drive y configurar su ID en Apps Script.');
  const file = DriveApp.getFileById(INVOICE_SETTINGS.TAX_CERTIFICATE_FILE_ID);
  if (file.getMimeType() !== 'application/pdf') throw new Error('El archivo fijo de Drive no es un PDF. Revisa el ID de la constancia.');
  const bytes = file.getBlob().getBytes();
  const signature = bytes.slice(0, 5).map(function (value) { return value & 255; });
  if (signature[0] !== 37 || signature[1] !== 80 || signature[2] !== 68 || signature[3] !== 70 || signature[4] !== 45) throw new Error('El archivo fijo de Drive no es una constancia PDF válida.');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('La constancia PDF debe tener un tamaño máximo de 8 MB.');
  return Utilities.newBlob(bytes, 'application/pdf', INVOICE_SETTINGS.TAX_CERTIFICATE_NAME);
}

function ticketAttachment_(files, date) {
  if (!Array.isArray(files) || files.length !== 1) throw new Error('Selecciona la foto del ticket.');
  const file = files[0];
  if (!file || typeof file.name !== 'string' || typeof file.data !== 'string' || !file.data || file.data.length > 12 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)) throw new Error('La foto del ticket no se pudo leer. Selecciónala de nuevo.');
  const name = file.name.replace(/[\\/\r\n\x00-\x1f]/g, '_').slice(-120);
  const bytes = Utilities.base64Decode(file.data);
  const b = bytes.slice(0, 12).map(function (value) { return value & 255; });
  if (!bytes.length || /\.(jpe?g|png|webp)$/i.test(name) === false) throw new Error('La foto del ticket debe ser JPG, PNG o WEBP.');
  let mime;
  if (/\.jpe?g$/i.test(name) && b[0] === 255 && b[1] === 216 && b[2] === 255) mime = 'image/jpeg';
  else if (/\.png$/i.test(name) && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10) mime = 'image/png';
  else if (/\.webp$/i.test(name) && b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 && b[10] === 66 && b[11] === 80) mime = 'image/webp';
  else throw new Error('La foto del ticket debe ser un archivo JPG, PNG o WEBP válido.');
  const extension = name.match(/\.(jpe?g|png|webp)$/i)[0].toLowerCase();
  const datedName = 'ticket_' + date.short.replace(/\//g, '-') + extension;
  return Utilities.newBlob(bytes, mime, datedName);
}

function invoiceBody_(date) {
  return invoiceGreeting_() + ',\n\n' +
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
    const certificate = taxCertificate_();
    const ticket = ticketAttachment_(payload.attachments, date);
    if (certificate.getBytes().length + ticket.getBytes().length > 8 * 1024 * 1024) throw new Error('La constancia y la foto del ticket deben sumar como máximo 8 MB.');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) throw new Error('Hay otro envío en proceso. Espera unos momentos y revisa Enviados antes de reintentar.');
    const cache = CacheService.getScriptCache();
    if (cache.get(payload.requestId) !== 'sent') {
      GmailApp.sendEmail(recipient, 'SOLICITUD DE FACTURA ' + date.short, invoiceBody_(date), {
        attachments: [certificate, ticket],
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
