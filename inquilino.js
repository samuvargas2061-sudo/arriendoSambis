// inquilino.js - Portal del Inquilino con integración Firebase

// Sin datos predeterminados — los reportes se cargan desde Firebase
let tenantTickets = [];
let tenantPayments = []; // Datos de pagos locales (fallback)

// Identificador de la propiedad del inquilino (ajusta según corresponda)
const TENANT_PROPERTY_ID = 1;

// Elementos del DOM
const btnOpenReport     = document.getElementById('btn-open-report');
const reportModal       = document.getElementById('report-modal');
const btnCloseReport    = document.getElementById('btn-close-report');
const btnCancelReport   = document.getElementById('btn-cancel-report');
const reportForm        = document.getElementById('report-form');
const ticketsList       = document.getElementById('tenant-tickets-list');
const paymentsList      = document.getElementById('tenant-payments-list');

// ============================================================
// Inicialización
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    if (window.FIREBASE_READY) {
        subscribeToMyTickets(); // Tiempo real desde la nube
        subscribeToMyPayments(); // Pagos en tiempo real
    } else {
        renderTickets(tenantTickets); // Modo local
        renderTenantPayments(tenantPayments);
    }
});

// ============================================================
// Event Listeners
// ============================================================
function setupEventListeners() {
    btnOpenReport.addEventListener('click', () => {
        reportModal.classList.add('active');
    });

    const closeModal = () => {
        reportModal.classList.remove('active');
        reportForm.reset();
    };

    btnCloseReport.addEventListener('click', closeModal);
    btnCancelReport.addEventListener('click', closeModal);
    reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) closeModal();
    });

    // Enviar Reporte
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const category  = document.getElementById('report-category').value;
        const desc      = document.getElementById('report-desc').value;
        const apartment = document.getElementById('report-apartment').value;

        const newTicket = {
            apartment: apartment,
            propId:    TENANT_PROPERTY_ID,
            category:  category,
            desc:      desc,
            cost:      0,
            status:    "pending",
            date:      new Date().toISOString().split('T')[0],
            source:    "inquilino"
        };

        const btnSubmit     = reportForm.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Enviando...";
        btnSubmit.disabled  = true;

        if (window.FIREBASE_READY) {
            // ✅ Guardar en la nube → aparecerá en el panel del administrador
            try {
                await window.db.collection('tickets').add(newTicket);
                closeModal();
                showSuccessMessage();
            } catch (err) {
                console.error('Error al enviar reporte:', err);
                alert('Hubo un error al enviar tu reporte. Intenta nuevamente.');
            }
        } else {
            // Modo local (sin Firebase)
            setTimeout(() => {
                newTicket.id = Date.now();
                tenantTickets.unshift(newTicket);
                renderTickets(tenantTickets);
                closeModal();
                showSuccessMessage();
            }, 600);
        }

        btnSubmit.innerText = "Enviar Reporte";
        btnSubmit.disabled  = false;
    });
}

// ============================================================
// FIREBASE: Escuchar tickets del inquilino en tiempo real
// ============================================================
function subscribeToMyTickets() {
    // Escucha todos los tickets del inquilino (sin filtro compuesto para evitar requerir índice)
    window.db.collection('tickets')
        .where('source', '==', 'inquilino')
        .onSnapshot(snapshot => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            renderTickets(data);
        }, err => {
            console.error('Error al escuchar tickets del inquilino:', err);
            renderTickets(tenantTickets);
        });
}

// ============================================================
// FIREBASE: Escuchar pagos del inquilino en tiempo real
// ============================================================
function subscribeToMyPayments() {
    // Escucha pagos en tiempo real (mostramos todos los pagos globales como demo o podríamos filtrar por propId si existiera el sistema de login)
    window.db.collection('payments')
        .orderBy('date', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTenantPayments(data);
            updateTenantSummary(data);
        }, err => {
            console.error('Error al escuchar pagos del inquilino:', err);
            renderTenantPayments(tenantPayments);
        });
}

// ============================================================
// Actualizar el resumen del arriendo en la UI (próximo pago, etc)
// ============================================================
function updateTenantSummary(paymentsList) {
    if (!paymentsList || paymentsList.length === 0) return;
    
    // Obtenemos el último pago
    const lastPayment = paymentsList[0];
    
    // Suponemos que si se hizo un pago, el próximo es el mes siguiente
    let nextDate = new Date();
    if (lastPayment.period && lastPayment.period.includes('-')) {
        const parts = lastPayment.period.split('-');
        nextDate = new Date(parts[0], parseInt(parts[1]), 5); // Día 5 del mes siguiente
    } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(5);
    }
    
    // Actualizamos el DOM (Si existen los elementos, podemos inyectar dinámicamente)
    // Buscamos el elemento de 'Próximo pago' usando querySelector
    const nextPaymentElement = document.querySelector('p strong');
    if (nextPaymentElement && nextPaymentElement.parentElement.innerHTML.includes('Próximo pago')) {
        nextPaymentElement.innerText = nextDate.toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    }
}

