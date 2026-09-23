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
const btnDescargarIndex = $('btnDescargarIndex');
const campoNuevaCat = $('campoNuevaCategoria');
const btnAnadirCat  = $('btnAnadirCategoria');
const CLAVE_CATEGORIAS = 'tienda_categorias_v1'; // misma clave que usa script.js
const CLAVE_CAT_OCULTAS = 'tienda_categorias_ocultas_v1'; // categorías del HTML que se eliminaron
const CLAVE_FONDO   = 'tienda_fondo_v1'; // misma clave que usa script.js

const campoFondoAdmin    = $('campoFondoAdmin');
const previaFondoAdmin   = $('previaFondoAdmin');
const btnGuardarFondo    = $('btnGuardarFondo');
const btnRestablecerFondo = $('btnRestablecerFondo');
let fondoNuevo = ''; // imagen de fondo recién elegida, pendiente de guardar

let sesionAbierta = false;  // evita pedir la contraseña dos veces por visita
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
    agotado       : art.classList.contains('agotado'),
    publicado     : true
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

// El panel de administrador siempre inicia cerrado para los usuarios normales.
cerrarModal(modalPass);
cerrarModal(modalAdmin);

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
                       imagen: imagenActual, agotado: false, publicado: false });
  }

  if(await aplicarCambios(catalogo)) limpiarFormulario();
});

btnCancelForm.addEventListener('click', limpiarFormulario);
btnDescargarIndex.addEventListener('click', descargarIndexPublicado);

/* ============================================================
   4.5 PUBLICACIÓN DEL CATÁLOGO
   ============================================================ */
