/* ============================================================
   PANEL DE ADMINISTRADOR
   ------------------------------------------------------------
   - Botón discreto (engranaje) abajo a la derecha.
   - Pide contraseña antes de mostrar nada.
   - Permite agregar, editar, quitar la imagen (el producto pasa
     a verse como "Producto agotado"), marcar como agotado y
     eliminar productos. Todo se guarda en el navegador (localStorage)
     bajo la misma clave que ya lee script.js.
   - Requiere que script.js se cargue ANTES que este archivo.
   ============================================================ */
(function(){
'use strict';

const CLAVE      = 'tienda_catalogo_v1';   // misma clave que usa script.js
const CONTRASENA = 'cris_2307';
const MAX_LADO   = 700;   // las fotos nuevas se reducen a este tamaño máximo
const CALIDAD    = 0.82;  // calidad de compresión (0 a 1)

/* ---------- Atajos a los elementos del HTML ---------- */
const $ = id => document.getElementById(id);

// Se conserva una copia del HTML actual para poder generar un index.html
// completo desde el navegador sin depender de un servidor.
const indexOriginalParaPublicar = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

const btnAdmin      = $('btnAdmin');
const modalPass     = $('modalPassFondo');
const campoPass     = $('campoPass');
const errorPass     = $('errorPass');
const btnPassEntrar = $('btnPassEntrar');
const btnPassCancel = $('btnPassCancelar');

const modalAdmin    = $('modalAdminFondo');
const btnCerrar     = $('btnCerrarAdmin');
const formAdmin     = $('formAdmin');
const tituloForm    = $('tituloFormAdmin');
const campoIdEdit   = $('campoIdEdicion');
const campoImagen   = $('campoImagen');
const previaImagen  = $('previaImagen');
const btnQuitarImg  = $('btnQuitarImagen');
const notaSinImg    = $('notaSinImagen');
const campoNombre   = $('campoNombre');
const campoPrecio   = $('campoPrecio');
const campoCaract   = $('campoCaract');
const listaCatCheck = $('listaCategoriasCheck');
const listaAdmin    = $('listaAdminProductos');
const btnCancelForm = $('btnCancelarForm');
const campoNuevaCat = $('campoNuevaCategoria');
const btnAnadirCat  = $('btnAnadirCategoria');
const CLAVE_CATEGORIAS = 'tienda_categorias_v1'; // misma clave que usa script.js
const CLAVE_CAT_OCULTAS = 'tienda_categorias_ocultas_v1'; // categorías del HTML que se eliminaron
const CLAVE_FONDO   = 'tienda_fondo_v1'; // misma clave que usa script.js

const campoFondoAdmin    = $('campoFondoAdmin');
const previaFondoAdmin   = $('previaFondoAdmin');
const btnGuardarFondo    = $('btnGuardarFondo');
const btnRestablecerFondo = $('btnRestablecerFondo');
const btnGuardarIndex     = $('btnGuardarIndex');
const estadoGuardarIndex  = $('estadoGuardarIndex');
let fondoNuevo = ''; // imagen de fondo recién elegida, pendiente de guardar

let sesionAbierta = false;  // solo dura mientras el panel actual está abierto
let imagenActual  = '';     // foto (en base64) del producto que se está editando

/* ============================================================
   1. CATÁLOGO: leer, construir desde el HTML y guardar
   ============================================================ */

/* Lee lo guardado en el navegador; si no hay nada devuelve null. */
function leerGuardado(){
  try { return JSON.parse(localStorage.getItem(CLAVE)); }
  catch(e){ return null; }
}

/* La primera vez que se usa el panel todavía no hay nada guardado,
   así que el catálogo se arma leyendo los productos del HTML. */
function catalogoDesdeHTML(){
  return [...document.querySelectorAll('#listaProductos .producto')].map(art => ({
    id            : art.dataset.id || nuevoId(),
    titulo        : art.querySelector('h3').textContent.trim(),
    precio        : parseFloat((art.querySelector('.precio').textContent || '0').replace(/[^\d.]/g,'')) || 0,
    caracteristicas: [...art.querySelectorAll('.caracteristicas li')].map(li => li.textContent.trim()),
    categorias    : (art.dataset.categoria || '').split(' ').filter(Boolean),
    imagen        : art.querySelector('.marco-imagen img')?.getAttribute('src') || '',
    agotado       : art.classList.contains('agotado')
  }));
}

function obtenerCatalogo(){
  return leerGuardado() || catalogoDesdeHTML();
}

function nuevoId(){
  return 'p' + Date.now().toString(36) + Math.floor(Math.random()*1000);
}

/* Guarda en el navegador. Si no cabe (las fotos ocupan mucho),
   comprime todas las imágenes y lo intenta de nuevo. */
async function guardarCatalogo(catalogo){
  try {
    localStorage.setItem(CLAVE, JSON.stringify(catalogo));
    return true;
  } catch(e){
    for(const p of catalogo){
      if(p.imagen && p.imagen.startsWith('data:')) p.imagen = await comprimirImagen(p.imagen, 520, 0.7);
    }
    try {
      localStorage.setItem(CLAVE, JSON.stringify(catalogo));
      return true;
    } catch(e2){
      alert('No hay espacio en el navegador para guardar tantas fotos.\n' +
            'Elimina algún producto o vuelve a subir la imagen en un tamaño más pequeño.');
      return false;
    }
  }
}

/* Guarda y refresca la tienda y la lista del panel de una sola vez. */
async function aplicarCambios(catalogo){
  const ok = await guardarCatalogo(catalogo);
  if(!ok) return false;
  if(typeof window.recargarTienda === 'function') window.recargarTienda();
  dibujarListaAdmin();
  return true;
}

/* ============================================================
   2. IMÁGENES: leer el archivo subido y reducir su peso
   ============================================================ */
function archivoADataURL(archivo){
  return new Promise((res, rej) => {
    const lector = new FileReader();
    lector.onload  = () => res(lector.result);
    lector.onerror = () => rej(new Error('No se pudo leer la imagen'));
    lector.readAsDataURL(archivo);
  });
}

function comprimirImagen(src, maxLado = MAX_LADO, calidad = CALIDAD){
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      let ancho = img.naturalWidth, alto = img.naturalHeight;
      const escala = Math.min(1, maxLado / Math.max(ancho, alto));
      ancho = Math.max(1, Math.round(ancho * escala));
      alto  = Math.max(1, Math.round(alto  * escala));

      const lienzo = document.createElement('canvas');
      lienzo.width = ancho; lienzo.height = alto;
      lienzo.getContext('2d').drawImage(img, 0, 0, ancho, alto);

      let salida = '';
      try { salida = lienzo.toDataURL('image/webp', calidad); } catch(e){ salida = ''; }
      if(!salida.startsWith('data:image/webp')){
        try { salida = lienzo.toDataURL('image/jpeg', calidad); } catch(e){ salida = ''; }
      }
      res(salida && salida.length < src.length ? salida : src);
    };
    img.onerror = () => res(src);   // si algo falla, se deja la original
    img.src = src;
  });
}

