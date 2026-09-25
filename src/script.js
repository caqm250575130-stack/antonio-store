/* ============================================================
   CATÁLOGO DINÁMICO: si el administrador guardó cambios en este
   navegador (localStorage), se reconstruye la lista de productos
   con esos datos ANTES de inicializar el buscador y los filtros.
   Si nunca se usó el panel de administrador, no hace nada y se
   deja la tienda tal como está escrita en el HTML.
   ============================================================ */
const CLAVE_CATALOGO = 'tienda_catalogo_v1';
const CLAVE_FONDO = 'tienda_fondo_v1'; // misma clave que usa admin.js
const IMG_AGOTADO_URI = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%0A%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23141824%22/%3E%0A%3Crect%20x%3D%2214%22%20y%3D%2214%22%20width%3D%22172%22%20height%3D%22172%22%20fill%3D%22none%22%20stroke%3D%22%23e14b4b%22%20stroke-width%3D%223%22%20stroke-dasharray%3D%2210%206%22/%3E%0A%3Ctext%20x%3D%22100%22%20y%3D%2294%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2220%22%20font-weight%3D%22bold%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%3EPRODUCTO%3C/text%3E%0A%3Ctext%20x%3D%22100%22%20y%3D%22122%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2220%22%20font-weight%3D%22bold%22%20fill%3D%22%23e14b4b%22%20text-anchor%3D%22middle%22%3EAGOTADO%3C/text%3E%0A%3C/svg%3E";
const SVG_WHATSAPP = '<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm5.5 14.2c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1-.4-.1-1-.3-1.6-.6-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3z"/></svg>';

/* Si el administrador guardó un wallpaper propio, se usa en vez del que
   trae styles.css. Se aplica lo antes posible para evitar parpadeos. */
function aplicarFondoGuardado(){
  try {
    const guardado = localStorage.getItem(CLAVE_FONDO);
    if(guardado) document.documentElement.style.setProperty('--fondo-img', 'url("' + guardado + '")');
  } catch(e){ /* si localStorage falla, se deja el fondo de styles.css */ }
}
aplicarFondoGuardado();

function leerCatalogoGuardado(){
  try { return JSON.parse(localStorage.getItem(CLAVE_CATALOGO)); }
  catch(e){ return null; }
}

function crearArticuloProducto(p){
  const art = document.createElement('article');
  // Sin imagen = "Producto agotado" (se ve la imagen de reemplazo y no se puede pedir)
  const sinImagen = !p.imagen;
  art.className = 'producto' + ((p.agotado || sinImagen) ? ' agotado' : '') + (sinImagen ? ' sin-imagen' : '');
  art.dataset.id = p.id;
  art.dataset.categoria = p.categorias.join(' ');
  art.dataset.nombre = (p.titulo + ' ' + p.caracteristicas.join(' ')).toLowerCase();

  const marco = document.createElement('div');
  marco.className = 'marco-imagen';
  const img = document.createElement('img');
  img.alt = p.titulo;
  img.src = p.imagen || IMG_AGOTADO_URI;
  img.onerror = function(){ this.onerror = null; this.src = IMG_AGOTADO_URI; };
  marco.appendChild(img);

  const h3 = document.createElement('h3');
  h3.textContent = p.titulo;

  const ul = document.createElement('ul');
  ul.className = 'caracteristicas';
  p.caracteristicas.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c;
    ul.appendChild(li);
  });

  const filaPrecio = document.createElement('div');
  filaPrecio.className = 'fila-precio';
  const precio = document.createElement('span');
  precio.className = 'precio';
  precio.textContent = '$' + Number(p.precio).toFixed(2);
  filaPrecio.appendChild(precio);

  const btn = document.createElement('a');
  btn.className = 'btn-pedir';
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.href = 'https://wa.me/50379011314?text=' + encodeURIComponent('Hola, quiero pedir ' + p.titulo);
  btn.innerHTML = '<span>Pedir</span><span class="icono" aria-hidden="true">' + SVG_WHATSAPP + '</span>';
  filaPrecio.appendChild(btn);

  art.append(marco, h3, ul, filaPrecio);
  return art;
}