function escaparHTMLScript(obj){
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function descargarIndexPublicado(){
  const catalogo = obtenerCatalogo().filter(p => p.publicado !== false);
  let fondo = '', categorias = [], categoriasOcultas = [];
  try { fondo = localStorage.getItem(CLAVE_FONDO) || ''; } catch(e){}
  try { categorias = JSON.parse(localStorage.getItem(CLAVE_CATEGORIAS)) || []; } catch(e){}
  try { categoriasOcultas = JSON.parse(localStorage.getItem(CLAVE_CAT_OCULTAS)) || []; } catch(e){}

  const datos = { categorias, categoriasOcultas, fondo };

  /*
     IMPORTANTE:
     La descarga debe representar SIEMPRE una tienda recién iniciada.
     Si el administrador descarga el index mientras el panel está abierto,
     outerHTML conservaría la clase "visible" y el modal bloquearía toda
     la tienda (incluidas las categorías) al abrir el archivo descargado.
     Por eso trabajamos sobre una copia del DOM y limpiamos cualquier estado
     visual temporal antes de generar el archivo.
  */
  const clon = document.documentElement.cloneNode(true);

  // El panel de administrador y el modal de contraseña comienzan cerrados.
  clon.querySelectorAll('#modalPassFondo, #modalAdminFondo').forEach(modal => {
    modal.classList.remove('visible');
    modal.hidden = false;
  });

  // En móvil, las categorías comienzan cerradas; en escritorio no afecta.
  const panelCategoriasDescarga = clon.querySelector('#panelCategorias');
  if(panelCategoriasDescarga) panelCategoriasDescarga.classList.remove('abierta');

  const fondoMenuDescarga = clon.querySelector('#fondoMenu');
  if(fondoMenuDescarga) fondoMenuDescarga.classList.remove('visible');

  const btnMenuDescarga = clon.querySelector('#btnMenu');
  if(btnMenuDescarga) btnMenuDescarga.setAttribute('aria-expanded', 'false');

  const html = clon.outerHTML
    .replace(/<script id="catalogoPublicado" type="application\/json">[\s\S]*?<\/script>/,
      '<script id="catalogoPublicado" type="application/json">' + escaparHTMLScript(catalogo) + '<\\/script>')
    .replace(/<script id="datosPublicados" type="application\/json">[\s\S]*?<\/script>/,
      '<script id="datosPublicados" type="application/json">' + escaparHTMLScript(datos) + '<\\/script>');

  const blob = new Blob(['<!DOCTYPE html>\n' + html], {type:'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'index.html';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  alert('Listo. Se descargó index.html con ' + catalogo.length + ' producto(s) publicado(s). Súbelo a tu hosting para que todos puedan verlo.');
}

/* ============================================================
   5. PANEL: lista de productos existentes
   ============================================================ */
function dibujarListaAdmin(){
  const catalogo = obtenerCatalogo();
  listaAdmin.innerHTML = '';

  catalogo.forEach((p, indice) => {
    const item = document.createElement('div');
    item.className = 'item-admin' + (p.agotado || !p.imagen ? ' agotado-admin' : '');

    const img = document.createElement('img');
    img.alt = p.titulo;
    const sinImagen = !p.imagen;
    img.src = p.imagen || (typeof IMG_AGOTADO_URI !== 'undefined' ? IMG_AGOTADO_URI : '');

    const info = document.createElement('div');
    info.className = 'info';
    const nombre = document.createElement('strong');
    nombre.textContent = p.titulo;
    const detalle = document.createElement('span');
    detalle.textContent = '$' + Number(p.precio).toFixed(2) +
                          ' · ' + (p.categorias || []).join(', ') +
                          ((p.agotado || sinImagen) ? ' · AGOTADO' + (sinImagen ? ' (sin imagen)' : '') : '');
    info.append(nombre, detalle);

    const acciones = document.createElement('div');
    acciones.className = 'acciones';
    const estaPublicado = p.publicado !== false;
    const btnPublicar = crearBoton(
      estaPublicado ? 'Publicado ✓' : 'Publicar en index',
      async () => {
        const cat = obtenerCatalogo();
        const prod = cat.find(x => x.id === p.id);
        if(!prod) return;

        prod.publicado = !estaPublicado;
        const ok = await aplicarCambios(cat);
        if(!ok) return;

        // Genera inmediatamente un nuevo index.html con el estado actualizado.
        // Así, al publicar/despublicar un producto, el archivo que se suba al
        // hosting queda sincronizado con lo que muestra el panel.
        descargarIndexPublicado();
      }
    );
    btnPublicar.className = estaPublicado ? 'btn-publicado' : 'btn-publicar';
    btnPublicar.title = estaPublicado
      ? 'Quitar este producto del index público y descargar el index actualizado'
      : 'Publicar este producto en el index y descargar el index actualizado';

    const btnEstado = crearBoton(p.agotado ? 'Disponible' : 'Agotado', async () => {
      const cat = obtenerCatalogo();
      const prod = cat.find(x => x.id === p.id);
      if(prod) prod.agotado = !prod.agotado;
      await aplicarCambios(cat);
    });
    if(sinImagen){   // sin foto siempre se ve como agotado; primero hay que subir una imagen
      btnEstado.disabled = true;
      btnEstado.title = 'Sube una imagen para poder marcarlo como disponible';
    }

    acciones.append(
      crearBoton('Editar',  () => cargarEnFormulario(p)),
      btnPublicar,
      btnEstado,
      ...(sinImagen ? [] : [crearBoton('Quitar imagen', async () => {
        if(!confirm('¿Quitar la imagen de "' + p.titulo + '"?\n\nEl producto aparecerá como "Producto agotado".')) return;
        const cat = obtenerCatalogo();
        const prod = cat.find(x => x.id === p.id);
        if(prod) prod.imagen = '';
        if(campoIdEdit.value === p.id) limpiarFormulario();
        await aplicarCambios(cat);
      })]),
      crearBoton('↑', async () => { await mover(p.id, -1); }),
      crearBoton('↓', async () => { await mover(p.id,  1); }),
      crearBoton('Eliminar', async () => {
        if(!confirm('¿Eliminar "' + p.titulo + '" de la tienda?')) return;
        const cat = obtenerCatalogo().filter(x => x.id !== p.id);
        if(campoIdEdit.value === p.id) limpiarFormulario();
        await aplicarCambios(cat);
      })
    );

    item.append(img, info, acciones);
    listaAdmin.appendChild(item);
  });

  if(!catalogo.length){
    const vacio = document.createElement('p');
    vacio.textContent = 'Todavía no hay productos.';
    listaAdmin.appendChild(vacio);
  }
}

function crearBoton(texto, alPulsar){
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = texto;
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
   6. Abrir y cerrar el panel
   ============================================================ */
function abrirPanel(){
  limpiarFormulario();
  dibujarListaAdmin();
  cargarFondoEnPanel();
  abrirModal(modalAdmin);
}

btnCerrar.addEventListener('click', () => cerrarModal(modalAdmin));

/* Clic en el fondo oscuro o tecla Escape: se cierra el modal abierto. */
[modalPass, modalAdmin].forEach(m => {
  m.addEventListener('click', e => { if(e.target === m) cerrarModal(m); });
});
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  cerrarModal(modalPass);
  cerrarModal(modalAdmin);
});

})();