/* ============================================================
   3. CONTRASEÑA
   ============================================================ */
function abrirModal(modal){ modal.classList.add('visible'); }
function cerrarModal(modal){ modal.classList.remove('visible'); }

function pedirContrasena(){
  campoPass.value = '';
  errorPass.hidden = true;
  abrirModal(modalPass);
  setTimeout(() => campoPass.focus(), 50);
}

function comprobarContrasena(){
  if(campoPass.value === CONTRASENA){
    sesionAbierta = true;
    cerrarModal(modalPass);
    abrirPanel();
  } else {
    errorPass.hidden = false;
    campoPass.select();
  }
}

btnAdmin.addEventListener('click', () => {
  if(sesionAbierta) abrirPanel();
  else pedirContrasena();
});
btnPassEntrar.addEventListener('click', comprobarContrasena);
btnPassCancel.addEventListener('click', () => cerrarModal(modalPass));
campoPass.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); comprobarContrasena(); }
});
campoPass.addEventListener('input', () => { errorPass.hidden = true; });

/* ============================================================
   3.5 FONDO DE LA TIENDA (wallpaper)
   ============================================================ */

/* Aplica una imagen de fondo (data URL) a toda la página, al instante. */
function aplicarFondo(dataURL){
  document.documentElement.style.setProperty('--fondo-img', 'url("' + dataURL + '")');
}

/* Guarda el fondo en el navegador; si no cabe, lo comprime más y reintenta. */
async function guardarFondo(dataURL){
  try {
    localStorage.setItem(CLAVE_FONDO, dataURL);
    return true;
  } catch(e){
    const comprimida = await comprimirImagen(dataURL, 1100, 0.68);
    try {
      localStorage.setItem(CLAVE_FONDO, comprimida);
      aplicarFondo(comprimida);
      return true;
    } catch(e2){
      alert('No hay espacio en el navegador para guardar esta imagen de fondo.\n' +
            'Intenta con una foto más liviana.');
      return false;
    }
  }
}

/* Muestra en el panel el fondo que esté guardado actualmente, si hay alguno. */
function cargarFondoEnPanel(){
  let guardado = '';
  try { guardado = localStorage.getItem(CLAVE_FONDO) || ''; } catch(e){ guardado = ''; }
  if(guardado){ previaFondoAdmin.src = guardado; previaFondoAdmin.hidden = false; }
  else { previaFondoAdmin.hidden = true; previaFondoAdmin.removeAttribute('src'); }
  campoFondoAdmin.value = '';
  fondoNuevo = '';
}

campoFondoAdmin.addEventListener('change', async () => {
  const archivo = campoFondoAdmin.files && campoFondoAdmin.files[0];
  if(!archivo) return;
  try {
    const original = await archivoADataURL(archivo);
    fondoNuevo = await comprimirImagen(original, 1600, 0.8); // fondos van más grandes que las fotos de producto
    previaFondoAdmin.src = fondoNuevo;
    previaFondoAdmin.hidden = false;
  } catch(e){
    alert('No se pudo cargar esa imagen. Intenta con otro archivo.');
  }
});

btnGuardarFondo.addEventListener('click', async () => {
  if(!fondoNuevo){ alert('Primero elige una imagen de fondo.'); return; }
  const ok = await guardarFondo(fondoNuevo);
  if(ok){
    aplicarFondo(fondoNuevo);
    fondoNuevo = '';
    campoFondoAdmin.value = '';
  }
});

btnRestablecerFondo.addEventListener('click', () => {
  if(!confirm('¿Restablecer el fondo original de la tienda?')) return;
  try { localStorage.removeItem(CLAVE_FONDO); } catch(e){}
  document.documentElement.style.removeProperty('--fondo-img'); // vuelve al valor de styles.css
  cargarFondoEnPanel();
});