// ============================================================
// Renderizar lista de tickets
// ============================================================
function renderTickets(list) {
    ticketsList.innerHTML = '';

    if (!list || list.length === 0) {
        ticketsList.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                No has reportado ningún problema aún.
            </p>`;
        return;
    }

    list.forEach(ticket => {
        const isResolved = ticket.status === 'resolved';
        const bg    = isResolved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
        const color = isResolved ? 'var(--accent-success)' : 'var(--accent-warning)';
        const label = isResolved ? '✅ Solucionado' : '⏳ En Revisión';

        const el = document.createElement('div');
        el.style.cssText = `
            display:flex; flex-direction:column;
            padding:16px;
            background:var(--bg-secondary);
            border:1px solid var(--border-glass);
            border-radius:var(--border-radius-sm);
        `;
        el.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span style="font-size:0.8rem; background:rgba(255,255,255,0.1); color:var(--text-secondary); padding:2px 8px; border-radius:12px;">
                    ${ticket.category || 'General'}
                </span>
                <span style="font-size:0.8rem; color:var(--text-secondary);">${ticket.date}</span>
            </div>
            <p style="font-weight:500; font-size:1rem; margin-bottom:12px;">
                ${ticket.apartment ? `<span style="color:var(--accent-primary); font-size:0.8rem; margin-right:8px;">${ticket.apartment}</span>` : ''}
                ${ticket.desc}
            </p>
            <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
                <span style="font-size:0.85rem; background:${bg}; color:${color}; padding:4px 10px; border-radius:12px; font-weight:500;">
                    ${label}
                </span>
            </div>
        `;
        ticketsList.appendChild(el);
    });
}

// ============================================================
// Renderizar lista de pagos
// ============================================================
function renderTenantPayments(list) {
    if (!paymentsList) return;
    paymentsList.innerHTML = '';

    if (!list || list.length === 0) {
        paymentsList.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                No hay registros de pago.
            </p>`;
        return;
    }

    list.forEach(payment => {
        const el = document.createElement('div');
        el.style.cssText = `
            display:flex; justify-content:space-between; align-items:center;
            padding:16px;
            background:var(--bg-secondary);
            border:1px solid var(--border-glass);
            border-radius:var(--border-radius-sm);
        `;
        
        let periodDisplay = payment.period;
        if (periodDisplay && periodDisplay.includes('-')) {
            const parts = periodDisplay.split('-');
            const date = new Date(parts[0], parseInt(parts[1]) - 1);
            periodDisplay = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            periodDisplay = periodDisplay.charAt(0).toUpperCase() + periodDisplay.slice(1);
        } else {
            periodDisplay = periodDisplay || 'Periodo Desconocido';
        }

        el.innerHTML = `
            <div>
                <p style="font-weight:600; font-size:1rem; margin-bottom:4px;">
                    Mes: ${periodDisplay}
                </p>
                <p style="font-size:0.8rem; color:var(--text-secondary);">
                    📅 Pagado el: ${payment.date} &middot; ${payment.method}
                </p>
            </div>
            <div style="text-align:right;">
                <p style="font-size:1.1rem; font-weight:700; color:var(--accent-primary); margin-bottom:4px;">
                    $${(payment.amount || 0).toLocaleString()}
                </p>
                <span style="font-size:0.7rem; background:rgba(16, 185, 129, 0.1); color:var(--accent-success); padding:2px 8px; border-radius:12px; font-weight:bold;">
                    ✔ RECIBIDO
                </span>
            </div>
        `;
        paymentsList.appendChild(el);
    });
}

// ============================================================
// Mensaje de éxito al enviar reporte
// ============================================================
function showSuccessMessage() {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background: linear-gradient(135deg, #10b981, #059669);
        color:white; padding:14px 24px; border-radius:12px;
        font-weight:600; font-size:0.95rem;
        box-shadow: 0 10px 30px rgba(16,185,129,0.4);
        z-index:9999; text-align:center;
        animation: slideUp 0.3s ease;
    `;
    toast.innerText = '✅ ¡Reporte enviado a la administración!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}
