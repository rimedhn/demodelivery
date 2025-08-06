// ===================
// FastGo sitio delivery/mandados con Google Sheets y menú/tab moderno
// ===================
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS98meyWBoGVu0iF5ZJmLI7hmA6bLwAZroy6oTvgNJmDi9H7p4QDIiEh8-ocJVe08LhJPD4RtAtlEGq/pub?gid=0&single=true&output=csv';
const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS98meyWBoGVu0iF5ZJmLI7hmA6bLwAZroy6oTvgNJmDi9H7p4QDIiEh8-ocJVe08LhJPD4RtAtlEGq/pub?gid=740601453&single=true&output=csv';

let services = [];
let categories = [];
let selectedCategory = null;

function parseCSV(csv) {
  const rows = csv.trim().split('\n');
  const parseRow = row => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"' && (i === 0 || row[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.replace(/^"|"$/g, ''));
    return result;
  };
  const header = parseRow(rows[0]);
  return rows.slice(1).map(row => {
    const values = parseRow(row);
    let obj = {};
    header.forEach((k, i) => obj[k.trim()] = values[i] ? values[i].trim() : '');
    return obj;
  });
}

// Render categorías como botones
function renderCategories() {
  const catsDiv = document.getElementById('categories-list');
  catsDiv.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn' + (cat === selectedCategory ? ' active' : '');
    btn.textContent = cat;
    btn.onclick = () => {
      selectedCategory = cat;
      renderCategories();
      renderServicesInCategory(cat);
    };
    catsDiv.appendChild(btn);
  });
}