if(btnGuardarIndex){
  btnGuardarIndex.addEventListener('click', publicarIndex);
}

/* ============================================================
   4. PANEL: formulario de alta / edición
   ============================================================ */

/* Las categorías se toman de los botones de la barra lateral,
   así nunca se desincronizan con los filtros de la tienda. */
function categoriasDisponibles(){
  return [...document.querySelectorAll('#panelCategorias button')]
    .map(b => ({ valor: b.dataset.filtro, texto: b.textContent.trim() }))
    .filter(c => c.valor && c.valor !== 'todos');
}

function dibujarCategorias(seleccionadas = []){
  listaCatCheck.innerHTML = '';
  categoriasDisponibles().forEach(cat => {
    const fila = document.createElement('span');
    fila.className = 'fila-categoria';

    const label = document.createElement('label');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.value = cat.valor;
    chk.checked = seleccionadas.includes(cat.valor);
    label.append(chk, document.createTextNode(cat.texto));

    // botón para quitar la categoría de toda la tienda
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'btn-quitar-cat';
    quitar.textContent = '✕';
    quitar.title = 'Eliminar la categoría "' + cat.texto + '"';
    quitar.setAttribute('aria-label', 'Eliminar la categoría ' + cat.texto);
    quitar.addEventListener('click', () => eliminarCategoria(cat.valor, cat.texto));

    fila.append(label, quitar);
    listaCatCheck.appendChild(fila);
  });
}

/* Quita una categoría de la barra lateral y de todos los productos
   que la tuvieran. Si venía escrita en el HTML se recuerda como
   "oculta"; si se creó desde el panel, se borra de la lista guardada. */
async function eliminarCategoria(valor, texto){
  const catalogo = obtenerCatalogo();
  const afectados = catalogo.filter(p => (p.categorias || []).includes(valor));
  const huerfanos = afectados.filter(p => (p.categorias || []).length === 1);

  let aviso = '¿Eliminar la categoría "' + texto + '"?';
  if(afectados.length){
    aviso += '\n\nSe quitará de ' + afectados.length + ' producto(s).';
    if(huerfanos.length){
      aviso += '\n' + huerfanos.length + ' quedarían sin ninguna categoría ' +
               '(seguirían viéndose en "Todos", pero no en los filtros).';
    }
  }
  aviso += '\n\nLos productos NO se eliminan.';
  if(!confirm(aviso)) return;

  // 1. quitar la categoría de cada producto
  catalogo.forEach(p => {
    p.categorias = (p.categorias || []).filter(c => c !== valor);
  });

  // 2. olvidarla: si era una categoría creada desde el panel se borra de su lista;
  //    si venía en el HTML se guarda como oculta para que script.js no la muestre
  let extra = [];
  try { extra = JSON.parse(localStorage.getItem(CLAVE_CATEGORIAS)) || []; } catch(e){ extra = []; }
  const eraExtra = extra.some(c => c.valor === valor);

  if(eraExtra){
    localStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(extra.filter(c => c.valor !== valor)));
  } else {
    let ocultas = [];
    try { ocultas = JSON.parse(localStorage.getItem(CLAVE_CAT_OCULTAS)) || []; } catch(e){ ocultas = []; }
    if(!ocultas.includes(valor)) ocultas.push(valor);
    localStorage.setItem(CLAVE_CAT_OCULTAS, JSON.stringify(ocultas));
  }

  // 3. refrescar la barra de categorías de la tienda y guardar el catálogo
  if(typeof window.recargarCategorias === 'function') window.recargarCategorias();
  await aplicarCambios(catalogo);

  // 4. redibujar las casillas conservando lo que estuviera marcado
  const seleccionadas = [...listaCatCheck.querySelectorAll('input[type="checkbox"]:checked')]
    .map(c => c.value)
    .filter(v => v !== valor);
  dibujarCategorias(seleccionadas);
}

/* Convierte "Útiles y arte" en "utiles-y-arte" para usarlo como data-filtro. */
function generarValorCategoria(texto){
  const base = texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return base || ('cat' + Date.now());
}

function anadirCategoria(){
  const texto = campoNuevaCat.value.trim();
  if(!texto){ campoNuevaCat.focus(); return; }
  const valor = generarValorCategoria(texto);

  if(categoriasDisponibles().some(c => c.valor === valor)){
    alert('Ya existe una categoría igual o muy parecida.');
    campoNuevaCat.select();
    return;
  }

  let extra = [];
  try { extra = JSON.parse(localStorage.getItem(CLAVE_CATEGORIAS)) || []; } catch(e){ extra = []; }

  // si esa categoría venía en el HTML y se había eliminado, basta con dejar de ocultarla
  let ocultas = [];
  try { ocultas = JSON.parse(localStorage.getItem(CLAVE_CAT_OCULTAS)) || []; } catch(e){ ocultas = []; }
  if(ocultas.includes(valor)){
    localStorage.setItem(CLAVE_CAT_OCULTAS, JSON.stringify(ocultas.filter(v => v !== valor)));
  } else if(!extra.some(c => c.valor === valor)){
    extra.push({ valor, texto });
    localStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(extra));
  }

  // agrega el botón a la barra de categorías de la tienda (definido en script.js)
  if(typeof window.recargarCategorias === 'function') window.recargarCategorias();

  // refresca las casillas del formulario y deja marcada la categoría recién creada
  const seleccionadas = [...listaCatCheck.querySelectorAll('input:checked')].map(c => c.value);
  dibujarCategorias([...seleccionadas, valor]);

  campoNuevaCat.value = '';
  campoNuevaCat.focus();
}

