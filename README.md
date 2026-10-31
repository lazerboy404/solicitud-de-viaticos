# Solicitud de viáticos · EDOMEX–Toluca C5

Aplicación estática en HTML, CSS y JavaScript. Calcula los viáticos, genera una vista previa y envía el correo en segundo plano con el SDK de **EmailJS**. Funciona en Vercel y GitHub Pages, sin servidor propio ni compilación.

## Apartado independiente de facturación

La pestaña **Factura de estacionamiento** abre una interfaz privada de Google Apps Script con calendario y adjuntos PDF + foto del ticket. La cuenta de Workspace limita el acceso a la organización; por eso la interfaz de facturas y el envío viven dentro de Apps Script. El enlace desde GitHub redirige a esa página. Está preparada en modo de prueba, para enviar únicamente a la cuenta propietaria de la implementación. Sigue [FACTURACION.md](./FACTURACION.md). Este apartado no cambia la configuración ni el envío de viáticos.

## Archivos

| Archivo | Función |
| --- | --- |
| `index.html` | Formulario, desglose, vista previa y alertas. |
| `styles.css` | Diseño responsivo. |
| `config.js` | Los tres valores de tu cuenta EmailJS y los destinatarios fijos en `MAIL_RECIPIENTS`. |
| `app.js` | Cálculos, validaciones, plantilla y envío. |
| `emailjs-template.html` | Contenido para pegar en la plantilla del panel de EmailJS. |
| `factura.html` | Redirige al apartado privado de facturas servido por Apps Script. |
| `google-apps-script/` | Backend de adjuntos y archivos HTML del apartado privado de Apps Script. |
| `FACTURACION.md` | Pasos para actualizar Apps Script y probar los adjuntos. |

## 1. Conectar tu servicio de correo