function aplicarCatalogoGuardado(){
  const catalogo = leerCatalogoGuardado();
  if(!catalogo) return; // nunca se usó el panel de administrador: se deja el HTML tal cual
  const lista = document.getElementById('listaProductos');
  const aviso = document.getElementById('sinResultados');
  [...lista.querySelectorAll('.producto')].forEach(el => el.remove());
  catalogo.forEach(p => lista.insertBefore(crearArticuloProducto(p), aviso));
}
aplicarCatalogoGuardado();

/* ------------------------------------------------------------
   CATEGORÍAS NUEVAS: si desde el panel de administrador se
   creó alguna categoría además de las que ya trae el HTML,
   se agrega su botón a la barra de categorías.
   ------------------------------------------------------------ */
const CLAVE_CATEGORIAS = 'tienda_categorias_v1';
const CLAVE_CAT_OCULTAS = 'tienda_categorias_ocultas_v1'; // misma clave que usa admin.js

function leerCategoriasGuardadas(){
  try { return JSON.parse(localStorage.getItem(CLAVE_CATEGORIAS)) || []; }
  catch(e){ return []; }
}

function leerCategoriasOcultas(){
  try { return JSON.parse(localStorage.getItem(CLAVE_CAT_OCULTAS)) || []; }
  catch(e){ return []; }
}

function aplicarCategoriasGuardadas(){
  const panel = document.getElementById('panelCategorias');

  // 1. agregar las categorías creadas desde el panel de administrador
  leerCategoriasGuardadas().forEach(c => {
    if(panel.querySelector('button[data-filtro="' + c.valor + '"]')) return; // ya existe
    const btn = document.createElement('button');
    btn.dataset.filtro = c.valor;
    btn.textContent = c.texto;
    panel.appendChild(btn);
  });

  // 2. quitar las que se eliminaron desde el panel ("todos" nunca se elimina)
  leerCategoriasOcultas().forEach(valor => {
    if(valor === 'todos') return;
    const btn = panel.querySelector('button[data-filtro="' + valor + '"]');
    if(btn) btn.remove();
  });
}
aplicarCategoriasGuardadas();

/* ============================================================
   JAVASCRIPT: menú de categorías, filtro y buscador
   ============================================================ */
const btnMenu    = document.getElementById('btnMenu');
const panel      = document.getElementById('panelCategorias');
const fondoMenu  = document.getElementById('fondoMenu');
const campo      = document.getElementById('campoBusqueda');
let   productos  = [...document.querySelectorAll('.producto')];
const aviso      = document.getElementById('sinResultados');
const botonesCat = () => [...panel.querySelectorAll('button')]; // función: siempre lee los botones actuales

let categoriaActiva = 'todos';

/* --- Abrir / cerrar la barra de categorías --- */
function alternarMenu(abrir){
  const estado = abrir ?? !panel.classList.contains('abierta');
  panel.classList.toggle('abierta', estado);
  fondoMenu.classList.toggle('visible', estado);
  btnMenu.setAttribute('aria-expanded', estado);
}
btnMenu.addEventListener('click', () => alternarMenu());
fondoMenu.addEventListener('click', () => alternarMenu(false));
document.addEventListener('keydown', e => { if(e.key === 'Escape') alternarMenu(false); });

/* --- Normaliza texto para que la búsqueda no distinga tildes ---
   "cafe" encuentra "café", "audifono" encuentra "audífono", etc. */
function normalizarTexto(str){
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita los acentos (tildes, diéresis)
    .toLowerCase();
}