btnAnadirCat.addEventListener('click', anadirCategoria);
campoNuevaCat.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); anadirCategoria(); }
});

/* Muestra (o esconde) la vista previa y el botón "Quitar imagen" según haya foto o no. */
function mostrarPrevia(){
  if(imagenActual){
    previaImagen.src = imagenActual;
    previaImagen.hidden = false;
    btnQuitarImg.hidden = false;
    notaSinImg.hidden = true;
  } else {
    previaImagen.hidden = true;
    previaImagen.removeAttribute('src');
    btnQuitarImg.hidden = true;
    // el aviso solo tiene sentido al editar un producto que se quedó sin foto
    notaSinImg.hidden = !campoIdEdit.value;
  }
}

function limpiarFormulario(){
  formAdmin.reset();
  campoIdEdit.value = '';
  imagenActual = '';
  mostrarPrevia();
  tituloForm.textContent = 'Agregar producto';
  dibujarCategorias([]);
}

function cargarEnFormulario(p){
  campoIdEdit.value = p.id;
  campoNombre.value = p.titulo;
  campoPrecio.value = p.precio;
  campoCaract.value = (p.caracteristicas || []).join('\n');
  imagenActual = p.imagen || '';
  campoImagen.value = '';
  mostrarPrevia();
  dibujarCategorias(p.categorias || []);
  tituloForm.textContent = 'Editar producto';
  modalAdmin.querySelector('.modal-caja').scrollTop = 0;
  irASeccionAdmin('adminSeccionFormulario');
}

campoImagen.addEventListener('change', async () => {
  const archivo = campoImagen.files && campoImagen.files[0];
  if(!archivo) return;
  try {
    const original = await archivoADataURL(archivo);
    imagenActual = await comprimirImagen(original);
    mostrarPrevia();
  } catch(e){
    alert('No se pudo cargar esa imagen. Intenta con otro archivo.');
  }
});

/* Quitar la imagen del producto que se está editando (se aplica al pulsar Guardar). */
btnQuitarImg.addEventListener('click', () => {
  imagenActual = '';
  campoImagen.value = '';
  mostrarPrevia();
});

formAdmin.addEventListener('submit', async e => {
  e.preventDefault();

  const titulo = campoNombre.value.trim();
  const precio = parseFloat(campoPrecio.value);
  const caracteristicas = campoCaract.value.split('\n').map(t => t.trim()).filter(Boolean);
  const categorias = [...listaCatCheck.querySelectorAll('input:checked')].map(c => c.value);

  if(!titulo)            { alert('Escribe el nombre del producto.'); return; }
  if(isNaN(precio))      { alert('Escribe un precio válido.'); return; }
  if(!caracteristicas.length){ alert('Escribe al menos una característica.'); return; }
  if(!categorias.length) { alert('Elige al menos una categoría.'); return; }

  const catalogo = obtenerCatalogo();
  const id = campoIdEdit.value;

  if(id){
    const prod = catalogo.find(p => p.id === id);
    if(prod) Object.assign(prod, { titulo, precio, caracteristicas, categorias, imagen: imagenActual });
  } else {
    // los productos nuevos se colocan al inicio para que se vean primero
    catalogo.unshift({ id: nuevoId(), titulo, precio, caracteristicas, categorias,
                       imagen: imagenActual, agotado: false });
  }

  if(await aplicarCambios(catalogo)){
    limpiarFormulario();
    irASeccionAdmin('adminSeccionProductos');
  }
});

btnCancelForm.addEventListener('click', limpiarFormulario);

/* ============================================================
   5. PANEL: lista de productos existentes
   ============================================================ */
