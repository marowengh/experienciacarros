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
        const qty = parseInt(document.getElementById(`qty-${id}`).value) || 1;
        selectedBus = {
          id: id,
          precio: parseFloat(e.target.dataset.precio),
          servicio: e.target.dataset.servicio,
          hora: e.target.dataset.hora,
          qty: qty
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
    document.getElementById('step2-qty').value = selectedBus.qty;
    updateSeatSummary();
  }
  
  // Listeners para las preferencias
  document.getElementById('step2-qty').addEventListener('change', (e) => {
    selectedBus.qty = parseInt(e.target.value);
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
    
    document.getElementById('summary-qty').textContent = `${selectedBus.qty} Persona(s)`;
    document.getElementById('summary-loc').textContent = loc;
    
    const total = selectedBus.qty * selectedBus.precio;
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
    
    const total = selectedBus.qty * selectedBus.precio;
    finalAmount.textContent = total.toFixed(2);
  });
  
  function renderPassengerForms() {
    const container = document.getElementById('passenger-fields-container');
    let html = '';
    for (let i = 0; i < selectedBus.qty; i++) {
      const defaultName = (i === 0 && window.USER_DATA) ? window.USER_DATA.nombre : '';
      html += `
      <div class="passenger-card">
        <h4>Pasajero ${i + 1}</h4>
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
    const total = (selectedBus.qty * selectedBus.precio).toFixed(2);

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
          cantidad: selectedBus.qty,
          ubicacion: loc
        })
      });
      
      const data = await resp.json();
      
      if (!data.success) {
        alert("Hubo un problema registrando tu reserva.");
        btnConfirmBookingWhatsApp.disabled = false;
        btnConfirmBookingDB.disabled = false;
        btnConfirmBookingWhatsApp.textContent = 'Confirmar y Enviar por WhatsApp';
        btnConfirmBookingDB.textContent = 'Solo Registrar Reserva';
        return;
      }

      const ticketCode = data.codigoBoleto;
      
      if (useWhatsApp) {
        const mensaje = `Hola, deseo confirmar mi pasaje en VISION 21.\n\nRuta: ${routeOrigen} a ${routeDestino}\nFecha: ${routeFecha}\nHora: ${selectedBus.hora}\nTipo: ${selectedBus.servicio}\nCantidad Pasajeros: ${selectedBus.qty}\nUbicación: ${loc}.\n\nMi nombre es ${passengerName} y mi DNI es ${passengerDoc}.\nMi código de reserva es: *${ticketCode}*\n\nAdjunto mi constancia de Yape / Transferencia por el monto total de S/ ${total}.`;
        const numeroWhatsApp = '+51930977607';
        const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
      }

      // Pasar a pantalla de éxito localmente
      step3.classList.remove('active');
      step4.classList.add('active');
      document.getElementById('ticket-code').textContent = ticketCode;
      document.getElementById('ticket-code').style.fontSize = "24px";
      
    } catch(err) {
      console.error(err);
      alert("Error de conexión al registrar la reserva.");
      btnConfirmBookingWhatsApp.disabled = false;
      btnConfirmBookingDB.disabled = false;
      btnConfirmBookingWhatsApp.textContent = 'Confirmar y Enviar por WhatsApp';
      btnConfirmBookingDB.textContent = 'Solo Registrar Reserva';
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
});
