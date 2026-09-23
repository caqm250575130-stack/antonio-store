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
    if(guardado) {
      document.documentElement.style.setProperty('--fondo-img', 'url("' + guardado + '")');
      return;
    }
  } catch(e){}
  try {
    const datos = document.getElementById('datosPublicados');
    if(datos){
      const obj = JSON.parse(datos.textContent || '{}');
      if(obj.fondo) document.documentElement.style.setProperty('--fondo-img', 'url("' + obj.fondo + '")');
    }
  } catch(e){}
}
aplicarFondoGuardado();

function leerCatalogoGuardado(){
  try {
    const local = localStorage.getItem(CLAVE_CATALOGO);
    if(local) return JSON.parse(local);
  } catch(e){}
  try {
    const bloque = document.getElementById('catalogoPublicado');
    if(bloque && bloque.textContent.trim() && bloque.textContent.trim() !== 'null'){
      return JSON.parse(bloque.textContent);
    }
  } catch(e){}
  return null;
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
  try {
    const local = localStorage.getItem(CLAVE_CATEGORIAS);
    if(local) return JSON.parse(local) || [];
  } catch(e){}
  try {
    const datos = document.getElementById('datosPublicados');
    if(datos){
      const obj = JSON.parse(datos.textContent || '{}');
      return obj.categorias || [];
    }
  } catch(e){}
  return [];
}

function leerCategoriasOcultas(){
  try {
    const local = localStorage.getItem(CLAVE_CAT_OCULTAS);
    if(local) return JSON.parse(local) || [];
  } catch(e){}
  try {
    const datos = document.getElementById('datosPublicados');
    if(datos){
      const obj = JSON.parse(datos.textContent || '{}');
      return obj.categoriasOcultas || [];
    }
  } catch(e){}
  return [];
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
