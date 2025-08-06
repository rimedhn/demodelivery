// Menú principal tipo app y navegación de categorías
let services = [];
let categories = [];
let selectedCategory = null;

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

// Navegación y lógica de pasos secuenciales
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
  // Validaciones simples por paso
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
  // Ocultar todas las secciones al inicio
  document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
  document.getElementById('home').style.display = 'block';
  // Menú principal
  document.querySelectorAll('#app-menu button').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('#app-menu button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sectionId = btn.getAttribute('data-section');
      document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
      // Pedido intro/stepper
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
  // Iniciar pedido y tabs internos
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
  // Render categorías y servicios en sección servicios
  setTimeout(() => {
    // Simulación de servicios y categorías
    services = [
      {id:'1', nombre:'Envío de comida', descripcion:'Recibe tu comida favorita en minutos.', precio_base:'90', categoria:'Alimentos', horario:'9:00-21:00'},
      {id:'2', nombre:'Mandado farmacia', descripcion:'Recogemos tu medicina o productos.', precio_base:'60', categoria:'Farmacia', horario:'9:00-21:00'},
      {id:'3', nombre:'Transporte personal', descripcion:'Viaja cómodo y seguro.', precio_base:'150', categoria:'Transporte', horario:'9:00-21:00'},
      {id:'4', nombre:'Paquetería express', descripcion:'Entrega rápida de paquetes.', precio_base:'80', categoria:'Paquetería', horario:'9:00-21:00'},
    ];
    categories = Array.from(new Set(services.map(s=>s.categoria)));
    selectedCategory = categories[0] || null;
    renderCategories();
    renderServicesInCategory(selectedCategory);
  }, 100);
});
// Simulación: seleccionar servicio desde tarjetas
function selectService(id) {
  document.getElementById("order-intro").style.display = "none";
  document.getElementById("order-stepper").style.display = "block";
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById("step-1").classList.add('active');
  document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active','completed'));
  document.querySelector('.step-tab[data-step="step-1"]').classList.add('active');
  document.getElementById("serviceType").value = id;
  initStepper();
}

// Seguimiento de pedido - salida atractiva
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
  // Simulación de respuesta atractiva
  setTimeout(()=>{
    if(id === "FG123456") {
      result.innerHTML = `
        <div class="track-status"><i class="fas fa-check-circle"></i> Entregado</div>
        <div class="track-label">Servicio:</div>
        <div class="track-value">Envío de comida</div>
        <div class="track-label">Fecha:</div>
        <div class="track-value">2025-08-06</div>
        <div class="track-label">Notas:</div>
        <div class="track-value">Gracias por confiar en nosotros.</div>
      `;
      result.classList.add('visible');
      result.style.color = "#254d24";
    } else {
      result.innerHTML = "<span class='track-label'>Pedido no encontrado.</span>";
      result.classList.add('visible');
      result.style.color = "red";
    }
  },700);
};

// Preguntas frecuentes: mostrar respuesta visual
document.querySelectorAll('.faq-list details').forEach(det => {
  det.addEventListener('toggle', function() {
    if(det.open) det.style.background = '#e6f9ee';
    else det.style.background = '#f7fdf7';
  });
});