/* --- Filtro combinado: texto del buscador + categoría --- */
function filtrar(){
  const texto = normalizarTexto(campo.value.trim());
  let visibles = 0;

  productos.forEach(p => {
    const nombre = normalizarTexto(p.dataset.nombre + ' ' + p.querySelector('h3').textContent);
    const coincideTexto = nombre.includes(texto);
    const categoriasProducto = p.dataset.categoria.split(' '); // soporta varias categorías por producto
    const coincideCat   = categoriaActiva === 'todos' || categoriasProducto.includes(categoriaActiva);
    const mostrar = coincideTexto && coincideCat;
    p.style.display = mostrar ? '' : 'none';
    if(mostrar) visibles++;
  });

  aviso.hidden = visibles > 0;
}

campo.addEventListener('input', filtrar);

/* --- Clic en una categoría (delegado: funciona también con botones agregados después) --- */
panel.addEventListener('click', e => {
  const btn = e.target.closest('button[data-filtro]');
  if(!btn) return;
  categoriaActiva = btn.dataset.filtro;
  botonesCat().forEach(b => b.classList.toggle('activa', b === btn));
  filtrar();
  if(window.innerWidth <= 900) alternarMenu(false); // en móvil se cierra al elegir
});

filtrar(); // estado inicial

/* --- Punto de entrada que usa admin.js después de guardar cambios ---
   Vuelve a leer las tarjetas del catálogo y reaplica búsqueda + categoría,
   para que la tienda quede al día sin recargar la página. */
function recargarTienda(){
  aplicarCatalogoGuardado();
  productos = [...document.querySelectorAll('.producto')];
  filtrar();
}
window.recargarTienda = recargarTienda;

/* --- Punto de entrada que usa admin.js al crear o eliminar categorías ---
   Reconstruye la barra lateral y, si la categoría que estaba activa
   desapareció, vuelve automáticamente a "Todos". */
window.recargarCategorias = function(){
  aplicarCategoriasGuardadas();
  if(!panel.querySelector('button[data-filtro="' + categoriaActiva + '"]')){
    categoriaActiva = 'todos';
    botonesCat().forEach(b => b.classList.toggle('activa', b.dataset.filtro === 'todos'));
  }
  filtrar();
};

/* ============================================================
   MEJORAS DE EXPERIENCIA DE USUARIO
   ------------------------------------------------------------
   - Favoritos persistentes en el navegador.
   - Contador de resultados + botón para limpiar búsqueda.
   - Acceso rápido Ctrl/Cmd + K al buscador.
   - Vista rápida de producto.
   - Toasts discretos para confirmar acciones.
   - Botón volver arriba.
   - Aparición suave de tarjetas al entrar en pantalla.
   ============================================================ */
