/**
 * Lógica principal de la aplicación de Gestión de Alquileres
 */

// Estado inicial: vacío (los datos vienen de Firebase o se agregan manualmente)
let properties = [];

// Datos de tickets: vacío
let tickets = [];

// Datos de pagos: vacío
let payments = [];

// Elementos del DOM
const gridElement = document.getElementById('properties-grid');
const statIncome = document.getElementById('stat-income');
const statCount = document.getElementById('stat-count');
const filterStatus = document.getElementById('filter-status');

const modal = document.getElementById('property-modal');
const btnAddProperty = document.getElementById('btn-add-property');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const form = document.getElementById('property-form');

const ticketModal = document.getElementById('ticket-modal');
const btnAddTicket = document.getElementById('btn-add-ticket');
const btnCloseTicketModal = document.getElementById('btn-close-ticket-modal');
const btnCancelTicketModal = document.getElementById('btn-cancel-ticket-modal');
const ticketForm = document.getElementById('ticket-form');
const ticketPropSelect = document.getElementById('ticket-prop');
const ticketsList = document.getElementById('tickets-list');

const editModal = document.getElementById('edit-property-modal');
const editForm = document.getElementById('edit-property-form');
const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');

const paymentModal = document.getElementById('payment-modal');
const btnAddPayment = document.getElementById('btn-add-payment');
const btnClosePaymentModal = document.getElementById('btn-close-payment-modal');
const btnCancelPaymentModal = document.getElementById('btn-cancel-payment-modal');
const paymentForm = document.getElementById('payment-form');
const payPropSelect = document.getElementById('pay-prop');
const paymentsList = document.getElementById('payments-list');

const calcModal = document.getElementById('calc-modal');
const btnOpenCalc = document.getElementById('btn-calc-proportional');
const btnCloseCalcModal = document.getElementById('btn-close-calc-modal');

let profitChartInstance = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM cargado. Inicializando...");
    
    // Forzar render inicial (vacío o local)
    if (typeof renderProperties === 'function') renderProperties();
    if (typeof updateStats === 'function') updateStats();
    
    // Configurar eventos con seguridad
    setupEventListeners();

    // Si Firebase está listo, usamos datos en la nube
    if (window.FIREBASE_READY) {
        console.log("🔥 Firebase está listo. Suscribiendo a colecciones...");
        subscribeToTickets();    
        subscribeToProperties(); 
        subscribeToPayments();   
    } else {
        console.warn("⚠️ Firebase no está listo. Usando modo local.");
        if (typeof renderTickets === 'function') renderTickets();
    }
});

// Calculadora Proporcional
window.calculateProp = function() {
    const rent = parseFloat(document.getElementById('calc-rent').value) || 0;
    const days = parseInt(document.getElementById('calc-days').value) || 0;
    const result = (rent / 30) * days;
    document.getElementById('calc-result').textContent = '$' + result.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
};

