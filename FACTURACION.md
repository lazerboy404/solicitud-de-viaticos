# Factura de estacionamiento: conexión y pruebas

El apartado de facturación se sirve **desde Google Apps Script** para usar el acceso de Google Workspace de `intt2.com`. El enlace desde GitHub abre esa página de Google. El formulario llama al servidor mediante `google.script.run`, no desde el origen externo de GitHub.

El módulo de **viáticos no cambia**: sigue en GitHub Pages y usa EmailJS.

## Guardar una vez la constancia PDF

La página ya no solicita el PDF en cada envío. Apps Script lo leerá de tu Drive privado y lo adjuntará automáticamente junto con la foto que selecciones.

1. Entra a [Google Drive](https://drive.google.com/) con `earenas@intt2.com`.
2. Pulsa **Nuevo → Subir archivo** y selecciona este archivo de tu computadora: `google-apps-script/SAT Constancia.pdf`.
3. Mantén el archivo **Restringido**. No lo compartas con “Cualquier persona” y no lo pongas en GitHub.
4. Cuando termine de subir, ábrelo en Drive. Copia el identificador de la URL, que aparece entre `/d/` y `/view` (o después de `id=`). No es el nombre del archivo.
5. En Apps Script, abre **Código.gs** y busca `TAX_CERTIFICATE_FILE_ID: ''`. Pega el ID entre las comillas. Deja `TAX_CERTIFICATE_NAME: 'SAT Constancia.pdf'` como está.
6. Guarda el código. El ID permanece solo en tu proyecto privado de Apps Script; **no lo copies a `factura-config.js` ni lo publiques en GitHub**.

La copia del proyecto dentro de GitHub conserva el ID vacío para no exponer la referencia al documento privado.

## Destinatario, saludo y nombre del ticket

El código actualizado está en **modo producción** y envía al destinatario fijo `facturacion@centralponiente.com.mx`. Al confirmar el formulario, el correo se enviará a esa dirección.

El saludo se calcula según la hora de Ciudad de México: **Buenos días** de 05:00 a 11:59, **Buenas tardes** de 12:00 a 18:59 y **Buenas noches** el resto del día. La foto se adjunta como `ticket_DD-MM-AAAA.ext`; por ejemplo, para el 8 de octubre de 2026, `ticket_08-10-2026.png`.

## Actualizar el proyecto de Google Apps Script

En el editor donde ya autorizaste `autorizarFacturacion`:

1. Abre el archivo del proyecto local `google-apps-script/Facturacion.gs`. Copia todo su contenido.
2. En Apps Script, abre `Código.gs`, selecciona todo y reemplázalo por ese contenido. Guarda.
3. A la izquierda, junto a **Archivos**, pulsa **+ → HTML**. Crea estos tres archivos con estos nombres exactos (sin escribir `.html` en el nombre si el editor lo agrega):
   - `factura` (f minúscula; reemplaza el archivo en blanco que ya creaste)
   - `FacturaStyles`
   - `FacturaClient`
4. En cada archivo nuevo, copia el contenido del archivo correspondiente de la carpeta local `google-apps-script/` y guarda:
   - `factura` ← `google-apps-script/Factura.html`
   - `FacturaStyles` ← `google-apps-script/FacturaStyles.html`
   - `FacturaClient` ← `google-apps-script/FacturaClient.html`
   Si el editor añade `.html` automáticamente, escribe los nombres sin la extensión.
5. Conserva `TEST_MODE: false` y `TEST_EMAIL: ''` en `Código.gs`. El cliente envía en modo `production` y el servidor fija el destinatario de facturación, incluso si alguien altera el navegador.

## Implementar la interfaz dentro de tu organización

1. En Apps Script, abre **Implementar → Gestionar implementaciones**.
2. En la implementación web existente, pulsa el lápiz **Editar**.
3. En **Versión**, selecciona **Nueva versión**. Si aún no autorizaste Drive, ejecuta antes **autorizarFacturacion** y acepta ese permiso.
4. Conserva **Ejecutar como: Yo (earenas@intt2.com)** y el acceso **Cualquier usuario de INT INTELLIGENCE AND TELECOM TECHNOLOGIES**. No necesitas habilitar acceso público ni cambiar la política de la empresa.
5. Pulsa **Implementar** y conserva la URL `/exec` existente.

El proyecto devuelve la interfaz y procesa el envío en Google Apps Script. Por eso la página de facturación abre en una URL de Google y debe usarse con la sesión de empresa iniciada. La solicitud de viáticos continúa en GitHub Pages.

## Enviar la solicitud

1. Abre [la página de viáticos](https://lazerboy404.github.io/solicitud-de-viaticos/) y pulsa **Factura de estacionamiento**, o abre directamente la URL `/exec` de la implementación.
2. Verifica que el navegador esté iniciado con tu cuenta de `intt2.com`.
3. Selecciona la fecha del ticket. Para el 8 de octubre de 2026, el asunto debe decir `SOLICITUD DE FACTURA 08/10/2026`.
4. Revisa el destinatario fijo `facturacion@centralponiente.com.mx` y la constancia que se adjunta automáticamente.
5. Selecciona solamente la foto del ticket (JPG, PNG o WEBP). El PDF fijo y la foto deben sumar como máximo **8 MB**.
6. Revisa el saludo automático y el nombre fechado de la foto. Pulsa **Revisar y enviar solicitud** y luego **Sí, enviar correo**.
7. El envío irá al destinatario real de facturación. La página mostrará la confirmación y los intentos aparecerán en **Ejecuciones** de Apps Script.

El servicio valida la fecha, el PDF privado de Drive, el tipo y el contenido de la foto, el tamaño total y el destinatario. También evita procesar dos veces el mismo identificador. La constancia permanece en tu Drive privado; la foto del ticket se usa para ese envío y no se guarda en Drive ni en el repositorio.

## Problemas frecuentes

- **No aparece la página:** inicia sesión con la cuenta de `intt2.com` y abre la URL `/exec` directamente. El servicio es privado para la organización.
- **No aparece una función o un archivo incluido:** revisa que creaste los HTML con los nombres exactos `factura` (f minúscula), `FacturaStyles` y `FacturaClient`, sin duplicar extensiones.
- **Error al enviar o no llega el mensaje:** abre **Ejecuciones** en Apps Script y revisa el detalle de `sendInvoiceRequest`. Comprueba también Gmail → **Enviados** antes de reintentar.
- **Falta configurar la constancia:** súbela a Drive, pega su ID privado en `TAX_CERTIFICATE_FILE_ID` de `Código.gs`, autoriza Drive y crea una nueva versión.
- **La foto es inválida o demasiado grande:** selecciona una foto JPG/PNG/WEBP válida; el total con el PDF fijo debe ser menor de 8 MB.
- **El destinatario no coincide:** verifica que `TEST_MODE` esté en `false` en `Código.gs`. El cliente envía en modo `production` y el servidor fija `facturacion@centralponiente.com.mx`.
- **Cambiaste el código y la versión activa no cambia:** guarda y selecciona **Nueva versión** antes de implementar.