(function(){
  'use strict';

  const CLAVE_FAVORITOS = 'tienda_favoritos_v1';
  const lista = document.getElementById('listaProductos');
  const buscador = document.querySelector('.buscador');
  const campoBusqueda = document.getElementById('campoBusqueda');
  if(!lista || !buscador || !campoBusqueda) return;

  let favoritos = new Set();
  let soloFavoritos = false;

  function leerFavoritos(){
    try{
      const datos = JSON.parse(localStorage.getItem(CLAVE_FAVORITOS) || '[]');
      favoritos = new Set(Array.isArray(datos) ? datos.map(String) : []);
    }catch(e){ favoritos = new Set(); }
  }

  function guardarFavoritos(){
    try{ localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([...favoritos])); }
    catch(e){ /* si el almacenamiento falla, la sesión sigue funcionando */ }
  }

  function mostrarToast(mensaje){
    let toast = document.getElementById('toastTienda');
    if(!toast){
      toast = document.createElement('div');
      toast.id = 'toastTienda';
      toast.className = 'toast-tienda';
      toast.setAttribute('role','status');
      toast.setAttribute('aria-live','polite');
      document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  function obtenerDatosProducto(art){
    return {
      id: art.dataset.id || '',
      titulo: art.querySelector('h3')?.textContent.trim() || 'Producto',
      precio: art.querySelector('.precio')?.textContent.trim() || '',
      imagen: art.querySelector('.marco-imagen img')?.src || '',
      agotado: art.classList.contains('agotado'),
      caracteristicas: [...art.querySelectorAll('.caracteristicas li')].map(li => li.textContent.trim())
    };
  }

  function actualizarBotonFavorito(art){
    const btn = art.querySelector('.btn-favorito');
    if(!btn) return;
    const activo = favoritos.has(String(art.dataset.id || ''));
    btn.classList.toggle('activo', activo);
    btn.setAttribute('aria-pressed', String(activo));
    btn.setAttribute('aria-label', activo ? 'Quitar de favoritos' : 'Añadir a favoritos');
    btn.title = activo ? 'Quitar de favoritos' : 'Añadir a favoritos';
    btn.textContent = activo ? '♥' : '♡';
  }

  function esProductoOferta(art){
    if(!art) return false;
    const categorias = String(art.dataset.categoria || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return /(^|\s)ofert(?:a|as)?(?=\s|$)/.test(categorias) || categorias.includes('ofertas');
  }

  function actualizarEstadoOferta(art){
    if(!art) return false;
    const esOferta = esProductoOferta(art);
    art.classList.toggle('en-oferta', esOferta);
    art.dataset.oferta = esOferta ? 'true' : 'false';
    return esOferta;
  }

  function mejorarTarjeta(art){
    if(!art) return;
    actualizarEstadoOferta(art);
    if(art.dataset.mejorada === '1') return;
    art.dataset.mejorada = '1';

    if(!art.dataset.id){ art.dataset.id = 'p-' + Math.random().toString(36).slice(2,10); }
    actualizarEstadoOferta(art);

    const btnFav = document.createElement('button');
    btnFav.type = 'button';
    btnFav.className = 'btn-favorito';
    btnFav.dataset.favorito = art.dataset.id;
    btnFav.textContent = '♡';
    art.appendChild(btnFav);

    const btnVista = document.createElement('button');
    btnVista.type = 'button';
    btnVista.className = 'btn-vista-rapida';
    btnVista.innerHTML = '<span class="texto-detalles">Ver detalles</span><span class="icono-info" aria-hidden="true">i</span>';
    btnVista.dataset.vistaRapida = art.dataset.id;
    const fila = art.querySelector('.fila-precio');
    if(fila) fila.insertBefore(btnVista, fila.firstChild);
    else art.appendChild(btnVista);

    actualizarBotonFavorito(art);
  }

  function mejorarTodasLasTarjetas(){
    lista.querySelectorAll('.producto').forEach(mejorarTarjeta);
  }

  leerFavoritos();
  mejorarTodasLasTarjetas();

  /* Barra de utilidades del buscador */
  let utilidades = document.querySelector('.utilidades-buscador');
  if(!utilidades){
    utilidades = document.createElement('div');
    utilidades.className = 'utilidades-buscador';
    utilidades.innerHTML = `
      <span class="contador-resultados" id="contadorResultados" aria-live="polite"></span>
      <div class="acciones-buscador">
        <button type="button" class="btn-utilidad btn-favoritos-filtro" id="btnFavoritosFiltro" aria-pressed="false">♡ Favoritos <span id="contadorFavoritos">0</span></button>
        <button type="button" class="btn-utilidad btn-limpiar-busqueda" id="btnLimpiarBusqueda" hidden>Limpiar</button>
      </div>
    `;
    buscador.appendChild(utilidades);
  }

  const contadorResultados = document.getElementById('contadorResultados');
  const contadorFavoritos = document.getElementById('contadorFavoritos');
  const btnFavoritosFiltro = document.getElementById('btnFavoritosFiltro');
  const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
  if(!contadorResultados || !contadorFavoritos || !btnFavoritosFiltro || !btnLimpiarBusqueda) return;

  function actualizarFavoritosUI(){
    contadorFavoritos.textContent = String(favoritos.size);
    btnFavoritosFiltro.classList.toggle('activo', soloFavoritos);
    btnFavoritosFiltro.setAttribute('aria-pressed', String(soloFavoritos));
    btnFavoritosFiltro.firstChild.textContent = soloFavoritos ? '♥ Favoritos ' : '♡ Favoritos ';
    lista.querySelectorAll('.producto').forEach(actualizarBotonFavorito);
  }

  /* Envolvemos la función de filtrado existente para sumar favoritos y contador. */
  const filtrarOriginal = window.filtrar;
  function filtrarMejorado(){
    const texto = normalizarTexto(campoBusqueda.value.trim());
    let visibles = 0;
    const tarjetas = [...lista.querySelectorAll('.producto')];

    tarjetas.forEach(p => {
      const nombre = normalizarTexto((p.dataset.nombre || '') + ' ' + (p.querySelector('h3')?.textContent || ''));
      const coincideTexto = nombre.includes(texto);
      const categoriasProducto = (p.dataset.categoria || '').split(' ').filter(Boolean);
      const coincideCat = typeof categoriaActiva === 'undefined' || categoriaActiva === 'todos' || categoriasProducto.includes(categoriaActiva);
      const coincideFav = !soloFavoritos || favoritos.has(String(p.dataset.id || ''));
      const mostrar = coincideTexto && coincideCat && coincideFav;
      p.style.display = mostrar ? '' : 'none';
      if(mostrar) visibles++;
    });

    const aviso = document.getElementById('sinResultados');
    if(aviso){
      aviso.hidden = visibles > 0;
      if(visibles === 0){
        aviso.textContent = soloFavoritos
          ? 'Todavía no tienes productos favoritos. Pulsa ♡ en un producto para guardarlo aquí.'
          : (texto ? 'No encontramos productos con esa búsqueda. Prueba con otra palabra.' : 'No hay productos para mostrar.');
      }
    }

    contadorResultados.textContent = visibles === 1 ? '1 producto' : `${visibles} productos`;
    btnLimpiarBusqueda.hidden = !campoBusqueda.value;
  }

  /* La función global original sigue siendo útil para otras partes del sistema;
     aquí simplemente sustituimos los listeners que dependen del filtrado. */
  campoBusqueda.addEventListener('input', filtrarMejorado);

  btnLimpiarBusqueda.addEventListener('click', () => {
    campoBusqueda.value = '';
    campoBusqueda.focus();
    filtrarMejorado();
  });

  btnFavoritosFiltro.addEventListener('click', () => {
    soloFavoritos = !soloFavoritos;
    actualizarFavoritosUI();
    filtrarMejorado();
  });

  lista.addEventListener('click', e => {
    const btnFav = e.target.closest('.btn-favorito');
    if(btnFav){
      e.preventDefault();
      e.stopPropagation();
      const art = btnFav.closest('.producto');
      const id = String(art?.dataset.id || '');
      if(!id) return;
      if(favoritos.has(id)){
        favoritos.delete(id);
        mostrarToast('Producto quitado de favoritos');
      }else{
        favoritos.add(id);
        mostrarToast('Producto añadido a favoritos');
      }
      guardarFavoritos();
      actualizarFavoritosUI();
      filtrarMejorado();
      return;
    }

    const btnVista = e.target.closest('.btn-vista-rapida');
    if(btnVista){
      e.preventDefault();
      abrirVistaRapida(btnVista.closest('.producto'));
    }
  });

  /* Vista rápida */
  let modalVista = null;
  function crearModalVista(){
    if(modalVista) return modalVista;
    modalVista = document.createElement('div');
    modalVista.className = 'vista-rapida-fondo';
    modalVista.hidden = true;
    modalVista.innerHTML = `
      <div class="vista-rapida-caja" role="dialog" aria-modal="true" aria-labelledby="vistaRapidaTitulo">
        <button type="button" class="vista-rapida-cerrar" aria-label="Cerrar detalles">✕</button>
        <div class="vista-rapida-grid">
          <div class="vista-rapida-imagen"><img id="vistaRapidaImagen" alt=""></div>
          <div class="vista-rapida-info">
            <span class="vista-rapida-kicker">DETALLES DEL PRODUCTO</span>
            <h2 id="vistaRapidaTitulo"></h2>
            <div id="vistaRapidaPrecio" class="vista-rapida-precio"></div>
            <ul id="vistaRapidaCaracteristicas"></ul>
            <a id="vistaRapidaPedir" class="vista-rapida-pedir" target="_blank" rel="noopener">Pedir por WhatsApp</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalVista);
    modalVista.addEventListener('click', e => {
      if(e.target === modalVista || e.target.closest('.vista-rapida-cerrar')) cerrarVistaRapida();
    });
    return modalVista;
  }

  function abrirVistaRapida(art){
    if(!art) return;
    const datos = obtenerDatosProducto(art);
    const modal = crearModalVista();
    const imagen = document.getElementById('vistaRapidaImagen');
    const titulo = document.getElementById('vistaRapidaTitulo');
    const precio = document.getElementById('vistaRapidaPrecio');
    const listaCaract = document.getElementById('vistaRapidaCaracteristicas');
    const pedir = document.getElementById('vistaRapidaPedir');

    imagen.src = datos.imagen;
    imagen.alt = datos.titulo;
    titulo.textContent = datos.titulo;
    precio.textContent = datos.precio;
    listaCaract.replaceChildren(...datos.caracteristicas.map(c => {
      const li = document.createElement('li'); li.textContent = c; return li;
    }));
    pedir.textContent = datos.agotado ? 'Producto no disponible' : 'Pedir por WhatsApp';
    pedir.classList.toggle('disabled', datos.agotado);
    pedir.href = datos.agotado ? '#' : 'https://wa.me/50379011314?text=' + encodeURIComponent('Hola, quiero pedir ' + datos.titulo);
    const esOferta = esProductoOferta(art);
    // El efecto dorado pertenece al cuadro de detalles, no al fondo del modal.
    const caja = modal.querySelector('.vista-rapida-caja');
    caja?.classList.toggle('producto-en-oferta', esOferta);
    modal.classList.remove('producto-en-oferta');
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('visible'));
    document.body.classList.add('sin-scroll');
    modal.querySelector('.vista-rapida-cerrar')?.focus();
  }

  function cerrarVistaRapida(){
    if(!modalVista) return;
    modalVista.classList.remove('visible');
    setTimeout(() => { if(modalVista) modalVista.hidden = true; }, 180);
    document.body.classList.remove('sin-scroll');
  }

  document.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault(); campoBusqueda.focus(); campoBusqueda.select();
    }
    if(e.key === 'Escape') cerrarVistaRapida();
  });

  /* Volver arriba */
  const btnArriba = document.createElement('button');
  btnArriba.type = 'button';
  btnArriba.id = 'btnVolverArriba';
  btnArriba.className = 'btn-volver-arriba';
  btnArriba.setAttribute('aria-label','Volver arriba');
  btnArriba.title = 'Volver arriba';
  btnArriba.textContent = '↑';
  document.body.appendChild(btnArriba);
  btnArriba.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
  window.addEventListener('scroll', () => btnArriba.classList.toggle('visible', window.scrollY > 500), {passive:true});

  /* Aparición suave sin afectar a usuarios que prefieren menos movimiento. */
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window){
    const observador = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('entra-visible');
          observador.unobserve(entry.target);
        }
      });
    }, {threshold:.08});
    lista.querySelectorAll('.producto').forEach(p => {
      p.classList.add('entra-suave');
      observador.observe(p);
    });
  }

  /* Cuando el administrador reconstruye el catálogo, añadimos las mejoras a las nuevas tarjetas. */
  const recargarOriginal = window.recargarTienda;
  if(typeof recargarOriginal === 'function'){
    window.recargarTienda = function(){
      recargarOriginal();
      mejorarTodasLasTarjetas();
      actualizarFavoritosUI();
      filtrarMejorado();
    };
  }

  actualizarFavoritosUI();
  filtrarMejorado();
})();