// Event Listeners
function setupEventListeners() {
    console.log("🔗 Configurando listeners...");

    const safeAddListener = (id, event, callback) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, callback);
        } else {
            console.warn(`❌ Elemento no encontrado: ${id}`);
        }
    };

    // Filtro
    safeAddListener('filter-status', 'change', renderProperties);

    // Modal Nueva Propiedad
    safeAddListener('btn-add-property', 'click', () => {
        if (modal) modal.classList.add('active');
    });

    const closeModal = () => {
        if (modal) modal.classList.remove('active');
        if (form) form.reset();
    };

    safeAddListener('btn-close-modal', 'click', closeModal);
    safeAddListener('btn-cancel-modal', 'click', closeModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Formulario de nueva propiedad
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("📝 Enviando formulario de nueva propiedad...");
            
            const cedulaFile = document.getElementById('prop-doc-cedula')?.files?.[0];
            const cartaFile = document.getElementById('prop-doc-carta')?.files?.[0];
            
            const docCedula = cedulaFile ? URL.createObjectURL(cedulaFile) : null;
            const docCarta = cartaFile ? URL.createObjectURL(cartaFile) : null;

            const newProperty = {
                id: Date.now(),
                name: document.getElementById('prop-name').value,
                tenantName: document.getElementById('prop-tenant-name').value,
                tenantPhone: document.getElementById('prop-tenant-phone').value,
                rooms: parseInt(document.getElementById('prop-rooms').value),
                status: document.getElementById('prop-status').value,
                rentAmount: parseFloat(document.getElementById('prop-amount').value),
                paymentFrequency: document.getElementById('prop-frequency').value,
                paymentDay: document.getElementById('prop-pay-day').value || "5",
                paymentMethod: document.getElementById('prop-method').value,
                endDate: document.getElementById('prop-end-date').value,
                contractTerms: document.getElementById('prop-contract-terms').value,
                docCedula: docCedula,
                docCarta: docCarta,
                image: "https://images.unsplash.com/photo-1518780602358-08bbc1eaace0?auto=format&fit=crop&w=600&q=80"
            };

            if (window.FIREBASE_READY) {
                window.db.collection('properties').add(newProperty)
                    .then(() => closeModal())
                    .catch(err => { console.error(err); alert('Error al guardar en Firebase.'); });
            } else {
                properties.push(newProperty);
                renderProperties();
                updateStats();
                closeModal();
            }
        });
    }

    // Edit Modal
    const closeEditModal = () => {
        if (editModal) editModal.classList.remove('active');
        if (editForm) editForm.reset();
    };

    safeAddListener('btn-close-edit-modal', 'click', closeEditModal);
    safeAddListener('btn-cancel-edit-modal', 'click', closeEditModal);
    safeAddListener('btn-cancel-edit-modal-2', 'click', closeEditModal);
    if (editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });

    safeAddListener('btn-delete-prop', 'click', () => {
        const propId = document.getElementById('edit-prop-id')?.value;
        if (!propId) return;
        if (!confirm('¿Estás seguro de que deseas eliminar esta propiedad?')) return;

        if (window.FIREBASE_READY) {
            window.db.collection('properties').doc(propId).delete()
                .then(() => closeEditModal())
                .catch(err => { console.error(err); alert('Error al eliminar.'); });
        } else {
            properties = properties.filter(p => String(p.id) !== propId);
            renderProperties(); updateStats(); closeEditModal();
        }
    });

    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const propId = document.getElementById('edit-prop-id').value;
            const updated = {
                name:             document.getElementById('edit-prop-name').value,
                tenantName:       document.getElementById('edit-prop-tenant-name').value,
                tenantPhone:      document.getElementById('edit-prop-tenant-phone').value,
                rooms:            parseInt(document.getElementById('edit-prop-rooms').value),
                status:           document.getElementById('edit-prop-status').value,
                rentAmount:       parseFloat(document.getElementById('edit-prop-amount').value),
                paymentFrequency: document.getElementById('edit-prop-frequency').value,
                paymentDay:       document.getElementById('edit-prop-pay-day').value || "5",
                paymentMethod:    document.getElementById('edit-prop-method').value,
                endDate:          document.getElementById('edit-prop-end-date').value,
                contractTerms:    document.getElementById('edit-prop-contract-terms').value,
            };
            if (window.FIREBASE_READY) {
                window.db.collection('properties').doc(propId).update(updated)
                    .then(() => closeEditModal())
                    .catch(err => { console.error(err); alert('Error al guardar cambios.'); });
            } else {
                const idx = properties.findIndex(p => String(p.id) === propId);
                if (idx > -1) Object.assign(properties[idx], updated);
                renderProperties(); updateStats(); closeEditModal();
            }
        });
    }


    // Exponer funciones globales de tarjeta
    window.openEditProperty = function(propId) {
        const prop = properties.find(p => String(p.id) === String(propId));
        if (!prop) return;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('edit-prop-id', prop.id);
        setVal('edit-prop-name', prop.name);
        setVal('edit-prop-tenant-name', prop.tenantName);
        setVal('edit-prop-tenant-phone', prop.tenantPhone);
        setVal('edit-prop-rooms', prop.rooms);
        setVal('edit-prop-status', prop.status);
        setVal('edit-prop-amount', prop.rentAmount);
        setVal('edit-prop-frequency', prop.paymentFrequency);
        setVal('edit-prop-pay-day', prop.paymentDay || "5");
        setVal('edit-prop-method', prop.paymentMethod);
        setVal('edit-prop-end-date', prop.endDate);
        setVal('edit-prop-contract-terms', prop.contractTerms || '');

        if (editModal) editModal.classList.add('active');
    };

    // Ticket Modal
    safeAddListener('btn-add-ticket', 'click', () => {
        if (ticketModal) ticketModal.classList.add('active');
    });
    
    const closeTicketModal = () => {
        if (ticketModal) ticketModal.classList.remove('active');
        if (ticketForm) ticketForm.reset();
    };

    safeAddListener('btn-close-ticket-modal', 'click', closeTicketModal);
    safeAddListener('btn-cancel-ticket-modal', 'click', closeTicketModal);

    if (ticketModal) {
        ticketModal.addEventListener('click', (e) => {
            if (e.target === ticketModal) closeTicketModal();
        });
    }

    if (ticketForm) {
        ticketForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTicket = {
                propId: document.getElementById('ticket-prop').value,
                desc: document.getElementById('ticket-desc').value,
                cost: parseFloat(document.getElementById('ticket-cost').value) || 0,
                status: "pending",
                date: new Date().toISOString().split('T')[0]
            };

            if (window.FIREBASE_READY) {
                window.db.collection('tickets').add(newTicket)
                    .then(() => closeTicketModal())
                    .catch(err => { console.error(err); alert('Error al guardar ticket.'); });
            } else {
                newTicket.id = Date.now();
                tickets.push(newTicket);
                renderTickets();
                closeTicketModal();
            }
        });
    }

    // Payment Modal
    safeAddListener('btn-add-payment', 'click', () => {
        if (paymentModal) paymentModal.classList.add('active');
    });
    const closePaymentModal = () => {
        if (paymentModal) paymentModal.classList.remove('active');
        if (paymentForm) paymentForm.reset();
    };
    safeAddListener('btn-close-payment-modal', 'click', closePaymentModal);
    safeAddListener('btn-cancel-payment-modal', 'click', closePaymentModal);
    if (paymentModal) paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });

    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const propId = payPropSelect.value;
            const prop = properties.find(p => p.firestoreId === propId || String(p.id) === propId);
            
            const newPayment = {
                propId: propId,
                propName: prop ? prop.name : 'Desconocida',
                tenantName: prop ? prop.tenantName : 'N/A',
                period: document.getElementById('pay-period').value,
                amount: parseFloat(document.getElementById('pay-amount').value),
                method: document.getElementById('pay-method').value,
                date: new Date().toISOString().split('T')[0]
            };

            if (window.FIREBASE_READY) {
                window.db.collection('payments').add(newPayment)
                    .then(() => {
                        closePaymentModal();
                        if (window.generateReceipt) {
                            window.generateReceipt({
                                name: newPayment.propName,
                                tenantName: newPayment.tenantName,
                                rentAmount: newPayment.amount,
                                paymentMethod: newPayment.method
                            });
                        }
                    })
                    .catch(err => { console.error(err); alert('Error al registrar pago.'); });
            } else {
                newPayment.id = Date.now();
                payments.unshift(newPayment);
                renderPayments();
                closePaymentModal();
            }
        });
    }

    // Edit Payment Modal
    const editPayModal = document.getElementById('edit-payment-modal');
    const editPayForm = document.getElementById('edit-payment-form');
    
    const closeEditPayModal = () => {
        if (editPayModal) editPayModal.classList.remove('active');
        if (editPayForm) editPayForm.reset();
    };

    safeAddListener('btn-close-edit-payment-modal', 'click', closeEditPayModal);
    safeAddListener('btn-cancel-edit-payment-modal', 'click', closeEditPayModal);
    if (editPayModal) editPayModal.addEventListener('click', (e) => { if (e.target === editPayModal) closeEditPayModal(); });

    if (editPayForm) {
        editPayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const payId = document.getElementById('edit-pay-id').value;
            const updated = {
                period: document.getElementById('edit-pay-period').value,
                amount: parseFloat(document.getElementById('edit-pay-amount').value),
                method: document.getElementById('edit-pay-method').value
            };
            if (window.FIREBASE_READY) {
                window.db.collection('payments').doc(payId).update(updated)
                    .then(() => closeEditPayModal())
                    .catch(err => { console.error(err); alert('Error al actualizar pago.'); });
            }
        });
    }

    safeAddListener('btn-delete-payment', 'click', () => {
        const payId = document.getElementById('edit-pay-id').value;
        if (!confirm('¿Deseas eliminar este registro de pago?')) return;
        if (window.FIREBASE_READY) {
            window.db.collection('payments').doc(payId).delete()
                .then(() => closeEditPayModal())
                .catch(err => { console.error(err); alert('Error al eliminar pago.'); });
        }
    });

    // Calc Modal
    safeAddListener('btn-calc-proportional', 'click', () => {
        if (calcModal) calcModal.classList.add('active');
    });
    const closeCalcModal = () => {
        if (calcModal) calcModal.classList.remove('active');
    };
    safeAddListener('btn-close-calc-modal', 'click', closeCalcModal);
    if (calcModal) calcModal.addEventListener('click', (e) => { if (e.target === calcModal) closeCalcModal(); });
}

