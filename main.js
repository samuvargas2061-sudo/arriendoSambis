/**
 * Lógica principal de la aplicación de Gestión de Alquileres
 */

// Estado inicial: Datos de prueba (Mock Data)
let properties = [
    {
        id: 1,
        name: "Apartamento Vista Mar 402",
        rooms: 3,
        status: "rented",
        rentAmount: 1200,
        paymentFrequency: "Mensual",
        paymentMethod: "Transferencia Bancaria",
        endDate: "2026-05-30",
        docCedula: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        docCarta: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 2,
        name: "Casa Residencial Los Pinos",
        rooms: 4,
        status: "rented",
        rentAmount: 2500,
        paymentFrequency: "Mensual",
        paymentMethod: "Efectivo",
        endDate: "2026-06-15",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 3,
        name: "Estudio Centro Histórico",
        rooms: 1,
        status: "available",
        rentAmount: 850,
        paymentFrequency: "Mensual",
        paymentMethod: "Zelle",
        image: "https://images.unsplash.com/photo-1502672260266-1c1e5250ce0e?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 4,
        name: "Loft Industrial",
        rooms: 2,
        status: "rented",
        rentAmount: 1100,
        paymentFrequency: "Quincenal",
        paymentMethod: "Tarjeta de Crédito",
        endDate: "2026-10-01",
        image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=600&q=80"
    }
];

// Datos de tickets
let tickets = [
    { id: 1, propId: 1, desc: "Gotera en el baño", cost: 150, status: "resolved", date: "2026-04-10" },
    { id: 2, propId: 2, desc: "Revisión eléctrica", cost: 50, status: "pending", date: "2026-04-25" }
];

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

let profitChartInstance = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    renderProperties();
    updateStats();
    setupEventListeners();

    // Si Firebase está listo, usamos datos en la nube
    if (window.FIREBASE_READY) {
        subscribeToTickets();    // Escucha cambios en tiempo real
        subscribeToProperties(); // Escucha propiedades en la nube
    } else {
        // Fallback: datos locales
        renderTickets();
    }
});

// Event Listeners
function setupEventListeners() {
    // Filtro
    filterStatus.addEventListener('change', renderProperties);

    // Modal
    btnAddProperty.addEventListener('click', () => {
        modal.classList.add('active');
    });

    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
    };

    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Formulario de nueva propiedad
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const cedulaFile = document.getElementById('prop-doc-cedula').files[0];
        const cartaFile = document.getElementById('prop-doc-carta').files[0];
        
        const docCedula = cedulaFile ? URL.createObjectURL(cedulaFile) : null;
        const docCarta = cartaFile ? URL.createObjectURL(cartaFile) : null;

        const newProperty = {
            id: Date.now(),
            name: document.getElementById('prop-name').value,
            rooms: parseInt(document.getElementById('prop-rooms').value),
            status: document.getElementById('prop-status').value,
            rentAmount: parseFloat(document.getElementById('prop-amount').value),
            paymentFrequency: document.getElementById('prop-frequency').value,
            paymentMethod: document.getElementById('prop-method').value,
            endDate: document.getElementById('prop-end-date').value,
            docCedula: docCedula,
            docCarta: docCarta,
            // Imagen por defecto aleatoria de casas
            image: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000000)}?auto=format&fit=crop&w=600&q=80`
        };

        // Si la imagen falla por el id random, le asignamos una fallback segura
        newProperty.image = "https://images.unsplash.com/photo-1518780602358-08bbc1eaace0?auto=format&fit=crop&w=600&q=80";

        properties.push(newProperty);
        renderProperties();
        updateStats();
        closeModal();
    });

    // Ticket Modal
    btnAddTicket.addEventListener('click', () => {
        ticketModal.classList.add('active');
    });
    
    const closeTicketModal = () => {
        ticketModal.classList.remove('active');
        ticketForm.reset();
    };

    btnCloseTicketModal.addEventListener('click', closeTicketModal);
    btnCancelTicketModal.addEventListener('click', closeTicketModal);

    ticketModal.addEventListener('click', (e) => {
        if (e.target === ticketModal) closeTicketModal();
    });

    ticketForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTicket = {
            propId: parseInt(document.getElementById('ticket-prop').value),
            desc: document.getElementById('ticket-desc').value,
            cost: parseFloat(document.getElementById('ticket-cost').value),
            status: "pending",
            date: new Date().toISOString().split('T')[0]
        };

        if (window.FIREBASE_READY) {
            // Guardar en la nube
            window.db.collection('tickets').add(newTicket)
                .then(() => {
                    closeTicketModal();
                })
                .catch(err => {
                    console.error('Error al guardar ticket:', err);
                    alert('Error al guardar. Verifica tu conexión.');
                });
        } else {
            // Modo local
            newTicket.id = Date.now();
            tickets.push(newTicket);
            renderTickets();
            updateStats();
            closeTicketModal();
        }
    });
}

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
                <h4 class="property-title">${prop.name}</h4>
                
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
                        </div>
                        ${calendarBtnHtml}
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
        if (snapshot.docs.length > 0) {
            properties = snapshot.docs.map(doc => ({ ...doc.data() }));
            renderProperties();
            updateStats();
            console.log('🔄 Propiedades sincronizadas desde Firebase:', properties.length);
        }
    }, err => {
        console.error('Error al escuchar propiedades:', err);
    });
}

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
    tickets.forEach(t => totalCosts += t.cost);

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
        const prop = properties.find(p => p.id === ticket.propId);
        const propName = prop ? prop.name : 'Desconocida';
        const isResolved = ticket.status === 'resolved';
        const bg = isResolved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
        const color = isResolved ? 'var(--accent-success)' : 'var(--accent-warning)';
        const text = isResolved ? 'Resuelto' : 'Pendiente';
        
        const el = document.createElement('div');
        el.style = `display:flex; justify-content:space-between; align-items:center; padding:16px; background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-sm);`;
        el.innerHTML = `
            <div>
                <p style="font-weight:600; font-size:0.95rem;">${ticket.desc}</p>
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">${propName} | Fecha: ${ticket.date}</p>
            </div>
            <div style="text-align:right;">
                <p style="font-weight:700; color:var(--text-primary);">$${ticket.cost}</p>
                <span style="font-size:0.75rem; background:${bg}; color:${color}; padding:2px 8px; border-radius:12px; margin-top:4px; display:inline-block;">${text}</span>
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

window.generateReceipt = function(id) {
    const prop = properties.find(p => p.id === id);
    if (!prop) return;
    
    // Rellenar template
    document.getElementById('receipt-date').innerText = new Date().toLocaleDateString();
    document.getElementById('receipt-id').innerText = 'Recibo N° ' + Math.floor(Math.random()*10000);
    document.getElementById('receipt-prop').innerText = prop.name;
    document.getElementById('receipt-concept').innerText = `Arriendo (${prop.paymentFrequency})`;
    document.getElementById('receipt-amount').innerText = `$${prop.rentAmount.toLocaleString()}`;
    
    const element = document.getElementById('receipt-template');
    element.style.display = 'block'; // Mostrar temporalmente
    
    const opt = {
        margin:       0.5,
        filename:     `Recibo_${prop.name.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none'; // Ocultar después
    });
};
