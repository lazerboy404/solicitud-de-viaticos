# Factura de estacionamiento: conexión y pruebas

El apartado de facturación se sirve **desde Google Apps Script** para usar el acceso de Google Workspace de `intt2.com`. El enlace desde GitHub abre esa página de Google. El formulario llama al servidor mediante `google.script.run`, no desde el origen externo de GitHub.

El módulo de **viáticos no cambia**: sigue en GitHub Pages y usa EmailJS.

## Configuración de prueba

El proyecto está en modo de prueba. El script envía solo a `earenas@intt2.com`, la cuenta propietaria de la implementación, y rechaza otros destinatarios. El selector del destinatario no muestra el correo de producción. **No se envía a `facturacion@centralponiente.com.mx` mientras `TEST_MODE` siga en `true`.**

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
5. Deja `TEST_MODE: true` y `TEST_EMAIL: ''` en `Código.gs`. Así el servidor permite como destinatario de prueba solo a la cuenta de la empresa propietaria.

## Implementar la interfaz dentro de tu organización

1. En Apps Script, abre **Implementar → Gestionar implementaciones**.
2. En la implementación web existente, pulsa el lápiz **Editar**.
3. En **Versión**, selecciona **Nueva versión**.
4. Conserva **Ejecutar como: Yo (earenas@intt2.com)** y el acceso **Cualquier usuario de INT INTELLIGENCE AND TELECOM TECHNOLOGIES**. No necesitas habilitar acceso público ni cambiar la política de la empresa.
5. Pulsa **Implementar** y conserva la URL `/exec` existente.

El proyecto devuelve la interfaz y procesa el envío en Google Apps Script. Por eso la página de facturación abre en una URL de Google y debe usarse con la sesión de empresa iniciada. La solicitud de viáticos continúa en GitHub Pages.

## Prueba con los archivos

1. Abre [la página de viáticos](https://lazerboy404.github.io/solicitud-de-viaticos/) y pulsa **Factura de estacionamiento**, o abre directamente la URL `/exec` de la implementación.
2. Verifica que el navegador esté iniciado con `earenas@intt2.com`.
3. Selecciona la fecha del ticket. Para el 8 de octubre de 2026, el asunto debe decir `SOLICITUD DE FACTURA 08/10/2026`.
4. En el campo de prueba escribe `earenas@intt2.com`.
5. Carga tu constancia PDF y la foto del ticket (JPG, PNG o WEBP). Entre los dos archivos deben sumar como máximo **8 MB**.
6. Revisa el mensaje y los adjuntos; pulsa **Revisar y enviar solicitud** y luego **Sí, enviar correo**.
7. Espera la confirmación y revisa **Recibidos** en Gmail. Ambos documentos deben llegar como archivos adjuntos que se puedan abrir. Los intentos también aparecen en **Ejecuciones** de Apps Script.

El servicio valida la fecha, el tipo y el contenido de ambos archivos, el tamaño y el destinatario. También evita procesar dos veces el mismo identificador. No guarda los archivos en Drive ni en el repositorio.

## Cuando quieras activar el correo de facturación

Hazlo solo después de que una prueba real llegue con ambos adjuntos:

1. En `google-apps-script/Facturacion.gs` y en `Código.gs`, cambia `TEST_MODE: true` a `TEST_MODE: false`.
2. En `google-apps-script/FacturaClient.html`, cambia `TEST_MODE = true` a `TEST_MODE = false`.
3. Guarda y crea una **Nueva versión** en **Implementar → Gestionar implementaciones → Editar**.
4. Actualiza los tres archivos del proyecto GitHub para que correspondan con sus copias locales y publícalos. `factura.html` ya enlaza con la URL `/exec`.

En producción el servidor fija el destinatario a `facturacion@centralponiente.com.mx`; ignora cualquier dirección que pudiera alterarse en el navegador. No agrega las copias de viáticos. El acceso a la aplicación seguirá limitado a la organización.

## Problemas frecuentes

- **No aparece la página:** inicia sesión con la cuenta de `intt2.com` y abre la URL `/exec` directamente. El servicio es privado para la organización.
- **No aparece una función o un archivo incluido:** revisa que creaste los HTML con los nombres exactos `factura` (f minúscula), `FacturaStyles` y `FacturaClient`, sin duplicar extensiones.
- **Error al enviar o no llega el mensaje:** abre **Ejecuciones** en Apps Script y revisa el detalle de `sendInvoiceRequest`. Comprueba también Gmail → **Enviados** antes de reintentar.
- **La cuenta de prueba no coincide:** prueba con la cuenta que implementó el servicio: `earenas@intt2.com`.
- **Archivo inválido o demasiado grande:** selecciona un PDF real y una foto JPG/PNG/WEBP; el total debe ser menor de 8 MB.
- **Cambiaste el código y la versión activa no cambia:** guarda y selecciona **Nueva versión** antes de implementar.