window.updateTicketStatus = function(ticketId, newStatus) {
    if (!window.FIREBASE_READY) return;
    window.db.collection('tickets').doc(ticketId).update({ status: newStatus })
        .catch(err => console.error("Error al actualizar ticket:", err));
};

window.deleteTicket = function(ticketId) {
    if (!confirm('¿Deseas eliminar este ticket?')) return;
    if (!window.FIREBASE_READY) return;
    window.db.collection('tickets').doc(ticketId).delete()
        .catch(err => console.error("Error al eliminar ticket:", err));
};

window.openEditPayment = function(payId) {
    console.log("💰 Editando pago:", payId);
    const pay = payments.find(p => String(p.id) === String(payId));
    if (!pay) {
        console.error("❌ Pago no encontrado:", payId);
        return;
    }
    document.getElementById('edit-pay-id').value = payId;
    document.getElementById('edit-pay-period').value = pay.period;
    document.getElementById('edit-pay-amount').value = pay.amount;
    document.getElementById('edit-pay-method').value = pay.method;
    document.getElementById('edit-payment-modal').classList.add('active');
};

// Renderizar tarjetas
function renderProperties() {
    // Actualizar select de propiedades en tickets
    ticketPropSelect.innerHTML = properties
        .filter(p => p.status === 'rented')
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');

    const filterValue = filterStatus.value;
    
    let filteredProperties = properties;
    if (filterValue !== 'all') {
        filteredProperties = properties.filter(p => p.status === filterValue);
    }

    gridElement.innerHTML = '';

    if (filteredProperties.length === 0) {
        gridElement.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1/-1;">No se encontraron propiedades.</p>`;
        return;
    }

    filteredProperties.forEach(prop => {
        const isRented = prop.status === 'rented';
        const statusText = isRented ? 'Alquilado' : 'Disponible';
        const statusClass = isRented ? 'status-rented' : 'status-available';

        let calendarBtnHtml = '';
        if (isRented) {
            if (prop.endDate) {
                const dateStr = prop.endDate.replace(/-/g, '');
                const d = new Date(prop.endDate);
                d.setDate(d.getDate() + 1);
                const nextDayStr = d.toISOString().split('T')[0].replace(/-/g, '');
                
                const title = encodeURIComponent(`Fin de Arriendo: ${prop.name}`);
                const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${nextDayStr}&details=Recordatorio+de+fin+de+arriendo.`;
                
                calendarBtnHtml += `
                <a href="${calUrl}" target="_blank" class="calendar-btn" title="Crear alerta en Google Calendar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Alerta Calendar
                </a>`;
            }

            const whatsappMsg = encodeURIComponent(`Hola inquilino de ${prop.name}, te recuerdo el pago de tu arriendo por $${prop.rentAmount}.`);
            calendarBtnHtml += `
                <a href="javascript:void(0)" onclick="generateReceipt(${prop.id})" class="doc-link" style="margin-top:4px;" title="Generar Recibo PDF">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Recibo PDF
                </a>
                <a href="https://wa.me/?text=${whatsappMsg}" target="_blank" class="doc-link" style="margin-top:4px; color: #10b981; border-color: rgba(16,185,129,0.3);" title="Cobrar por WhatsApp">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> WhatsApp
                </a>
            `;
        }

        const card = document.createElement('div');
        card.className = 'property-card';
        
        let docsHtml = '';
        if (prop.docCedula || prop.docCarta) {
            docsHtml = '<div class="property-docs" style="margin-bottom: 16px; display:flex; gap:8px;">';
            if (prop.docCedula) {
                docsHtml += `<a href="${prop.docCedula}" target="_blank" class="doc-link" title="Ver Cédula">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Cédula
                </a>`;
            }
            if (prop.docCarta) {
                docsHtml += `<a href="${prop.docCarta}" target="_blank" class="doc-link" title="Ver Carta de Recomendación">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Carta
                </a>`;
            }
            docsHtml += '</div>';
        }

        card.innerHTML = `
            <div class="property-image">
                <div class="status-badge ${statusClass}">${statusText}</div>
                <img src="${prop.image}" alt="${prop.name}">
            </div>
            <div class="property-content">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h4 class="property-title" style="margin-bottom:4px;">${prop.name}</h4>
                    <button onclick="openEditProperty('${prop.id}')" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; cursor:pointer; color:var(--text-secondary); font-size:0.75rem; white-space:nowrap; display:flex; align-items:center; gap:4px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Editar
                    </button>
                </div>
                ${prop.tenantName ? `<p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:12px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="vertical-align:middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${prop.tenantName}${prop.tenantPhone ? ` &middot; ${prop.tenantPhone}` : ''}
                </p>` : ''}
                
                <div class="property-details">
                    <div class="detail-item" title="Habitaciones">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                        <span>${prop.rooms} Hab</span>
                    </div>
                    <div class="detail-item" title="Frecuencia de Cobro">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>${prop.paymentFrequency}</span>
                    </div>
                </div>

                ${docsHtml}

                <div class="property-footer">
                    <div class="price-container">
                        <p>Monto de Renta</p>
                        <div class="price">$${prop.rentAmount.toLocaleString()} <span>/ ${prop.paymentFrequency.toLowerCase()}</span></div>
                    </div>
                    ${isRented ? `
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                        <div class="payment-method" title="Método de pago">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                            ${prop.paymentMethod}
                            <div class="detail-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                Pago: Día ${prop.paymentDay || '5'}
                            </div>
                            <div style="font-size:0.65rem; color:var(--accent-warning); margin-top:4px; font-weight:bold;">
                                📅 Contrato hasta: ${prop.endDate || 'Sin fecha'}
                            </div>
                        </div>
                        ${calendarBtnHtml}
                        <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Cobro+Arriendo:+${prop.name.replace(/\s+/g, '+')}&dates=20260505T090000Z/20260505T100000Z&details=Recordatorio+de+cobro+de+arriendo+para+${prop.tenantName.replace(/\s+/g, '+')}" target="_blank" style="font-size:0.7rem; color:var(--text-secondary); text-decoration:none; display:flex; align-items:center; gap:4px; margin-top:4px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Agendar Calendario
                        </a>
                        <button onclick="generateReceipt('${prop.id}')" style="background:var(--accent-primary); color:white; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; cursor:pointer; margin-top:8px; display:flex; align-items:center; gap:4px; width:100%; justify-content:center; box-shadow:0 4px 10px rgba(59,130,246,0.2);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Generar Recibo
                        </button>
                    </div>` : ''}
                </div>
            </div>
        `;
        gridElement.appendChild(card);
    });
}

// ============================================================
// FIREBASE: Escucha en tiempo real los tickets desde la nube
// ============================================================
function subscribeToTickets() {
    window.db.collection('tickets').orderBy('date', 'desc').onSnapshot(snapshot => {
        tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTickets();
        updateStats();
        console.log('🔄 Tickets sincronizados desde Firebase:', tickets.length);
    }, err => {
        console.error('Error al escuchar tickets:', err);
    });
}

// ============================================================
// FIREBASE: Escucha en tiempo real las propiedades desde la nube
// ============================================================
function subscribeToProperties() {
    window.db.collection('properties').onSnapshot(snapshot => {
        properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProperties();
        updateStats();
        
        // Actualizar dropdowns de propiedades
        const selects = [ticketPropSelect, payPropSelect];
        selects.forEach(sel => {
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">Seleccione una propiedad...</option>';
            properties.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.firestoreId || p.id;
                opt.textContent = p.name;
                sel.appendChild(opt);
            });
            sel.value = currentVal;
        });

        console.log('🔄 Propiedades sincronizadas desde Firebase:', properties.length);
    }, err => {
        console.error('Error al escuchar propiedades:', err);
    });
}

// ============================================================
// FIREBASE: Escucha en tiempo real los pagos desde la nube
// ============================================================
function subscribeToPayments() {
    window.db.collection('payments').orderBy('date', 'desc').limit(20).onSnapshot(snapshot => {
        payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPayments();
        console.log('🔄 Pagos sincronizados desde Firebase:', payments.length);
    }, err => {
        console.error('Error al escuchar pagos:', err);
    });
}

function renderPayments() {
    paymentsList.innerHTML = '';
    if (payments.length === 0) {
        paymentsList.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:var(--text-secondary);">No hay registros de pago.</td></tr>`;
        return;
    }

    payments.forEach(pay => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        tr.innerHTML = `
            <td style="padding:12px;">${pay.propName}</td>
            <td style="padding:12px;">${pay.tenantName}</td>
            <td style="padding:12px;">${pay.period}</td>
            <td style="padding:12px; font-weight:700;">$${pay.amount.toLocaleString()}</td>
            <td style="padding:12px; color:var(--text-secondary);">${pay.date}</td>
            <td style="padding:12px; text-align:right;">
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button onclick="openEditPayment('${pay.id}')" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px 8px; color:var(--text-secondary); cursor:pointer; font-size:0.7rem;">Editar</button>
                    <button onclick="window.generateReceipt({name:'${pay.propName}', tenantName:'${pay.tenantName}', rentAmount:${pay.amount}, paymentMethod:'${pay.method}'})" style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:4px; padding:4px 8px; color:var(--accent-primary); cursor:pointer; font-size:0.7rem;">Recibo</button>
                </div>
            </td>
        `;
        paymentsList.appendChild(tr);
    });
}

window.reprintReceipt = function(payId) {
    const pay = payments.find(p => p.id === payId);
    if (pay && window.generateReceipt) {
        window.generateReceipt({
            name: pay.propName,
            tenantName: pay.tenantName,
            rentAmount: pay.amount,
            paymentMethod: pay.method
        });
    }
};

// Actualizar Estadísticas
function updateStats() {
    const activeProperties = properties.filter(p => p.status === 'rented');
    
    let totalIncome = 0;
    activeProperties.forEach(p => {
        if(p.paymentFrequency === 'Quincenal') totalIncome += p.rentAmount * 2;
        else if(p.paymentFrequency === 'Semanal') totalIncome += p.rentAmount * 4;
        else totalIncome += p.rentAmount;
    });

    let totalCosts = 0;
    tickets.forEach(t => totalCosts += (t.cost || 0));

    statCount.textContent = activeProperties.length;
    statIncome.textContent = '$' + totalIncome.toLocaleString();
    
    updateChart(totalIncome, totalCosts);
}

function renderTickets() {
    ticketsList.innerHTML = '';
    if (tickets.length === 0) {
        ticketsList.innerHTML = `<p style="color: var(--text-secondary);">No hay tickets de servicio activos.</p>`;
        return;
    }
    
    tickets.forEach(ticket => {
        const prop = properties.find(p => p.id === ticket.propId || p.firestoreId === ticket.propId);
        const propName = prop ? prop.name : (ticket.apartment || 'Desconocida');
        
        const statusMap = {
            'pending': { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)', text: 'Pendiente' },
            'in-process': { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', text: 'En Proceso' },
            'resolved': { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', text: 'Resuelto' }
        };
        const st = statusMap[ticket.status] || statusMap.pending;
        
        const el = document.createElement('div');
        el.style = `display:flex; justify-content:space-between; align-items:center; padding:16px; background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-sm); margin-bottom:8px;`;
        el.innerHTML = `
            <div>
                <p style="font-weight:600; font-size:0.95rem;">
                    <span style="color:var(--accent-primary); margin-right:8px;">[${propName}]</span>
                    ${ticket.desc}
                </p>
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">Fecha: ${ticket.date} | Costo: $${(ticket.cost || 0).toLocaleString()}</p>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button onclick="updateTicketStatus('${ticket.id}', 'pending')" style="font-size:0.65rem; padding:2px 6px; border-radius:4px; border:1px solid #ccc; cursor:pointer; background:${ticket.status === 'pending' ? '#ccc' : 'transparent'}">Pendiente</button>
                    <button onclick="updateTicketStatus('${ticket.id}', 'in-process')" style="font-size:0.65rem; padding:2px 6px; border-radius:4px; border:1px solid #3b82f6; cursor:pointer; background:${ticket.status === 'in-process' ? '#3b82f622' : 'transparent'}">En Proceso</button>
                    <button onclick="updateTicketStatus('${ticket.id}', 'resolved')" style="font-size:0.65rem; padding:2px 6px; border-radius:4px; border:1px solid #10b981; cursor:pointer; background:${ticket.status === 'resolved' ? '#10b98122' : 'transparent'}">Resuelto</button>
                </div>
            </div>
            <div style="text-align:right;">
                <span style="font-size:0.75rem; background:${st.bg}; color:${st.color}; padding:2px 8px; border-radius:12px; font-weight:bold; text-transform:uppercase;">${st.text}</span>
                <button onclick="deleteTicket('${ticket.id}')" style="display:block; margin-top:8px; margin-left:auto; color:#ef4444; background:none; border:none; cursor:pointer; font-size:0.7rem;">Eliminar</button>
            </div>
        `;
        ticketsList.appendChild(el);
    });
}

function updateChart(income, costs) {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;
    
    const net = income - costs;
    
    if (profitChartInstance) {
        profitChartInstance.data.datasets[0].data = [income, costs, net];
        profitChartInstance.update();
        return;
    }

    profitChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ingresos Estimados', 'Gastos (Tickets)', 'Beneficio Neto'],
            datasets: [{
                label: 'Finanzas del Mes',
                data: [income, costs, net],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(245, 158, 11, 0.6)',
                    'rgba(16, 185, 129, 0.6)'
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

window.generateReceipt = function(dataOrId) {
    console.log("📄 Generando recibo profesional...", dataOrId);
    let data = {};
    if (typeof dataOrId === 'object' && dataOrId !== null) {
        data = dataOrId;
    } else {
        const prop = properties.find(p => String(p.id) === String(dataOrId));
        if (!prop) {
            console.error("❌ Error: No se encontró la propiedad");
            return;
        }
        data = {
            name: prop.name,
            tenantName: prop.tenantName || 'Inquilino',
            rentAmount: prop.rentAmount || 0,
            paymentMethod: prop.paymentMethod || 'Efectivo',
            paymentFrequency: prop.paymentFrequency
        };
    }
    
    // Rellenar template con datos frescos
    const dateEl = document.getElementById('receipt-date');
    const idEl = document.getElementById('receipt-id');
    const propEl = document.getElementById('receipt-prop');
    const conceptEl = document.getElementById('receipt-concept');
    const amountEl = document.getElementById('receipt-amount');

    if (dateEl) dateEl.innerText = new Date().toLocaleDateString('es-CO');
    if (idEl) idEl.innerText = 'Recibo N° ' + Math.floor(Math.random()*9000 + 1000);
    if (propEl) propEl.innerText = `PROPIEDAD: ${data.name}\nARRENDATARIO: ${data.tenantName}`;
    if (conceptEl) conceptEl.innerText = `Pago de Arriendo - Periodo: ${new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase()} 2026`;
    if (amountEl) amountEl.innerText = `$${(data.rentAmount || 0).toLocaleString('es-CO')}`;
    
    const element = document.getElementById('receipt-template');
    if (!element) return;

    // PREPARACIÓN CRÍTICA PARA CAPTURA
    element.style.visibility = 'visible';
    element.style.zIndex = '10000';
    element.style.display = 'block';
    
    const opt = {
        margin:       [0.3, 0.3],
        filename:     `Recibo_${data.name}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true,
            logging: false,
            letterRendering: true,
            backgroundColor: '#ffffff'
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Esperar un poco más para asegurar que el DOM se pinte y las fuentes carguen
    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => {
            console.log("✅ Recibo generado.");
            element.style.visibility = 'hidden';
            element.style.zIndex = '-1';
        }).catch(err => {
            console.error("❌ Error PDF:", err);
            element.style.visibility = 'hidden';
        });
    }, 1200);
};