function dibujarListaAdmin(){
  const catalogo = obtenerCatalogo();
  listaAdmin.innerHTML = '';

  actualizarOpcionesFiltroCategoriaAdmin(catalogo);

  const texto = normalizarAdmin(campoBusquedaAdmin?.value || '');
  const estado = filtroEstadoAdmin?.value || 'todos';
  const categoria = filtroCategoriaAdmin?.value || 'todas';
  const filtrados = catalogo.filter(p => {
    const sinImagen = !p.imagen;
    const agotado = p.agotado || sinImagen;
    const coincideTexto = !texto || normalizarAdmin(
      [p.titulo, ...(p.caracteristicas || []), ...(p.categorias || [])].join(' ')
    ).includes(texto);
    const coincideEstado =
      estado === 'todos' ||
      (estado === 'disponibles' && !agotado) ||
      (estado === 'agotados' && agotado) ||
      (estado === 'sin-imagen' && sinImagen);
    const categoriasProducto = Array.isArray(p.categorias) ? p.categorias : [];
    const coincideCategoria =
      categoria === 'todas' ||
      (categoria === 'sin-categoria' && categoriasProducto.length === 0) ||
      categoriasProducto.includes(categoria);
    return coincideTexto && coincideEstado && coincideCategoria;
  });

  const sePuedeArrastrar = !texto && estado === 'todos' && categoria === 'todas';

  filtrados.forEach((p) => {
    const item = document.createElement('article');
    const sinImagen = !p.imagen;
    const agotado = p.agotado || sinImagen;
    item.className = 'item-admin-pro' + (agotado ? ' agotado-admin' : '');
    item.draggable = sePuedeArrastrar;
    item.dataset.productId = p.id;

    const asa = document.createElement('button');
    asa.type = 'button';
    asa.className = 'asa-arrastre';
    asa.textContent = '⠿';
    asa.title = sePuedeArrastrar ? 'Arrastra para cambiar el orden' : 'Limpia los filtros para reordenar';
    asa.setAttribute('aria-label', asa.title);
    asa.disabled = !sePuedeArrastrar;

    const foto = document.createElement('div');
    foto.className = 'admin-product-thumb';
    const img = document.createElement('img');
    img.alt = p.titulo;
    img.src = p.imagen || (typeof IMG_AGOTADO_URI !== 'undefined' ? IMG_AGOTADO_URI : '');
    img.onerror = function(){ this.onerror = null; };
    foto.appendChild(img);

    const estadoBadge = document.createElement('span');
    estadoBadge.className = 'admin-estado-badge ' + (sinImagen ? 'sin-imagen' : agotado ? 'agotado' : 'disponible');
    estadoBadge.textContent = sinImagen ? 'Sin imagen' : (agotado ? 'Agotado' : 'Disponible');
    foto.appendChild(estadoBadge);

    const info = document.createElement('div');
    info.className = 'admin-product-info';

    const top = document.createElement('div');
    top.className = 'admin-product-top';
    const nombre = document.createElement('h4');
    nombre.textContent = p.titulo;
    const precio = document.createElement('strong');
    precio.className = 'admin-product-price';
    precio.textContent = '$' + Number(p.precio).toFixed(2);
    top.append(nombre, precio);

    const categorias = document.createElement('div');
    categorias.className = 'admin-product-cats';
    (p.categorias || []).forEach(cat => {
      const chip = document.createElement('span');
      chip.textContent = cat;
      categorias.appendChild(chip);
    });
    if(!(p.categorias || []).length){
      const chip = document.createElement('span');
      chip.textContent = 'Sin categoría';
      categorias.appendChild(chip);
    }

    const detalle = document.createElement('p');
    detalle.className = 'admin-product-detail';
    detalle.textContent = (p.caracteristicas || []).slice(0,2).join(' · ') || 'Sin características';

    info.append(top, categorias, detalle);

    const acciones = document.createElement('div');
    acciones.className = 'acciones admin-product-actions';

    const btnEditar = crearBoton('Editar', () => cargarEnFormulario(p), 'admin-btn-edit');
    const btnEstado = crearBoton(p.agotado ? 'Marcar disponible' : 'Marcar agotado', async () => {
      const cat = obtenerCatalogo();
      const prod = cat.find(x => x.id === p.id);
      if(prod) prod.agotado = !prod.agotado;
      await aplicarCambios(cat);
    }, p.agotado ? 'admin-btn-success' : 'admin-btn-warn');
    if(sinImagen){
      btnEstado.disabled = true;
      btnEstado.textContent = 'Sube una imagen';
      btnEstado.title = 'Sube una imagen antes de marcarlo como disponible';
    }

    const btnQuitar = crearBoton('Quitar imagen', async () => {
      if(!confirm('¿Quitar la imagen de "' + p.titulo + '"?\n\nEl producto aparecerá como "Producto agotado".')) return;
      const cat = obtenerCatalogo();
      const prod = cat.find(x => x.id === p.id);
      if(prod) prod.imagen = '';
      if(campoIdEdit.value === p.id) limpiarFormulario();
      await aplicarCambios(cat);
    }, 'admin-btn-ghost');
    btnQuitar.hidden = sinImagen;

    const btnUp = crearBoton('↑', async () => { await mover(p.id, -1); }, 'admin-btn-square');
    const btnDown = crearBoton('↓', async () => { await mover(p.id, 1); }, 'admin-btn-square');
    const btnEliminar = crearBoton('Eliminar', async () => {
      if(!confirm('¿Eliminar "' + p.titulo + '" de la tienda?')) return;
      const cat = obtenerCatalogo().filter(x => x.id !== p.id);
      if(campoIdEdit.value === p.id) limpiarFormulario();
      await aplicarCambios(cat);
    }, 'admin-btn-danger');

    acciones.append(btnEditar, btnEstado, btnQuitar, btnUp, btnDown, btnEliminar);
    item.append(asa, foto, info, acciones);
    listaAdmin.appendChild(item);
  });

  prepararArrastreProductos();
  actualizarResumenAdmin(catalogo);

  if(!filtrados.length){
    const vacio = document.createElement('div');
    vacio.className = 'admin-empty-state';
    const titulo = document.createElement('strong');
    titulo.textContent = catalogo.length ? 'No hay resultados' : 'Todavía no hay productos';
    const textoVacio = document.createElement('p');
    textoVacio.textContent = catalogo.length
      ? 'Prueba otra búsqueda o cambia el filtro de estado.'
      : 'Crea tu primer producto desde el botón «Nuevo producto».';
    vacio.append(titulo, textoVacio);
    listaAdmin.appendChild(vacio);
  }

  if(adminListaHint){
    adminListaHint.textContent = sePuedeArrastrar
      ? 'Arrastra una tarjeta para cambiar la posición. Los cambios se guardan automáticamente.'
      : 'El reordenamiento se activa cuando no hay búsqueda ni filtros aplicados.';
  }
} 