// Render servicios individuales de la categoría seleccionada
function renderServicesInCategory(cat) {
  const svcDiv = document.getElementById('services-in-category');
  svcDiv.innerHTML = '';
  services.filter(s => s.categoria === cat).forEach(service => {
    let card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-title">${service.nombre}</div>
      <div class="service-desc">${service.descripcion}</div>
      <div class="service-price"><i class="fas fa-dollar-sign"></i> $${service.precio_base}</div>
      <div class="service-schedule"><i class="fas fa-clock"></i> ${service.horario}</div>
      <button class="service-btn" onclick="selectService('${service.id}')"><i class="fas fa-bolt"></i> Solicitar</button>
    `;
    svcDiv.appendChild(card);
  });
}

// Llenar el select de servicios en el pedido
function fillServiceSelect() {
  const select = document.getElementById("serviceType");
  select.innerHTML = services.map(s => `<option value="${s.id}">${s.nombre} (${s.categoria})</option>`).join('');
}

// Mostrar horario
function showSchedule() {
  document.getElementById("schedule").innerHTML = `<strong>Horario:</strong> Lunes a sábado 9:00-21:00`;
}
showSchedule();

function initStepper() {
  let currentStep = 1;
  const totalSteps = 4;
  function updateTabs() {
    for(let i=1; i<=totalSteps; i++) {
      let tab = document.querySelector(`.step-tab[data-step="step-${i}"]`);
      tab.classList.remove('active','completed');
      tab.removeAttribute('disabled');
      if(i < currentStep) tab.classList.add('completed');
      if(i === currentStep) tab.classList.add('active');
      if(i > currentStep) tab.setAttribute('disabled','');
    }
    for(let i=1; i<=totalSteps; i++) {
      let step = document.getElementById(`step-${i}`);
      step.classList.remove('active');
      if(i === currentStep) step.classList.add('active');
      else step.classList.remove('active');
    }
  }
  document.querySelectorAll('.step-tab').forEach(tab => {
    tab.onclick = function() {
      let stepNum = parseInt(tab.getAttribute('data-step').replace('step-',''));
      if(stepNum <= currentStep) {
        currentStep = stepNum;
        updateTabs();
      }
    };
  });
  for(let i=1; i<totalSteps; i++) {
    document.getElementById(`next-step-${i}`).onclick = function() {
      if(validateStep(i)) {
        currentStep = i+1;
        updateTabs();
      }
    };
    // Botón "Volver" en cada paso (excepto el primero)
    let backBtn = document.getElementById(`back-step-${i+1}`);
    if(backBtn) {
      backBtn.onclick = function() {
        currentStep = i;
        updateTabs();
      };
    }
  }
  updateTabs();
}
function validateStep(stepNum) {
  if(stepNum === 1) {
    if(!document.getElementById("serviceType").value || !document.getElementById("description").value.trim()) {
      alert("Selecciona el tipo de servicio y escribe la descripción.");
      return false;
    }
  }
  if(stepNum === 2) {
    if(!document.getElementById("origin").value.trim()) {
      alert("Indica la dirección y selecciona el punto de origen.");
      return false;
    }
  }
  if(stepNum === 3) {
    if(!document.getElementById("destination").value.trim()) {
      alert("Indica la dirección y selecciona el punto de destino.");
      return false;
    }
  }
  return true;
}
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
  document.getElementById('home').style.display = 'block';
  document.querySelectorAll('#app-menu button').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('#app-menu button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sectionId = btn.getAttribute('data-section');
      document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
      if(sectionId === 'order-stepper') {
        if(document.getElementById('order-stepper').style.display !== 'block') {
          document.getElementById('order-intro').style.display = 'block';
          document.getElementById('order-stepper').style.display = 'none';
          return;
        }
      }
      if(sectionId === 'order-intro') {
        document.getElementById('order-intro').style.display = 'block';
      }
      document.getElementById(sectionId).style.display = 'block';
    };
  });
  document.getElementById("start-order-btn").onclick = function() {
    document.getElementById("order-intro").style.display = "none";
    document.getElementById("order-stepper").style.display = "block";
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById("step-1").classList.add('active');
    document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active','completed'));
    document.querySelector('.step-tab[data-step="step-1"]').classList.add('active');
    document.querySelectorAll('#app-menu button').forEach(b => b.classList.remove('active'));
    document.querySelector('#app-menu button[data-section="order-stepper"]').classList.add('active');
    initStepper();
  };
  fetch(SHEET_URL)
    .then(res => res.text())
    .then(csv => {
      services = parseCSV(csv);
      categories = Array.from(new Set(services.map(s=>s.categoria)));
      selectedCategory = categories[0] || null;
      renderCategories();
      renderServicesInCategory(selectedCategory);
      fillServiceSelect();
    });
  showSchedule();
  // Simulación: seleccionar servicio desde tarjetas
  window.selectService = function(id) {
    document.getElementById("order-intro").style.display = "none";
    document.getElementById("order-stepper").style.display = "block";
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById("step-1").classList.add('active');
    document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active','completed'));
    document.querySelector('.step-tab[data-step="step-1"]').classList.add('active');
    document.getElementById("serviceType").value = id;
    initStepper();
  };
});

// WhatsApp pedido
document.getElementById("whatsapp-send-btn").onclick = function(e) {
  let service = services.find(s => s.id === document.getElementById("serviceType").value);
  let desc = document.getElementById("description").value.trim();
  let origin = document.getElementById("origin").value.trim();
  let dest = document.getElementById("destination").value.trim();
  let name = document.getElementById("clientName").value.trim();
  let phone = document.getElementById("clientPhone").value.trim();
  let notes = document.getElementById("notes").value.trim();
  let feedback = document.getElementById("orderFeedback");
  feedback.textContent = "";

  if (!service || !desc || !origin || !dest || !name || !phone) {
    feedback.textContent = "Por favor completa todos los campos y selecciona los puntos en el mapa.";
    feedback.style.color = "red";
    return;
  }

  let msg =
`*Pedido FastGo*
Nombre: ${name}
Teléfono: ${phone}
Servicio: ${service.nombre} (${service.categoria})
Descripción: ${desc}

Origen: ${origin}
Destino: ${dest}

Notas: ${notes || 'Sin notas'}
Precio base: $${service.precio_base}
Horario servicio: ${service.horario}
`;

  let pedidos = JSON.parse(localStorage.getItem("fastgoPedidos") || "[]");
  let pedidoID = "FG" + Date.now().toString().slice(-6);
  pedidos.push({id:pedidoID, nombre, phone, servicio:service.nombre, desc, origin, dest, date: new Date().toLocaleString()});
  localStorage.setItem("fastgoPedidos", JSON.stringify(pedidos));

  let waUrl = "https://wa.me/50493593126?text=" + encodeURIComponent(msg);
  window.open(waUrl, "_blank");
  feedback.textContent = "¡Pedido generado y listo para enviar por WhatsApp!";
  feedback.style.color = "green";
};

// Seguimiento de pedido - salida atractiva con Google Sheets
document.getElementById("track-form").onsubmit = function(e) {
  e.preventDefault();
  let id = document.getElementById("trackId").value.trim();
  let result = document.getElementById("trackResult");
  result.classList.remove('visible');
  if (!id) {
    result.innerHTML = "<span class='track-label'>Ingresa tu ID de pedido.</span>";
    result.classList.add('visible');
    result.style.color = "red";
    return;
  }
  fetch(ORDER_SHEET_URL)
    .then(res=>res.text())
    .then(csv=>{
      let pedidos = parseCSV(csv);
      let pedido = pedidos.find(p=>p.id_pedido === id);
      if (!pedido) {
        result.innerHTML = "<span class='track-label'>Pedido no encontrado.</span>";
        result.classList.add('visible');
        result.style.color = "red";
      } else {
        result.innerHTML = `
          <div class="track-status">${pedido.estado ? pedido.estado : "En proceso"}</div>
          <div class="track-label">Servicio:</div>
          <div class="track-value">${pedido.servicio || ''}</div>
          <div class="track-label">Fecha:</div>
          <div class="track-value">${pedido.fecha || ''}</div>
          <div class="track-label">Notas:</div>
          <div class="track-value">${pedido.notas || ''}</div>
        `;
        result.classList.add('visible');
        result.style.color = "#254d24";
      }
    })
    .catch(()=>{
      result.innerHTML = "<span class='track-label'>Error consultando el estado. Inténtalo más tarde.</span>";
      result.classList.add('visible');
      result.style.color = "red";
    });
};

// Preguntas frecuentes: mostrar respuesta visual
document.querySelectorAll('.faq-list details').forEach(det => {
  det.addEventListener('toggle', function() {
    if(det.open) det.style.background = '#e6f9ee';
    else det.style.background = '#f7fdf7';
  });
});