1. Crea una cuenta o inicia sesión en [EmailJS](https://dashboard.emailjs.com/).
2. En **Email Services**, selecciona **Add New Service**.
3. Elige tu proveedor (por ejemplo, Gmail u Outlook), conecta la cuenta desde la que enviarás los correos y autoriza el envío.
4. Realiza la prueba del servicio que ofrece EmailJS.
5. Copia el **Service ID**, por ejemplo `service_abc123`.

La cuenta conectada es la remitente real. El nombre y la dirección de respuesta se configuran en la plantilla; la firma del mensaje no cambia la cuenta remitente.

## 2. Configurar la plantilla (importante)

1. En **Email Templates**, crea una plantilla nueva.
2. Configura los campos con estos valores exactos:

   | Campo en EmailJS | Valor |
   | --- | --- |
   | **To Email** | `{{to_email}}` |
   | **Subject** | `SOLICITUD DE VIATICOS EDOMEX-TOLUCA C5` |
   | **From Name** | `{{from_name}}` |
   | **From Email** | Usa la dirección predeterminada del servicio conectado (opción **Use Default Email Address**, si aparece). |
   | **Reply To** | `{{reply_to}}` |
   | **Cc** | `{{cc_email}}` |
   | **Bcc** | Vacío. |

3. En **Content**, abre el editor de código HTML (**Code Editor** o el botón de código del editor). Reemplaza el contenido completo por el de `emailjs-template.html`:

   El contenido completo debe ser únicamente `{{{message_html}}}` (tres llaves de cada lado), como aparece en `emailjs-template.html`. La aplicación envía el HTML de la plantilla elegida, con los importes calculados y la firma de colores. Las triples llaves permiten que el HTML se represente como correo con formato. Pégalo en el editor HTML, no como texto en el editor visual. Reemplaza toda la plantilla anterior para que no se duplique el cuerpo o la firma.

4. Guarda la plantilla y copia su **Template ID**, por ejemplo `template_xyz789` (en **Settings**, según la versión del panel).
5. Si pruebas desde el panel, introduce valores de ejemplo para `to_email`, `cc_email`, `message_html` (por ejemplo `<p>Prueba de envío</p>`), `from_name` y `reply_to`. El panel no obtiene automáticamente los valores de la aplicación.

El asunto se deja fijo en EmailJS para conservarlo exactamente. La aplicación también manda `subject` con ese mismo texto; si prefieres usar `{{subject}}` en el campo Subject, recibirá el mismo valor.

### Variables que recibe EmailJS

| Variable | Contenido |
| --- | --- |
| `to_email` | Destinatario fijo: erangel@intt2.com. **Debe estar en To Email**. |
| `cc_email` | Copias fijas: fromo@intt2.com, salarcon@intt2.com. **Debe estar en Cc**. |
| `subject` | Asunto exacto solicitado. |
| `message` | Cuerpo completo de texto, disponible si prefieres una plantilla sin formato. |
| `message_html` | HTML completo de la plantilla elegida, idéntico al de la vista previa. **Content debe usar `{{{message_html}}}`**. |
| `from_name` | EINAR ULISES ARENAS HERNÁNDEZ |
| `reply_to` | earenas@intt2.com |
| `days` | Número entero de días. |
| `total_alimentos` | Importe de alimentos, con `$` y `MXN`. |
| `total_traslado` | Importe de traslado local, con `$` y `MXN`. |
| `total_autobus` | Importe de autobús, con `$` y `MXN`. |
| `total_general` | Total de la solicitud, con `$` y `MXN`. |

La vista previa y el envío comparten el mismo HTML: no hay que mantener dos diseños. El diseño inicial se define en `renderEmailPreview`, en `app.js`, y la plantilla de EmailJS lo recibe mediante `{{{message_html}}}`. Funciona también al abrir `index.html` directamente. Los pies de página que añadan EmailJS o el proveedor no forman parte de esta vista previa.

### Elegir la plantilla del mensaje

1. En **Plantilla del correo**, elige **1. Solicitud original** o **2. Tarjeta de viáticos en trámite**.
2. La primera usa el mensaje habitual. La segunda añade, después de los importes, el aviso: “Hago la mención de que aún no cuento con la tarjeta de viáticos debido a que se encuentra en trámite, para que lo puedan considerar en el método de pago de esta solicitud.”
3. Selecciona los días y revisa el correo con formato. Los importes de ambas opciones se calculan automáticamente; los de ejemplo para cinco días no son valores fijos.
4. Pulsa **Generar y Enviar Correo Directamente**. Aparece una confirmación con la plantilla, los días y el total. **Cancelar** o la tecla **Esc** cierran la confirmación sin enviar. Solo **Sí, enviar correo** realiza el envío; los controles se bloquean mientras se procesa.

Ambas opciones usan el mismo asunto, destinatario principal, dos copias y firma de colores. La vista previa es de solo lectura. Al abrir o recargar, la aplicación comienza con **1 día** y la solicitud original. Solo necesitas una plantilla de EmailJS: la aplicación envía cualquiera de los dos mensajes mediante `{{{message_html}}}`.

## 3. Agregar tus tres valores

1. En tu cuenta EmailJS, abre **Account → API Keys** y copia la **Public Key**.
2. Edita `config.js`:

   ```javascript
   window.EMAILJS_CONFIG = Object.freeze({
     SERVICE_ID: 'service_abc123',
     TEMPLATE_ID: 'template_xyz789',
     PUBLIC_KEY: 'AQUI_TU_PUBLIC_KEY',
   });
   ```

3. Guarda el archivo.

La Public Key está diseñada para exponerse en el navegador. Aquí solo se usan los identificadores del servicio y la plantilla y la clave pública; no se necesitan contraseñas de correo ni Private Keys. Puedes configurar los orígenes permitidos de tu aplicación en la sección de seguridad de EmailJS, si está disponible en tu cuenta. Incluye el origen de producción y el de pruebas local cuando corresponda.

## 4. Ejecutar y probar

Puedes usar **Live Server** de VS Code y abrir `index.html`. Si tienes Python instalado, también puedes ejecutar desde esta carpeta:

```bash
python -m http.server 5500
```

Abre `http://localhost:5500`. Necesitas Internet para cargar EmailJS y enviar; las fuentes usan Google Fonts y tienen fuentes de sistema como alternativa.

1. Los destinatarios de viáticos están configurados en `MAIL_RECIPIENTS` dentro de `config.js`. El formulario no los muestra. Para probar con otras cuentas, cambia ahí los valores temporalmente y recarga; restáuralos al terminar.
2. Selecciona **1 día**. Debe mostrar alimentos **$350.00 MXN**, traslado **$800.00 MXN**, autobús **$180.00 MXN** y total **$1,330.00 MXN**.
3. Selecciona **5 días**. Debe mostrar **$1,750.00 MXN**, **$4,000.00 MXN**, **$900.00 MXN** y total **$6,650.00 MXN**.
4. Revisa la vista previa y presiona **Generar y Enviar Correo Directamente**.
5. Mientras se procesa, el botón indica **Enviando...** y se bloquean los controles para evitar envíos simultáneos y cambios durante el envío.
6. Aparecerá una notificación emergente con el resultado, que puedes cerrar con la X. El mensaje también queda visible debajo del formulario. Comprueba el correo recibido y la carpeta de spam, además del historial del panel EmailJS. Una respuesta exitosa confirma que EmailJS aceptó la solicitud; la entrega final depende del proveedor.

La aplicación acepta de 1 a 365 días enteros y valida cantidades fuera de rango antes del envío. El destinatario y las copias son de solo lectura y se toman de `MAIL_RECIPIENTS` en `config.js`. Si faltan los valores de configuración, se muestra un mensaje para completarlos. EmailJS debe tener `{{cc_email}}` en el campo Cc para procesar las copias.

### Ejemplo del correo para 5 días

**Asunto:** `SOLICITUD DE VIATICOS EDOMEX-TOLUCA C5`

```text
Buen día,

Solicito apoyo con los viáticos correspondientes para la siguiente semana:

Alimentos: $1,750.00 MXN
Traslado local: $4,000.00 MXN
Autobus: $900.00 MXN
Total: $6,650.00 MXN

Agradezco de antemano su apoyo y comprensión para la gestión de este trámite.
Saludos cordiales

--
EINAR ULISES ARENAS HERNÁNDEZ
Intelligence & Telecom Technologies
55 6413 2674 | earenas@intt2.com | intt2.com.mx
```

## 5. Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube estos archivos a su raíz, con `index.html` en ese nivel.
2. En el repositorio, abre **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**.
4. Selecciona tu rama (normalmente `main`) y la carpeta **/ (root)**; guarda.
5. Espera al despliegue y abre la URL que muestra GitHub, normalmente `https://TU_USUARIO.github.io/TU_REPOSITORIO/`.
6. Si configuraste orígenes permitidos en EmailJS, agrega `https://TU_USUARIO.github.io` y prueba desde la URL publicada.

Las rutas de los archivos son relativas, por lo que también funcionan dentro de la subcarpeta del repositorio.

## 6. Publicar en Vercel

1. Sube los archivos a un repositorio GitHub.
2. En [Vercel](https://vercel.com/), selecciona **Add New → Project** e importa el repositorio.
3. Elige **Framework Preset: Other**.
4. Deja **Build Command** vacío y usa la raíz del proyecto como **Output Directory** (`.` si el panel requiere indicarla). No hay instalación ni compilación necesaria.
5. Haz clic en **Deploy** y abre la URL del proyecto.
6. Si configuraste orígenes permitidos en EmailJS, agrega el origen `https://TU_PROYECTO.vercel.app` o tu dominio personalizado.

En esta aplicación estática los valores se leen de `config.js`. Agregar variables en el panel de Vercel no reemplaza automáticamente ese archivo. Al editarlo, vuelve a publicar los cambios.

## Solución de problemas

- **Falta configurar EmailJS:** reemplaza los tres valores que empiezan por `TU_` en `config.js`.
- **No se pudo cargar EmailJS:** comprueba Internet y que el navegador pueda cargar el SDK de `cdn.jsdelivr.net`.
- **Error 400 / 401 / 403 / 404 / 422:** verifica los identificadores, la Public Key, la conexión del servicio, los orígenes permitidos y que la plantilla tenga `{{to_email}}` en To Email. Consulta el detalle del intento en el panel.
- **Error 429:** espera antes de reintentar y revisa la cuota de tu plan. EmailJS documenta un límite de una solicitud por segundo.
- **No llega el mensaje elegido o el cuerpo está vacío:** reemplaza todo Content por `{{{message_html}}}` y guarda. La plantilla anterior con importes individuales no utiliza el mensaje elegido en la página.
- **Se pierden saltos de línea o colores:** pega el archivo completo `emailjs-template.html` en el editor de código HTML de la plantilla y guarda.
- **Envío aceptado pero no aparece en la bandeja:** revisa spam, el destinatario y el historial de EmailJS/proveedor.
- **Falla de conexión sin resultado claro:** revisa primero el historial de EmailJS para saber si se procesó y evitar duplicados al reintentar.

Documentación oficial: [SDK send](https://www.emailjs.com/docs/sdk/send/) · [Variables dinámicas](https://www.emailjs.com/docs/user-guide/dynamic-variables-templates/).