/* Permite reordenar productos arrastrándolos directamente en la lista.
   El nuevo orden se guarda en localStorage para que también lo use la tienda. */
function prepararArrastreProductos(){
  const items = [...listaAdmin.querySelectorAll('.item-admin-pro[data-product-id]')];
  let idArrastrado = '';
  let pointerActivo = false;
  let pointerId = null;
  let itemOrigen = null;
  let ultimoObjetivo = null;

  function limpiarClases(){
    items.forEach(x => x.classList.remove('objetivo-arrastre', 'arrastrando'));
  }

  function objetivoDesdePunto(x, y){
    const elemento = document.elementFromPoint(x, y);
    const item = elemento?.closest?.('.item-admin-pro[data-product-id]');
    if(!item || item === itemOrigen) return null;
    if(!listaAdmin.contains(item)) return null;
    return item;
  }

  function pintarObjetivo(item){
    if(ultimoObjetivo === item) return;
    items.forEach(x => x.classList.remove('objetivo-arrastre'));
    ultimoObjetivo = item || null;
    if(item) item.classList.add('objetivo-arrastre');
  }

  async function terminarPointer(clientX, clientY, cancelar = false){
    if(!pointerActivo) return;
    pointerActivo = false;

    const origenId = idArrastrado;
    const destinoItem = cancelar ? null : objetivoDesdePunto(clientX, clientY);
    const destinoId = destinoItem?.dataset.productId || '';

    if(itemOrigen && pointerId !== null){
      try { itemOrigen.releasePointerCapture(pointerId); } catch(e) {}
    }

    limpiarClases();
    idArrastrado = '';
    pointerId = null;
    itemOrigen = null;
    ultimoObjetivo = null;

    if(!origenId || !destinoId || origenId === destinoId) return;

    const cat = obtenerCatalogo();
    const origen = cat.findIndex(x => x.id === origenId);
    const destino = cat.findIndex(x => x.id === destinoId);
    if(origen < 0 || destino < 0 || origen === destino) return;

    const [movido] = cat.splice(origen, 1);
    // Después de quitar el origen, el índice del destino puede cambiar.
    const destinoActual = cat.findIndex(x => x.id === destinoId);
    cat.splice(Math.max(0, destinoActual), 0, movido);
    await aplicarCambios(cat);
  }

  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      idArrastrado = item.dataset.productId;
      itemOrigen = item;
      item.classList.add('arrastrando');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idArrastrado);
    });

    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if(item.dataset.productId === idArrastrado) return;
      pintarObjetivo(item);
    });

    item.addEventListener('drop', async e => {
      e.preventDefault();
      const idOrigen = e.dataTransfer.getData('text/plain') || idArrastrado;
      const idDestino = item.dataset.productId;
      limpiarClases();

      if(!idOrigen || idOrigen === idDestino) return;

      const cat = obtenerCatalogo();
      const origen = cat.findIndex(x => x.id === idOrigen);
      const destino = cat.findIndex(x => x.id === idDestino);
      if(origen < 0 || destino < 0 || origen === destino) return;

      const [movido] = cat.splice(origen, 1);
      const destinoActual = cat.findIndex(x => x.id === idDestino);
      cat.splice(Math.max(0, destinoActual), 0, movido);
      await aplicarCambios(cat);
    });

    item.addEventListener('dragend', () => {
      idArrastrado = '';
      itemOrigen = null;
      limpiarClases();
    });

    const asa = item.querySelector('.asa-arrastre');
    if(asa && !asa.disabled){
      asa.addEventListener('pointerdown', e => {
        if(e.button !== 0 || pointerActivo) return;
        e.preventDefault();
        pointerActivo = true;
        pointerId = e.pointerId;
        idArrastrado = item.dataset.productId;
        itemOrigen = item;
        ultimoObjetivo = null;
        item.classList.add('arrastrando');
        asa.setPointerCapture?.(e.pointerId);
      });

      asa.addEventListener('pointermove', e => {
        if(!pointerActivo || e.pointerId !== pointerId) return;
        e.preventDefault();
        pintarObjetivo(objetivoDesdePunto(e.clientX, e.clientY));
      });

      asa.addEventListener('pointerup', e => {
        if(!pointerActivo || e.pointerId !== pointerId) return;
        e.preventDefault();
        terminarPointer(e.clientX, e.clientY);
      });

      asa.addEventListener('pointercancel', e => {
        if(!pointerActivo || e.pointerId !== pointerId) return;
        e.preventDefault();
        terminarPointer(e.clientX, e.clientY, true);
      });

      asa.addEventListener('lostpointercapture', () => {
        if(pointerActivo) terminarPointer(window.innerWidth / 2, window.innerHeight / 2, true);
      });
    }

    item.querySelectorAll('button').forEach(boton => {
      boton.addEventListener('dragstart', e => e.stopPropagation());
    });
  });
}

function crearBoton(texto, alPulsar, clase = ''){
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = texto;
  if(clase) b.classList.add(clase);
  b.addEventListener('click', alPulsar);
  return b;
}

