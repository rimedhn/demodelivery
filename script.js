// ==============================
// FastGo sitio delivery/mandados
// ==============================

// 1. Navbar responsive y scroll activa
function toggleMenu() {
  document.getElementById("nav").classList.toggle("open");
}
document.querySelectorAll('.nav a').forEach(link => {
  link.onclick = () => {
    document.querySelectorAll('.nav a').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    if(window.innerWidth < 600) document.getElementById("nav").classList.remove("open");
  };
});

// 2. Carga servicios desde Google Sheets (CSV público)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQxxxxxxxxxxxxxxx/pub?output=csv'; // <-- Pega aquí tu enlace público CSV de servicios
const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyyyyyyyyyyyyyyy/pub?output=csv'; // <-- (Opcional) Para seguimiento

let services = [];
let categories = new Set();

// Utilidad para convertir CSV a array de objetos
function parseCSV(csv) {
  const [header, ...rows] = csv.trim().split('\n');
  const keys = header.split(',');
  return rows.map(row => {
    const values = row.split(',');
    let obj = {};
    keys.forEach((k, i) => obj[k.trim()] = values[i] ? values[i].trim() : '');
    return obj;
  });
}

// Cargar servicios y llenar la UI
function loadServices() {
  fetch(SHEET_URL)
    .then(res => res.text())
    .then(csv => {
      services = parseCSV(csv);
      categories = new Set(services.map(s => s.categoria));
      renderServices();
      fillServiceSelect();
    });
}

function renderServices() {
  const list = document.getElementById("service-list");
  list.innerHTML = '';
  categories.forEach(cat => {
    const catDiv = document.createElement('div');
    catDiv.innerHTML = `<h3>${cat}</h3>`;
    catDiv.className = 'service-card anim-fade';
    services.filter(s => s.categoria === cat).forEach(service => {
      catDiv.innerHTML += `
        <div>
          <strong>${service.nombre}</strong><br>
          <span>${service.descripcion}</span><br>
          <span>Precio base: $${service.precio_base}</span>
          <br><span>Horario: ${service.horario}</span>
        </div>
      `;
    });
    list.appendChild(catDiv);
  });
}

function fillServiceSelect() {
  const select = document.getElementById("serviceType");
  select.innerHTML = services.map(s => `<option value="${s.id}">${s.nombre} (${s.categoria})</option>`).join('');
}

// 3. Horario de operación
function showSchedule() {
  // Puedes obtener horarios desde otra hoja, aquí ejemplo simple:
  document.getElementById("schedule").innerHTML = `<strong>Horario:</strong> Lunes a sábado 9:00-21:00`;
}
showSchedule();

// 4. MAPAS (LeafletJS)
// Variables para los puntos seleccionados
let originCoords = null, destinationCoords = null;

function setupMap(id, callback) {
  // Mapa centrado en ciudad ejemplo
  const map = L.map(id).setView([19.432608, -99.133209], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "",
    maxZoom: 18,
  }).addTo(map);
  let marker;
  map.on('click', function(e) {
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng, {draggable:true}).addTo(map);
    callback([e.latlng.lat, e.latlng.lng]);
    marker.on('dragend', function(ev) {
      callback([marker.getLatLng().lat, marker.getLatLng().lng]);
    });
  });
  map.invalidateSize();
}
// Inicializar mapas al mostrar sección
window.addEventListener('DOMContentLoaded', () => {
  setupMap('mapOrigin', coords => { originCoords = coords; });
  setupMap('mapDestination', coords => { destinationCoords = coords; });
  loadServices();
});

// 5. Solicitud de servicio y WhatsApp
document.getElementById("order-form").onsubmit = function(e) {
  e.preventDefault();
  // Validación simple
  let service = services.find(s => s.id === document.getElementById("serviceType").value);
  let desc = document.getElementById("description").value.trim();
  let origin = document.getElementById("origin").value.trim();
  let dest = document.getElementById("destination").value.trim();
  let name = document.getElementById("clientName").value.trim();
  let phone = document.getElementById("clientPhone").value.trim();
  let notes = document.getElementById("notes").value.trim();
  let feedback = document.getElementById("orderFeedback");
  feedback.textContent = "";
  if (!service || !desc || !origin || !dest || !name || !phone || !originCoords || !destinationCoords) {
    feedback.textContent = "Por favor completa todos los campos y selecciona los puntos en el mapa.";
    feedback.style.color = "red";
    return;
  }
  feedback.textContent = "Generando tu pedido...";
  feedback.style.color = "#333";
  // Construir mensaje de WhatsApp
  let msg =
`*Pedido FastGo*
Nombre: ${name}
Teléfono: ${phone}
Servicio: ${service.nombre} (${service.categoria})
Descripción: ${desc}

Origen: ${origin}
Ubicación: https://maps.google.com/?q=${originCoords[0]},${originCoords[1]}

Destino: ${dest}
Ubicación: https://maps.google.com/?q=${destinationCoords[0]},${destinationCoords[1]}

Notas: ${notes || 'Sin notas'}
Precio base: $${service.precio_base}
Horario servicio: ${service.horario}
`;
  // Guardar en historial localStorage
  let pedidos = JSON.parse(localStorage.getItem("fastgoPedidos") || "[]");
  let pedidoID = "FG" + Date.now().toString().slice(-6);
  pedidos.push({id:pedidoID, nombre, phone, servicio:service.nombre, desc, origin, dest, date: new Date().toLocaleString()});
  localStorage.setItem("fastgoPedidos", JSON.stringify(pedidos));

  // Abrir WhatsApp
  let waUrl = "https://wa.me/5212345678901?text=" + encodeURIComponent(msg);
  setTimeout(() => {
    window.open(waUrl, "_blank");
    feedback.textContent = "¡Pedido generado y listo para enviar por WhatsApp!";
    feedback.style.color = "green";
  }, 800);
};

// 6. Seguimiento de pedido desde Google Sheets (opcional)
document.getElementById("track-form").onsubmit = function(e) {
  e.preventDefault();
  let id = document.getElementById("trackId").value.trim();
  let result = document.getElementById("trackResult");
  if (!id) {result.textContent = "Ingresa tu ID de pedido."; result.style.color = "red"; return;}
  fetch(ORDER_SHEET_URL)
    .then(res=>res.text())
    .then(csv=>{
      let pedidos = parseCSV(csv);
      let pedido = pedidos.find(p=>p.id_pedido===id);
      if (!pedido) {
        result.textContent = "Pedido no encontrado.";
        result.style.color = "red";
      } else {
        result.innerHTML = `
          <span><strong>Estado:</strong> ${pedido.estado}</span><br>
          <span><strong>Servicio:</strong> ${pedido.servicio}</span><br>
          <span><strong>Fecha:</strong> ${pedido.fecha}</span><br>
          <span><strong>Notas:</strong> ${pedido.notas||''}</span>
        `;
        result.style.color = "#333";
      }
    });
};

// 7. Mostrar historial de pedidos local
// (Opcional: Puedes agregar una sección visual para mostrar el historial, aquí solo en consola)
function showLocalPedidos() {
  let pedidos = JSON.parse(localStorage.getItem("fastgoPedidos") || "[]");
  console.log("Historial local:", pedidos);
}
showLocalPedidos();

// 8. Animaciones en carga de secciones
document.querySelectorAll('.section').forEach(sec => sec.classList.add('anim-fade'));
