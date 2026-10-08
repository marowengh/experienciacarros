document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');
  const step4 = document.getElementById('step-4');
  
  const ind1 = document.getElementById('step1-indicator');
  const ind2 = document.getElementById('step2-indicator');
  const ind3 = document.getElementById('step3-indicator');
  
  const busesList = document.getElementById('buses-list');
  const busGrid = document.getElementById('bus-grid');
  
  const btnNextStep2 = document.getElementById('btn-next-step2');
  const btnBackStep2 = document.getElementById('btn-back-step2');
  const btnConfirmBookingWhatsApp = document.getElementById('btn-confirm-booking-whatsapp');
  const btnConfirmBookingDB = document.getElementById('btn-confirm-booking-db');
  const btnBackStep3 = document.getElementById('btn-back-step3');
  
  const selectedSeatsList = document.getElementById('selected-seats-list');
  const totalAmount = document.getElementById('total-amount');
  const finalAmount = document.getElementById('final-amount');
  
  // State
  let selectedBus = null;
  let selectedSeats = [];
  
  const routeOrigen = document.getElementById('route-origen').textContent;
  const routeDestino = document.getElementById('route-destino').textContent;
  const routeFecha = document.getElementById('route-fecha').textContent;

  // Initialize
  fetchBuses();
  
  // --- Paso 1: Obtener horarios ---
  async function fetchBuses() {
    try {
      const response = await fetch(`/api/buses?origen=${encodeURIComponent(routeOrigen)}&destino=${encodeURIComponent(routeDestino)}`);
      const buses = await response.json();
      renderBuses(buses);
    } catch (error) {
      busesList.innerHTML = '<p style="text-align:center; color:red;">Error al cargar los horarios.</p>';
    }
  }
  
  function getTurno(hora) {
    if (hora.includes('AM')) return 'Mañana';
    if (hora.includes('PM')) {
      const h = parseInt(hora.split(':')[0]);
      if (h >= 6 && h < 12) return 'Noche';
      return 'Tarde';
    }
    return 'Día';
  }

  function renderBuses(buses) {
    if (buses.length === 0) {
      busesList.innerHTML = '<p style="text-align:center; padding: 30px;">No hay buses programados para esta ruta hoy. Por favor, contáctanos por WhatsApp para alternativas.</p>';
      return;
    }
    
    // Agrupar buses
    const agrupados = { Mañana: [], Tarde: [], Noche: [] };
    buses.forEach(bus => {
      const turno = getTurno(bus.hora_salida);
      if(agrupados[turno]) agrupados[turno].push(bus);
    });

    let html = '';
    ['Mañana', 'Tarde', 'Noche'].forEach(turno => {
      if (agrupados[turno].length > 0) {
        html += `<h3 style="margin-top: 35px; margin-bottom: 20px; color: var(--navy); font-size: 1.25rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; border-left: 4px solid #B2D235; padding-left: 12px; display: flex; align-items: center;">${turno}</h3>`;
        html += agrupados[turno].map(bus => {
          const isVIP = bus.servicio.toLowerCase().includes('vip');
          return `
          <div class="bus-card" style="border-left: 4px solid ${isVIP ? '#B2D235' : '#0f172a'}; box-shadow: 0 8px 24px rgba(0,0,0,0.04); transition: transform 0.3s ease; background: #fff; margin-bottom: 15px; border-radius: 12px; overflow: hidden; display: flex; justify-content: space-between; align-items: center; padding: 20px;">
            <div class="bus-info">
              <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--navy); margin-bottom: 8px;">${bus.hora_salida} <span style="color: var(--mist); font-weight: 400; margin: 0 8px;">→</span> ${bus.hora_llegada}</h3>
              <p class="service-type" style="font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: ${isVIP ? '#5e7215' : '#334155'}; background: ${isVIP ? '#f4f9e3' : '#f1f5f9'}; padding: 6px 10px; border-radius: 6px; display: inline-block; margin-bottom: 8px;">${bus.servicio}</p>
              <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                <label for="qty-${bus.id}" style="font-size: 0.85rem; font-weight: 600; color: var(--navy);">Cantidad de pasajeros:</label>
                <select id="qty-${bus.id}" class="passenger-qty" data-id="${bus.id}" data-precio="${bus.precio}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 600; font-size: 0.9rem;">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
              <p class="availability" style="font-size: 0.85rem; font-weight: 600; color: ${bus.asientos_disponibles < 10 ? '#dc2626' : '#059669'}; display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${bus.asientos_disponibles < 10 ? '#dc2626' : '#059669'};"></span>
                Disponibles: ${bus.asientos_disponibles} asientos
              </p>
            </div>
            <div class="bus-action" style="text-align: right;">
              <div class="price" id="price-display-${bus.id}" style="font-size: 1.6rem; font-weight: 800; color: var(--navy); margin-bottom: 12px;">S/ ${parseFloat(bus.precio).toFixed(2)}</div>
              <button class="btn btn-primary btn-select-bus" data-id="${bus.id}" data-precio="${bus.precio}" data-servicio="${bus.servicio}" data-hora="${bus.hora_salida}" style="padding: 10px 24px; border-radius: 8px; font-weight: 700; box-shadow: 0 4px 12px rgba(178, 210, 53, 0.4); background: #B2D235; border-color: #B2D235; color: #fff;">Seleccionar</button>
            </div>
          </div>
          `;
        }).join('');
      }
    });

    busesList.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.passenger-qty').forEach(select => {
      select.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const precio = parseFloat(e.target.dataset.precio);
        const qty = parseInt(e.target.value) || 1;
        document.getElementById(`price-display-${id}`).textContent = `S/ ${(precio * qty).toFixed(2)}`;
      });
    });

    document.querySelectorAll('.btn-select-bus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const qtyAdults = parseInt(document.getElementById(`qty-${id}`).value) || 1;
        selectedBus = {
          id: id,
          precio: parseFloat(e.target.dataset.precio),
          servicio: e.target.dataset.servicio,
          hora: e.target.dataset.hora,
          qtyAdults: qtyAdults,
          qtyChildren: 0
        };
        goToStep2();
      });
    });
  }
  
  // --- Paso 2: Preferencias de Viaje ---
  function goToStep2() {
    step1.classList.remove('active');
    step2.classList.add('active');
    ind2.classList.add('active');
    
    // Sync initial qty from selectedBus
    document.getElementById('step2-qty-adults').value = selectedBus.qtyAdults;
    document.getElementById('step2-qty-children').value = selectedBus.qtyChildren;
    updateSeatSummary();
  }
  
  // Listeners para las preferencias
  document.getElementById('step2-qty-adults').addEventListener('change', (e) => {
    selectedBus.qtyAdults = parseInt(e.target.value);
    updateSeatSummary();
  });
  
  document.getElementById('step2-qty-children').addEventListener('change', (e) => {
    selectedBus.qtyChildren = parseInt(e.target.value);
    updateSeatSummary();
  });

  document.querySelectorAll('input[name="ubicacion"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Styling logic for the selected radio button
      document.querySelectorAll('.loc-label').forEach(lbl => {
        lbl.style.background = 'transparent';
        lbl.style.borderColor = '#cbd5e1';
      });
      const parentLabel = radio.closest('.loc-label');
      parentLabel.style.background = '#f4f9e3';
      parentLabel.style.borderColor = '#B2D235';
      
      updateSeatSummary();
    });
  });
  
  function updateSeatSummary() {
    const loc = document.querySelector('input[name="ubicacion"]:checked').value;
    
    const totalQty = selectedBus.qtyAdults + selectedBus.qtyChildren;
    const textChildren = selectedBus.qtyChildren > 0 ? ` (+${selectedBus.qtyChildren} Niño/s)` : '';
    document.getElementById('summary-qty').textContent = `${selectedBus.qtyAdults} Adulto(s)${textChildren}`;
    document.getElementById('summary-loc').textContent = loc;
    
    const total = (selectedBus.qtyAdults * selectedBus.precio) + (selectedBus.qtyChildren * (selectedBus.precio / 2));
    document.getElementById('total-amount').textContent = total.toFixed(2);
  }
  
  btnBackStep2.addEventListener('click', () => {
    step2.classList.remove('active');
    step1.classList.add('active');
    ind2.classList.remove('active');
  });
  
  // --- Paso 3: Checkout (WhatsApp) ---
  btnNextStep2.addEventListener('click', () => {
    step2.classList.remove('active');
    step3.classList.add('active');
    ind3.classList.add('active');
    
    renderPassengerForms();
    
    // Resumen
    document.getElementById('summary-time').textContent = selectedBus.hora;
    document.getElementById('summary-service').textContent = selectedBus.servicio;
    
    const total = (selectedBus.qtyAdults * selectedBus.precio) + (selectedBus.qtyChildren * (selectedBus.precio / 2));
    finalAmount.textContent = total.toFixed(2);
  });
  
  function renderPassengerForms() {
    const container = document.getElementById('passenger-fields-container');
    let html = '';
    const totalPasajeros = selectedBus.qtyAdults + selectedBus.qtyChildren;
    for (let i = 0; i < totalPasajeros; i++) {
      const defaultName = (i === 0 && window.USER_DATA) ? window.USER_DATA.nombre : '';
      const isChild = i >= selectedBus.qtyAdults;
      const passType = isChild ? "Pasajero (Niño)" : "Pasajero (Adulto)";
      html += `
      <div class="passenger-card">
        <h4>${passType} ${i + 1}</h4>
        <div class="field-row">
          <div class="field-group">
            <label>Tipo Documento</label>
            <select><option>DNI</option><option>Pasaporte</option></select>
          </div>
          <div class="field-group">
            <label>Nro. Documento</label>
            <input type="text" class="pass-doc" placeholder="Ej: 71234567" pattern="[0-9]{8,15}" title="Solo números (mínimo 8 dígitos)" minlength="8" maxlength="15" required oninput="this.value = this.value.replace(/[^0-9]/g, '')">
          </div>
        </div>
        <div class="field-group">
          <label>Nombres y Apellidos</label>
          <input type="text" class="pass-name" value="${defaultName}" placeholder="Ej: Juan Pérez" minlength="3" maxlength="60" pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+" title="Solo letras y espacios permitidos" required oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]/g, '')">
        </div>
      </div>
      `;
    }
    container.innerHTML = html;
  }
  
  btnBackStep3.addEventListener('click', () => {
    step3.classList.remove('active');
    step2.classList.add('active');
    ind3.classList.remove('active');
  });
  
  // --- Paso 4: Generar WhatsApp y Guardar ---
  async function processBooking(useWhatsApp) {
    // Validar al menos un pasajero (el primero)
    const nameInput = document.querySelector('.pass-name');
    const docInput = document.querySelector('.pass-doc');
    const totalPasajeros = selectedBus.qtyAdults + selectedBus.qtyChildren;
    const total = ((selectedBus.qtyAdults * selectedBus.precio) + (selectedBus.qtyChildren * (selectedBus.precio / 2))).toFixed(2);

    if (!nameInput || !nameInput.value || !docInput || !docInput.value) {
      alert("Por favor completa los datos del pasajero.");
      return;
    }

    const passengerName = nameInput.value;
    const passengerDoc = docInput.value;
    
    btnConfirmBookingWhatsApp.disabled = true;
    btnConfirmBookingDB.disabled = true;
    
    if (useWhatsApp) {
      btnConfirmBookingWhatsApp.textContent = 'Procesando reserva...';
    } else {
      btnConfirmBookingDB.textContent = 'Procesando reserva...';
    }

    try {
      const loc = document.querySelector('input[name="ubicacion"]:checked').value;
      const resp = await fetch('/api/reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viaje_id: selectedBus.id,
          nombre: passengerName,
          documento: passengerDoc,
          fecha: routeFecha,
          cantidad: totalPasajeros,
          cantidad_adultos: selectedBus.qtyAdults,
          cantidad_ninos: selectedBus.qtyChildren,
          ubicacion: loc,
          totalPago: total
        })
      });
      
      const data = await resp.json();
      
      if (!data.success) {
        alert("Hubo un problema registrando tu reserva.");
        btnConfirmBookingWhatsApp.disabled = false;
        btnConfirmBookingDB.disabled = false;
        btnConfirmBookingWhatsApp.textContent = 'Confirmar y Enviar por WhatsApp';
        btnConfirmBookingDB.textContent = 'Pagar y Generar Comprobante';
        return;
      }

      const ticketCode = data.codigoBoleto;
      
      if (useWhatsApp) {
        const mensaje = `Hola, deseo confirmar mi pasaje en VISION 21.\n\nRuta: ${routeOrigen} a ${routeDestino}\nFecha: ${routeFecha}\nHora: ${selectedBus.hora}\nTipo: ${selectedBus.servicio}\nCantidad Pasajeros: ${totalPasajeros} (${selectedBus.qtyAdults} Adultos, ${selectedBus.qtyChildren} Niños)\nUbicación: ${loc}.\n\nMi nombre es ${passengerName} y mi DNI es ${passengerDoc}.\nMi código de reserva es: *${ticketCode}*\n\nAdjunto mi constancia de Yape / Transferencia por el monto total de S/ ${total}.`;
        const numeroWhatsApp = '+51930977607';
        const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
      }

      // Pasar a pantalla de éxito localmente
      step3.classList.remove('active');
      step4.classList.add('active');
      document.getElementById('ticket-code').textContent = ticketCode;
      document.getElementById('ticket-code').style.fontSize = "24px";
      document.getElementById('success-destination').textContent = `${routeOrigen} a ${routeDestino}`;
      document.getElementById('success-time').textContent = `${routeFecha} | ${selectedBus.hora}`;
      
    } catch(err) {
      console.error(err);
      alert("Error de conexión al registrar la reserva.");
      btnConfirmBookingWhatsApp.disabled = false;
      btnConfirmBookingDB.disabled = false;
      btnConfirmBookingWhatsApp.textContent = 'Confirmar y Enviar por WhatsApp';
      btnConfirmBookingDB.textContent = 'Pagar y Generar Comprobante';
    }
  }

  btnConfirmBookingWhatsApp.addEventListener('click', (e) => {
    e.preventDefault();
    processBooking(true);
  });

  btnConfirmBookingDB.addEventListener('click', (e) => {
    e.preventDefault();
    processBooking(false);
  });
  
  // Voucher Generation logic
  const btnPrintVoucher = document.getElementById('btn-print-voucher');
  if (btnPrintVoucher) {
    btnPrintVoucher.addEventListener('click', () => {
      const ticketCode = document.getElementById('ticket-code').textContent;
      const passengerName = document.querySelector('.pass-name').value;
      const passengerDoc = document.querySelector('.pass-doc').value;
      const total = (selectedBus.qty * selectedBus.precio).toFixed(2);
      generarComprobante(ticketCode, passengerName, passengerDoc, routeOrigen, routeDestino, routeFecha, total);
    });
  }
  
  function generarComprobante(codigo, nombre, doc, origen, destino, fecha, total) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <html>
      <head>
        <title>Comprobante - ${codigo}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .comprobante { border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #1e3a8a; }
          .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; }
          .row strong { color: #475569; }
          .total { font-size: 1.5em; font-weight: bold; color: #16a34a; text-align: right; margin-top: 20px; }
          @media print { body { padding: 0; } .comprobante { box-shadow: none; border: none; } }
        </style>
      </head>
      <body>
        <div class="comprobante">
          <div class="header">
            <h1>Visión 21 S.A.C.</h1>
            <p>Comprobante de Pago Electrónico</p>
          </div>
          <div class="row"><strong>Boleto Nro:</strong> <span>${codigo}</span></div>
          <div class="row"><strong>Cliente:</strong> <span>${nombre}</span></div>
          <div class="row"><strong>Documento:</strong> <span>${doc}</span></div>
          <div class="row"><strong>Ruta:</strong> <span>${origen} - ${destino}</span></div>
          <div class="row"><strong>Fecha de Viaje:</strong> <span>${fecha}</span></div>
          <div class="total">Total Pagado: S/ ${total}</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
});