/* Sube o baja un producto en el orden del catálogo. */
async function mover(id, direccion){
  const cat = obtenerCatalogo();
  const i = cat.findIndex(p => p.id === id);
  const destino = i + direccion;
  if(i < 0 || destino < 0 || destino >= cat.length) return;
  [cat[i], cat[destino]] = [cat[destino], cat[i]];
  await aplicarCambios(cat);
}

/* ============================================================
   6. PUBLICAR INDEX.HTML
   ------------------------------------------------------------
   localStorage solo existe en el navegador actual. Por eso este
   botón genera un nuevo index.html que, al abrirse, reconstruye
   automáticamente los datos guardados por el administrador.
   ============================================================ */

function leerEstadoParaPublicar(){
  let catalogo = [];
  let categorias = [];
  let categoriasOcultas = [];
  let fondo = '';

  try {
    catalogo = JSON.parse(localStorage.getItem(CLAVE) || '[]') || [];
  } catch(e) {
    catalogo = obtenerCatalogo();
  }

  try {
    categorias = JSON.parse(localStorage.getItem(CLAVE_CATEGORIAS) || '[]') || [];
  } catch(e) {
    categorias = [];
  }

  try {
    categoriasOcultas = JSON.parse(localStorage.getItem(CLAVE_CAT_OCULTAS) || '[]') || [];
  } catch(e) {
    categoriasOcultas = [];
  }

  try {
    fondo = localStorage.getItem(CLAVE_FONDO) || '';
  } catch(e) {
    fondo = '';
  }

  // Si nunca hubo un guardado del catálogo, usa el estado visible actual.
  if(!catalogo.length) catalogo = catalogoDesdeHTML();

  return { catalogo, categorias, categoriasOcultas, fondo };
}

function construirIndexPublicado(){
  const estado = leerEstadoParaPublicar();

  // JSON seguro para incrustar dentro de un <script>.
  // También evita que una cadena de datos pueda cerrar accidentalmente el script.
  const datos = JSON.stringify(estado)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const bootstrap = `
<!-- ============================================================
     ESTADO PUBLICADO POR EL PANEL DE ADMINISTRADOR
     ============================================================ -->
<script>
(function(){
  try {
    const estadoPublicado = ${datos};
    if (Array.isArray(estadoPublicado.catalogo)) {
      localStorage.setItem('tienda_catalogo_v1', JSON.stringify(estadoPublicado.catalogo));
    }
    if (Array.isArray(estadoPublicado.categorias)) {
      localStorage.setItem('tienda_categorias_v1', JSON.stringify(estadoPublicado.categorias));
    }
    if (Array.isArray(estadoPublicado.categoriasOcultas)) {
      localStorage.setItem('tienda_categorias_ocultas_v1', JSON.stringify(estadoPublicado.categoriasOcultas));
    }
    if (estadoPublicado.fondo) {
      localStorage.setItem('tienda_fondo_v1', estadoPublicado.fondo);
    } else {
      localStorage.removeItem('tienda_fondo_v1');
    }
  } catch(e) {
    console.warn('No se pudo cargar el estado publicado:', e);
  }
})();
</script>
`;

  const marcador = '<script src="script.js"></script>';
  if(!indexOriginalParaPublicar.includes(marcador)){
    throw new Error('No se encontró script.js en el index original.');
  }

  return indexOriginalParaPublicar.replace(
    marcador,
    bootstrap + '\n' + marcador
  );
}

async function publicarIndex(){
  if(!btnGuardarIndex) return;

  btnGuardarIndex.disabled = true;
  if(estadoGuardarIndex){
    estadoGuardarIndex.hidden = false;
    estadoGuardarIndex.textContent = 'Preparando index.html...';
  }

  try {
    const contenido = construirIndexPublicado();
    const blob = new Blob([contenido], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = 'index.html';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // El guardado/publicación termina la sesión administrativa.
    sesionAbierta = false;
    cerrarModal(modalAdmin);
    cerrarModal(modalPass);
    limpiarFormulario();

    alert(
      'Index guardado correctamente.\\n\\n' +
      'Se descargó "index.html". Reemplaza el index.html de tu sitio ' +
      'por este archivo para que los cambios estén disponibles para todos.'
    );
  } catch(e) {
    console.error(e);
    if(estadoGuardarIndex){
      estadoGuardarIndex.hidden = false;
      estadoGuardarIndex.textContent = 'No se pudo generar el index.html.';
    }
    alert('No se pudo generar el index.html. Revisa la consola del navegador para más detalles.');
  } finally {
    btnGuardarIndex.disabled = false;
    if(estadoGuardarIndex && !modalAdmin.classList.contains('visible')){
      estadoGuardarIndex.hidden = true;
    }
  }
}

/* ============================================================
   6. Abrir y cerrar el panel
   ============================================================ */
function abrirPanel(){
  limpiarFormulario();
  dibujarListaAdmin();
  cargarFondoEnPanel();
  abrirModal(modalAdmin);
}

/* Cierra el administrador y termina la sesión para que siempre
   vuelva a pedir la contraseña al entrar otra vez. */
function salirDelAdministrador(){
  sesionAbierta = false;
  cerrarModal(modalAdmin);
  limpiarFormulario();
}

/* Botón X: salir del administrador y volver a exigir contraseña. */
btnCerrar.addEventListener('click', salirDelAdministrador);

/* Clic fuera del recuadro de administrador:
   cierra el panel y termina la sesión. */
modalAdmin.addEventListener('click', e => {
  if(e.target === modalAdmin) salirDelAdministrador();
});

/* En la ventana de contraseña, hacer clic fuera simplemente la cierra. */
modalPass.addEventListener('click', e => {
  if(e.target === modalPass) cerrarModal(modalPass);
});

/* Escape también cierra el administrador y termina la sesión. */
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  cerrarModal(modalPass);
  if(modalAdmin.classList.contains('visible')) salirDelAdministrador();
});


