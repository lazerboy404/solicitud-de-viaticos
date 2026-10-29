(() => {
  'use strict';

  const SUBJECT = 'SOLICITUD DE VIATICOS EDOMEX-TOLUCA C5';
  const RATES = Object.freeze({ food: 350, transport: 800, bus: 180 });
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const money = (amount) => `$${formatter.format(amount)} MXN`;
  const form = document.getElementById('request-form');
  const daysInput = document.getElementById('days');
  const recipients = window.MAIL_RECIPIENTS;
  const preview = document.getElementById('email-preview');
  const templateSelect = document.getElementById('message-template');
  const templateHelp = document.getElementById('template-help');
  const previewError = document.getElementById('preview-error');
  const previewRoot = preview.attachShadow({ mode: 'open' });
  previewRoot.innerHTML = `<style>
    :host { display: block; }
    .email-body { padding: 25px 26px; background: white; overflow-wrap: anywhere; min-height: 560px; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 26px; color: #222; }
    @media(max-width:400px) { .email-body { padding: 22px 20px; } }
  </style><div class="email-body" role="document" aria-label="Cuerpo del correo con formato, solo lectura"></div>`;
  const messageBody = previewRoot.querySelector('.email-body');
  const decreaseButton = document.getElementById('decrease-days');
  const increaseButton = document.getElementById('increase-days');
  const sendButton = document.getElementById('send-button');
  const sendLabel = document.getElementById('send-label');
  const status = document.getElementById('status');
  const confirmation = document.getElementById('send-confirmation');
  const confirmButton = document.getElementById('confirm-send');
  const notification = document.getElementById('notification');
  let sending = false;
  let pendingSend = null;

  function getDays() {
    const days = daysInput.valueAsNumber;
    return Number.isInteger(days) && days >= 1 && days <= 365 ? days : null;
  }

  function calculate(days) {
    const food = RATES.food * days;
    const transport = RATES.transport * days;
    const bus = RATES.bus * days;
    return { food, transport, bus, total: food + transport + bus };
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.hidden = false;
    notification.className = `notification ${type}`;
    document.getElementById('notification-icon').textContent = type === 'success' ? '✓' : '!';
    document.getElementById('notification-title').textContent = type === 'success' ? '¡Correo enviado!' : 'No se pudo enviar';
    document.getElementById('notification-message').textContent = message;
    notification.hidden = false;
  }

  document.getElementById('close-notification').addEventListener('click', () => {
    notification.hidden = true;
  });
  document.getElementById('cancel-send').addEventListener('click', () => confirmation.close());
  confirmation.addEventListener('close', () => {
    if (!confirmation.open) pendingSend = null;
  });
  confirmation.addEventListener('cancel', () => { pendingSend = null; });

  function renderEmailPreview(totals) {
    preview.hidden = totals === null;
    previewError.hidden = totals !== null;
    if (totals === null) return;
    const pendingCard = templateSelect.value === 'card-pending';
    const cardNotice = pendingCard
      ? '<p style="margin: 0 0 26px;">Hago la mención de que aún no cuento con la tarjeta de viáticos debido a que se encuentra en trámite, para que lo puedan considerar en el método de pago de esta solicitud.</p>'
      : '';
    const closing = pendingCard
      ? '<p style="margin: 0 0 26px;">Agradezco de antemano su apoyo y comprensión para la gestión de este trámite.</p><p style="margin: 0 0 26px;">Saludos cordiales.</p>'
      : '<p style="margin: 0 0 26px;">Agradezco de antemano su apoyo y comprensión para la gestión de este trámite.<br>Saludos cordiales</p>';
    messageBody.innerHTML = `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 26px; color: #222222;">
  <p style="margin: 0 0 26px;">Buen día,</p>
  <p style="margin: 0 0 26px;">Solicito apoyo con los viáticos correspondientes para la siguiente semana:</p>
  <p style="margin: 0 0 26px;">
    Alimentos: ${money(totals.food)}<br>
    Traslado local: ${money(totals.transport)}<br>
    ${pendingCard ? 'Autobús' : 'Autobus'}: ${money(totals.bus)}<br>
    Total: ${money(totals.total)}
  </p>
  ${cardNotice}
  ${closing}
  <div style="font-family: 'Times New Roman', Times, serif; font-size: 16px; line-height: 24px;">
    <div style="font-size: 12px; color: #909090;">--</div>
    <div style="font-size: 16px; font-weight: bold; color: #909090;">EINAR ULISES ARENAS HERNÁNDEZ</div>
    <div style="font-size: 18px; font-weight: bold; color: #ff9900;">Intelligence &amp; Telecom Technologies</div>
    <div style="font-size: 18px; font-weight: bold;">
      <span aria-hidden="true">📱</span> <a href="tel:+525564132674" style="color: #0055ee; text-decoration: underline;">55 6413 2674</a>
      <span style="color: #909090;"> | </span>
      <span aria-hidden="true">✉️</span> <span style="color: #0055ee; text-decoration: underline;">earenas@intt2.com</span>
      <span style="color: #909090;"> | </span>
      <span aria-hidden="true" style="color: #00a9df;">🌐</span> <a href="https://intt2.com.mx" style="color: #0055ee; text-decoration: underline;">intt2.com.mx</a>
    </div>
  </div>
</div>`;
  }

  messageBody.addEventListener('click', (event) => {
    if (event.target.closest('a')) event.preventDefault();
  });

  function updatePreview() {
    const days = getDays();
    templateHelp.textContent = templateSelect.value === 'card-pending'
      ? 'Incluye el aviso de que tu tarjeta de viáticos está en trámite.'
      : 'Solicitud habitual de viáticos.';
    document.getElementById('preview-recipient').textContent = recipients?.TO || 'Sin destinatario';
    document.getElementById('preview-cc').textContent = recipients?.CC || 'Sin copias';
    decreaseButton.disabled = sending || (days !== null && days <= 1);
    increaseButton.disabled = sending || (days !== null && days >= 365);
    document.getElementById('days-summary').textContent = days === null ? 'Revisa los días' : `${days} ${days === 1 ? 'día' : 'días'}`;
    if (days === null) {
      for (const id of ['food-total', 'transport-total', 'bus-total', 'grand-total']) {
        document.getElementById(id).textContent = '—';
      }
      renderEmailPreview(null);
      return;
    }
    const totals = calculate(days);
    document.getElementById('food-total').textContent = money(totals.food);
    document.getElementById('transport-total').textContent = money(totals.transport);
    document.getElementById('bus-total').textContent = money(totals.bus);
    document.getElementById('grand-total').textContent = money(totals.total);
    renderEmailPreview(totals);
  }

  function setSending(value) {
    sending = value;
    sendButton.disabled = value;
    daysInput.disabled = value;
    templateSelect.disabled = value;
    sendButton.classList.toggle('is-loading', value);
    form.setAttribute('aria-busy', String(value));
    sendLabel.textContent = value ? 'Enviando...' : 'Generar y Enviar Correo Directamente';
    updatePreview();
  }

  function onEdit() {
    status.hidden = true;
    updatePreview();
  }

  daysInput.addEventListener('input', onEdit);
  templateSelect.addEventListener('change', onEdit);
  decreaseButton.addEventListener('click', () => {
    daysInput.value = Math.max(1, (getDays() ?? 1) - 1);
    onEdit();
  });
  increaseButton.addEventListener('click', () => {
    daysInput.value = Math.min(365, (getDays() ?? 0) + 1);
    onEdit();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (sending || confirmation.open) return;
    updatePreview();
    if (!form.reportValidity()) return;
    const days = getDays();
    if (days === null) {
      showStatus('Ingresa una cantidad entera de días entre 1 y 365.', 'error');
      daysInput.focus();
      return;
    }

    const config = window.EMAILJS_CONFIG;
    if (!recipients?.TO || !recipients?.CC) {
      showStatus('Falta configurar el destinatario y las copias en MAIL_RECIPIENTS, en config.js.', 'error');
      return;
    }
    if (!config || ['SERVICE_ID', 'TEMPLATE_ID', 'PUBLIC_KEY'].some((key) =>
      typeof config[key] !== 'string' || !config[key].trim() || config[key].startsWith('TU_'))) {
      showStatus('Falta configurar EmailJS. Completa SERVICE_ID, TEMPLATE_ID y PUBLIC_KEY en config.js. Consulta los pasos en README.md.', 'error');
      return;
    }
    if (!window.emailjs || typeof window.emailjs.send !== 'function') {
      showStatus('No se pudo cargar EmailJS. Revisa tu conexión a Internet y recarga la página.', 'error');
      return;
    }

    const recipient = recipients.TO;
    const totals = calculate(days);
    const templateParams = {
      to_email: recipient,
      cc_email: recipients.CC,
      subject: SUBJECT,
      message: messageBody.innerText || messageBody.textContent,
      message_html: messageBody.innerHTML,
      from_name: 'EINAR ULISES ARENAS HERNÁNDEZ',
      reply_to: 'earenas@intt2.com',
      days,
      total_alimentos: money(totals.food),
      total_traslado: money(totals.transport),
      total_autobus: money(totals.bus),
      total_general: money(totals.total),
    };

    pendingSend = { templateParams, config: { ...config }, recipient, totals, days };
    document.getElementById('confirmation-template').textContent = templateSelect.selectedOptions[0].textContent;
    document.getElementById('confirmation-days').textContent = `${days} ${days === 1 ? 'día' : 'días'}`;
    document.getElementById('confirmation-total').textContent = money(totals.total);
    confirmation.showModal();
  });

  confirmButton.addEventListener('click', async () => {
    if (sending || !pendingSend || !confirmation.open) return;
    const { templateParams, config, recipient, totals, days } = pendingSend;
    pendingSend = null;
    status.hidden = true;
    notification.hidden = true;
    setSending(true);
    confirmation.close();
    try {
      await window.emailjs.send(
        config.SERVICE_ID.trim(),
        config.TEMPLATE_ID.trim(),
        templateParams,
        { publicKey: config.PUBLIC_KEY.trim() },
      );
      showStatus(`¡Solicitud enviada! EmailJS aceptó la solicitud a ${recipient}, con CC solicitada a ${recipients.CC}, por ${money(totals.total)} (${days} ${days === 1 ? 'día' : 'días'}).`, 'success');
    } catch (error) {
      const code = Number(error?.status);
      let message = 'No se pudo confirmar el envío. Revisa tu conexión y el historial de EmailJS antes de volver a intentarlo.';
      if (code === 429) {
        message = 'EmailJS ha limitado los envíos. Espera unos momentos y revisa la cuota disponible en tu cuenta.';
      } else if ([400, 401, 403, 404, 422].includes(code)) {
        message = 'EmailJS rechazó el envío. Revisa las credenciales, la plantilla, el servicio conectado y los dominios permitidos en tu panel.';
      }
      const detail = typeof error?.text === 'string' ? error.text.trim() : '';
      showStatus(`${message}${code ? ` (Código ${code}).` : ''}${detail ? ` Detalle de EmailJS: ${detail}` : ''}`, 'error');
    } finally {
      setSending(false);
    }
  });

  document.getElementById('email-subject').textContent = SUBJECT;
  daysInput.value = '1';
  updatePreview();
})();
