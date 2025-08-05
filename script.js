// ==============================
// FastGo sitio delivery/mandados
// Mejorado con autocompletado y mapa dinámico (Nominatim)
// ==============================

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

// === Configuración de Google Sheets ===
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS98meyWBoGVu0iF5ZJmLI7hmA6bLwAZroy6oTvgNJmDi9H7p4QDIiEh8-ocJVe08LhJPD4RtAtlEGq/pub?gid=0&single=true&output=csv'; // <-- Tu CSV de servicios
const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS98meyWBoGVu0iF5ZJmLI7hmA6bLwAZroy6oTvgNJmDi9H7p4QDIiEh8-ocJVe08LhJPD4RtAtlEGq/pub?gid=740601453&single=true&output=csv'; // <-- CSV pedidos (opcional)

let services = [];
let categories = new Set();

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

function showSchedule() {
  document.getElementById("schedule").innerHTML = `<strong>Horario:</strong> Lunes a sábado 9:00-21:00`;
}
showSchedule();

// ==== MAPAS Y AUTOCOMPLETADO ====

// Geolocalización: obtiene la ubicación del dispositivo y centra los mapas
let userLocation = [19.432608, -99.133209]; // CDMX como fallback

function initUserLocation(cb) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLocation = [pos.coords.latitude, pos.coords.longitude];
        cb && cb(userLocation);
      },
      err => { cb && cb(userLocation); } // fallback si falla
    );
  } else {
    cb && cb(userLocation);
  }
}

// Modifica la función de creación de mapas para usar userLocation al inicializar
function createDynamicMap(mapId, inputId, suggestionsId, coordsCallback, updateInputCallback) {
  const map = L.map(mapId).setView(userLocation, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "",
    maxZoom: 18,
  }).addTo(map);
  let marker = null;

  // Autocompletar direcciones (Nominatim)
  const input = document.getElementById(inputId);
  const suggBox = document.getElementById(suggestionsId);

  let timeoutAC = null;
// En sugerencias, limita resultados cerca del usuario
input.addEventListener('input', function() {
  clearTimeout(timeoutAC);
  const query = input.value.trim();
  if (!query) { suggBox.innerHTML = ""; return; }
  timeoutAC = setTimeout(() => {
    // Nominatim con viewbox centrado en userLocation
    let lat = userLocation[0], lng = userLocation[1];
    let bbox = `${lng-0.08},${lat-0.08},${lng+0.08},${lat+0.08}`;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=7&q=${encodeURIComponent(query)}&viewbox=${bbox}&bounded=1`)
      .then(res => res.json())
      .then(results => {
          suggBox.innerHTML = "";
          if (results.length === 0) return;
          results.forEach((r, idx) => {
            const item = document.createElement("div");
            item.className = 'suggestion-item' + (idx === 0 ? ' active' : '');
            // Icono por tipo
            let icon = 'fa-map-pin';
            if (r.type === "city" || r.type === "administrative") icon = 'fa-city';
            if (r.type === "road") icon = 'fa-road';
            if (r.type === "house" || r.type === "residential") icon = 'fa-home';
            item.innerHTML = `
              <span class="suggestion-icon"><i class="fas ${icon}"></i></span>
              <span class="suggestion-name">${r.display_name.split(",")[0]}</span>
              <span class="suggestion-details">${r.display_name}</span>
            `;
            item.onclick = () => {
              input.value = r.display_name;
              suggBox.innerHTML = "";
              map.setView([r.lat, r.lon], 17);
              if (marker) marker.setLatLng([r.lat, r.lon]);
              else marker = L.marker([r.lat, r.lon], {draggable:true}).addTo(map);
              coordsCallback([parseFloat(r.lat), parseFloat(r.lon)]);
              marker.on('dragend', function(ev) {
                const pos = marker.getLatLng();
                coordsCallback([pos.lat, pos.lng]);
                getReverseAddress(pos.lat, pos.lng, val => { input.value = val; });
              });
            };
            suggBox.appendChild(item);
          });
        });
    }, 350);
  });

  // Si el usuario hace click en el mapa, coloca el marcador y actualiza el campo
  map.on('click', function(e) {
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng, {draggable:true}).addTo(map);
    coordsCallback([e.latlng.lat, e.latlng.lng]);
    getReverseAddress(e.latlng.lat, e.latlng.lng, val => { input.value = val; });
    marker.on('dragend', function(ev) {
      const pos = marker.getLatLng();
      coordsCallback([pos.lat, pos.lng]);
      getReverseAddress(pos.lat, pos.lng, val => { input.value = val; });
    });
  });

  // Si el campo pierde el foco, oculta sugerencias
  input.addEventListener('blur', function() { setTimeout(()=>suggBox.innerHTML="", 150); });

  // Función para actualizar campo cuando el marcador se mueve
  if (updateInputCallback) {
    marker && marker.on('dragend', function(ev) {
      const pos = marker.getLatLng();
      updateInputCallback(pos);
      getReverseAddress(pos.lat, pos.lng, val => { input.value = val; });
    });
  }
  map.invalidateSize();

  // Retorna función para mover marcador desde fuera
  return {
    setMarker: function(lat, lng) {
      if (marker) marker.setLatLng([lat, lng]);
      else marker = L.marker([lat, lng], {draggable:true}).addTo(map);
      map.setView([lat, lng], 17);
    }
  };
}

function getReverseAddress(lat, lng, cb) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then(r=>r.json())
    .then(data=>cb(data.display_name || `${lat},${lng}`));
}

// Variables para los puntos seleccionados
let originCoords = null, destinationCoords = null;

// Inicializa ubicación y mapas al cargar
window.addEventListener('DOMContentLoaded', () => {
  initUserLocation(loc => {
    createDynamicMap('mapOrigin', 'origin', 'origin-suggestions', coords => { originCoords = coords; });
    createDynamicMap('mapDestination', 'destination', 'destination-suggestions', coords => { destinationCoords = coords; });
    loadServices();
  });
});

// === Solicitud de servicio y WhatsApp ===
document.getElementById("order-form").onsubmit = function(e) {
  e.preventDefault();
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
  let pedidos = JSON.parse(localStorage.getItem("fastgoPedidos") || "[]");
  let pedidoID = "FG" + Date.now().toString().slice(-6);
  pedidos.push({id:pedidoID, nombre, phone, servicio:service.nombre, desc, origin, dest, date: new Date().toLocaleString()});
  localStorage.setItem("fastgoPedidos", JSON.stringify(pedidos));

  let waUrl = "https://wa.me/50493593126?text=" + encodeURIComponent(msg);
  setTimeout(() => {
    window.open(waUrl, "_blank");
    feedback.textContent = "¡Pedido generado y listo para enviar por WhatsApp!";
    feedback.style.color = "green";
  }, 800);
};

// === Seguimiento de pedido ===
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

function showLocalPedidos() {
  let pedidos = JSON.parse(localStorage.getItem("fastgoPedidos") || "[]");
  console.log("Historial local:", pedidos);
}
showLocalPedidos();

document.querySelectorAll('.section').forEach(sec => sec.classList.add('anim-fade'));