/* ============================================================
   7. MEJORAS DEL DASHBOARD DE ADMINISTRACIÓN
   ------------------------------------------------------------
   - Resumen en tiempo real.
   - Búsqueda y filtros.
   - Accesos rápidos por sección.
   - Nuevo producto con foco automático.
   ============================================================ */
const campoBusquedaAdmin = $('campoBusquedaAdmin');
const filtroCategoriaAdmin = $('filtroCategoriaAdmin');
const filtroEstadoAdmin  = $('filtroEstadoAdmin');
const adminListaHint     = $('adminListaHint');
const adminTotalProductos = $('adminTotalProductos');
const adminDisponibles    = $('adminDisponibles');
const adminAgotados       = $('adminAgotados');
const adminTotalCategorias = $('adminTotalCategorias');
const btnNuevoProducto    = $('btnNuevoProducto');
const btnActualizarAdmin  = $('btnActualizarAdmin');

function normalizarAdmin(valor){
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function textoCategoriaAdmin(valor){
  const botones = [...document.querySelectorAll('#panelCategorias button[data-filtro]')];
  const boton = botones.find(btn => btn.dataset.filtro === valor);
  if(boton) return boton.textContent.trim();

  const guardadas = leerCategoriasGuardadas();
  const guardada = guardadas.find(c => c.valor === valor);
  return guardada?.texto || valor;
}

function actualizarOpcionesFiltroCategoriaAdmin(catalogo = obtenerCatalogo()){
  if(!filtroCategoriaAdmin) return;

  const valorActual = filtroCategoriaAdmin.value || 'todas';
  const mapa = new Map();

  // Prioriza las categorías visibles de la tienda.
  categoriasDisponibles().forEach(cat => mapa.set(cat.valor, cat.texto));

  // Incluye también cualquier categoría que ya esté asignada a un producto.
  catalogo.forEach(p => {
    (p.categorias || []).forEach(valor => {
      if(!mapa.has(valor)) mapa.set(valor, textoCategoriaAdmin(valor));
    });
  });

  const fragmento = document.createDocumentFragment();
  const todas = document.createElement('option');
  todas.value = 'todas';
  todas.textContent = 'Todas las categorías';
  fragmento.appendChild(todas);

  [...mapa.entries()]
    .sort((a,b) => a[1].localeCompare(b[1], 'es', {sensitivity:'base'}))
    .forEach(([valor, texto]) => {
      const option = document.createElement('option');
      option.value = valor;
      option.textContent = texto;
      fragmento.appendChild(option);
    });

  const tieneSinCategoria = catalogo.some(p => !(p.categorias || []).length);
  if(tieneSinCategoria){
    const option = document.createElement('option');
    option.value = 'sin-categoria';
    option.textContent = 'Sin categoría';
    fragmento.appendChild(option);
  }

  filtroCategoriaAdmin.replaceChildren(fragmento);
  filtroCategoriaAdmin.value = [...filtroCategoriaAdmin.options].some(o => o.value === valorActual)
    ? valorActual
    : 'todas';
}

function actualizarResumenAdmin(catalogo = obtenerCatalogo()){
  const total = catalogo.length;
  const disponibles = catalogo.filter(p => p.imagen && !p.agotado).length;
  const agotados = catalogo.filter(p => p.agotado || !p.imagen).length;
  const categorias = new Set(catalogo.flatMap(p => p.categorias || [])).size;

  if(adminTotalProductos) adminTotalProductos.textContent = total;
  if(adminDisponibles) adminDisponibles.textContent = disponibles;
  if(adminAgotados) adminAgotados.textContent = agotados;
  if(adminTotalCategorias) adminTotalCategorias.textContent = categorias;
}

function irASeccionAdmin(id){
  const el = $(id);
  if(!el) return;
  el.scrollIntoView({behavior:'smooth', block:'start'});
}

campoBusquedaAdmin?.addEventListener('input', dibujarListaAdmin);
filtroCategoriaAdmin?.addEventListener('change', dibujarListaAdmin);
filtroEstadoAdmin?.addEventListener('change', dibujarListaAdmin);
btnActualizarAdmin?.addEventListener('click', () => {
  if(campoBusquedaAdmin) campoBusquedaAdmin.value = '';
  if(filtroCategoriaAdmin) filtroCategoriaAdmin.value = 'todas';
  if(filtroEstadoAdmin) filtroEstadoAdmin.value = 'todos';
  dibujarListaAdmin();
});

document.querySelectorAll('[data-admin-scroll]').forEach(btn => {
  btn.addEventListener('click', () => irASeccionAdmin(btn.dataset.adminScroll));
});

btnNuevoProducto?.addEventListener('click', () => {
  limpiarFormulario();
  irASeccionAdmin('adminSeccionFormulario');
  setTimeout(() => campoNombre?.focus(), 260);
});

actualizarResumenAdmin();

})();
