// ==============================
// FastGo sitio delivery/mandados
// Flujo por pasos, geolocalización, autocompletado dinámico
// Ajustes: ubicación por defecto La Ceiba, mapas más grandes, fix mapas invisibles, WhatsApp directo
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
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS98meyWBoGVu0iF5ZJmLI7hmA6bLwAZroy6oTvgNJmDi9H7p4QDIiEh8-ocJVe08LhJPD4RtAtlEGq/pub?gid=0&single=true&output=csv';
const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS98meyWBoGVu0iF5ZJmLI7hmA6bLwAZroy6oTvgNJmDi9H7p4QDIiEh8-ocJVe08LhJPD4RtAtlEGq/pub?gid=740601453&single=true&output=csv';

let services = [];
let categories = new Set();

function parseCSV(csv) {
  // Maneja comas dentro de campos con comillas
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

// ==== Geolocalización y mapas dinámicos ====
// La Ceiba, Honduras por defecto
let userLocation = [15.7758, -86.7822];
function initUserLocation(cb) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLocation = [pos.coords.latitude, pos.coords.longitude];
        cb && cb(userLocation);
      },
      err => { cb && cb(userLocation); }
    );
  } else {
    cb && cb(userLocation);
  }
}

// Guarda instancias para invalidateSize
let originMapInstance = null;
let destinationMapInstance = null;

function createDynamicMap(mapId, inputId, suggestionsId, coordsCallback, markerDefaultCoords) {
  // Espera a que el contenedor esté visible
  return new Promise((resolve) => {
    setTimeout(() => {
      const map = L.map(mapId).setView(markerDefaultCoords, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: "",
        maxZoom: 18,
      }).addTo(map);
      let marker = L.marker(markerDefaultCoords, {draggable:true}).addTo(map);
      coordsCallback(markerDefaultCoords);

      // ----- Autocompletar -----
      const input = document.getElementById(inputId);
      const suggBox = document.getElementById(suggestionsId);

      let timeoutAC = null;
      input.addEventListener('input', function() {
        clearTimeout(timeoutAC);
        const query = input.value.trim();
        if (!query) { suggBox.innerHTML = ""; return; }
        timeoutAC = setTimeout(() => {
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
                  marker.setLatLng([r.lat, r.lon]);
                  coordsCallback([parseFloat(r.lat), parseFloat(r.lon)]);
                };
                suggBox.appendChild(item);
              });
            });
        }, 350);
      });

      map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        coordsCallback([e.latlng.lat, e.latlng.lng]);
        getReverseAddress(e.latlng.lat, e.latlng.lng, val => { input.value = val; });
      });

      marker.on('dragend', function(ev) {
        const pos = marker.getLatLng();
        coordsCallback([pos.lat, pos.lng]);
        getReverseAddress(pos.lat, pos.lng, val => { input.value = val; });
      });

      input.addEventListener('blur', function() { setTimeout(()=>suggBox.innerHTML="", 150); });
      map.invalidateSize();
      resolve(map);
    }, 200);
  });
}

function getReverseAddress(lat, lng, cb) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then(r=>r.json())
    .then(data=>cb(data.display_name || `${lat},${lng}`));
}

// Variables para los puntos seleccionados
let originCoords = null, destinationCoords = null;

// Inicializar flujo por pasos y mapas
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById("order-stepper").style.display = "none";
  document.getElementById("start-order-btn").onclick = async () => {
    document.getElementById("order-intro").style.display = "none";
    document.getElementById("order-stepper").style.display = "block";
    document.getElementById("step-1").style.display = "block";
    // Inicializa mapas cuando se va a usar el stepper
    initUserLocation(async loc => {
      originMapInstance = await createDynamicMap('mapOrigin', 'origin', 'origin-suggestions', coords => { originCoords = coords; }, loc);
      destinationMapInstance = await createDynamicMap('mapDestination', 'destination', 'destination-suggestions', coords => { destinationCoords = coords; }, loc);
    });
  };

  document.getElementById("next-step-1").onclick = () => {
    if (!document.getElementById("serviceType").value || !document.getElementById("description").value.trim()) {
      alert("Selecciona el tipo de servicio y escribe la descripción.");
      return;
    }
    document.getElementById("step-1").style.display = "none";
    document.getElementById("step-2").style.display = "block";
    setTimeout(() => {
      if (originMapInstance) originMapInstance.invalidateSize();
    }, 100);
  };
  document.getElementById("next-step-2").onclick = () => {
    if (!document.getElementById("origin").value.trim() || !originCoords) {
      alert("Indica la dirección y selecciona el punto de origen.");
      return;
    }
    document.getElementById("step-2").style.display = "none";
    document.getElementById("step-3").style.display = "block";
    setTimeout(() => {
      if (destinationMapInstance) destinationMapInstance.invalidateSize();
    }, 100);
  };
  document.getElementById("next-step-3").onclick = () => {
    if (!document.getElementById("destination").value.trim() || !destinationCoords) {
      alert("Indica la dirección y selecciona el punto de destino.");
      return;
    }
    document.getElementById("step-3").style.display = "none";
    document.getElementById("step-4").style.display = "block";
  };

  loadServices();
});

// === Solicitud de servicio y WhatsApp ===
document.getElementById("order-stepper-form").onsubmit = function(e) {
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

  // WhatsApp Honduras (La Ceiba): 50493593126
  let waUrl = "https://wa.me/50493593126?text=" + encodeURIComponent(msg);
  window.open(waUrl, "_blank");
  feedback.textContent = "¡Pedido generado y listo para enviar por WhatsApp!";
  feedback.style.color = "green";
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
      let pedido = pedidos.find(p=>p.id_pedido === id);
      if (!pedido) {
        result.textContent = "Pedido no encontrado.";
        result.style.color = "red";
      } else {
        result.innerHTML = `
          <span><strong>Estado:</strong> ${pedido.estado || ''}</span><br>
          <span><strong>Servicio:</strong> ${pedido.servicio || ''}</span><br>
          <span><strong>Fecha:</strong> ${pedido.fecha || ''}</span><br>
          <span><strong>Notas:</strong> ${pedido.notas || ''}</span>
        `;
        result.style.color = "#333";
      }
    })
    .catch(()=>{
      result.textContent = "Error consultando el estado. Inténtalo más tarde.";
      result.style.color = "red";
    });
};

document.querySelectorAll('.section').forEach(sec => sec.classList.add('anim-fade'));
