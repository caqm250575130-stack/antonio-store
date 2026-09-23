/* ============================================================
   TIENDA - MOTOR PÚBLICO RECREADO DESDE CERO
   ------------------------------------------------------------
   Las categorías son PÚBLICAS. No dependen del administrador.
   El administrador solamente modifica datos y requiere contraseña.
   ============================================================ */
(() => {
  'use strict';

  const KEY_CATALOG = 'tienda_catalogo_v2';
  const KEY_EXTRA_CATS = 'tienda_categorias_v2';
  const KEY_HIDDEN_CATS = 'tienda_categorias_ocultas_v2';
  const KEY_BACKGROUND = 'tienda_fondo_v2';

  const $ = id => document.getElementById(id);
  const panel = $('panelCategorias');
  const list = $('listaProductos');
  const search = $('campoBusqueda');
  const empty = $('sinResultados');
  const menu = $('btnMenu');
  const menuBg = $('fondoMenu');

  if (!panel || !list) return;

  const DEFAULT_CATEGORIES = [
    { valor: 'audifonos', texto: 'Audífonos' },
    { valor: 'utiles', texto: 'Útiles y arte' },
    { valor: 'ofertas', texto: 'Ofertas' },
    { valor: 'gadgets', texto: 'Gadgets' },
    { valor: 'accesorios', texto: 'Accesorios' },
    { valor: 'figuras', texto: 'Figuras' }
  ];

  let activeCategory = 'todos';
  let products = [];

  const safeJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  };

  const normalize = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const slug = value => normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || ('cat-' + Date.now());

  function readEmbedded(id) {
    try {
      const node = $(id);
      return node ? JSON.parse(node.textContent || '{}') : null;
    } catch (_) { return null; }
  }

  function getCategories() {
    const hidden = new Set(safeJSON(KEY_HIDDEN_CATS, []));
    const extra = safeJSON(KEY_EXTRA_CATS, []);
    const map = new Map(DEFAULT_CATEGORIES.map(c => [c.valor, c]));

    extra.forEach(c => {
      if (c && c.valor && c.texto) map.set(c.valor, c);
    });

    // El archivo publicado también puede contener categorías creadas desde el admin.
    const embedded = readEmbedded('datosPublicados');
    (embedded?.categorias || []).forEach(c => {
      if (c?.valor && c?.texto) map.set(c.valor, c);
    });

    return [...map.values()].filter(c => c.valor === 'todos' || !hidden.has(c.valor));
  }

  function getCatalog() {
    const embedded = readEmbedded('catalogoPublicado');
    const stored = safeJSON(KEY_CATALOG, null);
    let data = Array.isArray(stored) ? stored : (Array.isArray(embedded) ? embedded : null);

    if (!data) {
      data = [...list.querySelectorAll('.producto')].map(article => ({
        id: article.dataset.id || ('p-' + Math.random().toString(36).slice(2)),
        titulo: article.querySelector('h3')?.textContent.trim() || '',
        precio: parseFloat((article.querySelector('.precio')?.textContent || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0,
        caracteristicas: [...article.querySelectorAll('.caracteristicas li')].map(li => li.textContent.trim()),
        categorias: String(article.dataset.categoria || '').split(/[\s,]+/).filter(Boolean),
        imagen: article.querySelector('img')?.src || '',
        agotado: article.classList.contains('agotado'),
        publicado: true
      }));
    }

    return data.map(normalizeProduct).filter(p => p.publicado !== false);
  }

  function normalizeProduct(p) {
    const categories = Array.isArray(p.categorias)
      ? p.categorias
      : String(p.categoria || '').split(/[\s,]+/);
    return {
      id: p.id || ('p-' + Math.random().toString(36).slice(2)),
      titulo: String(p.titulo ?? p.nombre ?? ''),
      precio: Number(p.precio) || 0,
      caracteristicas: Array.isArray(p.caracteristicas) ? p.caracteristicas : [],
      categorias: categories.filter(Boolean).map(slug),
      imagen: String(p.imagen || ''),
      agotado: Boolean(p.agotado),
      publicado: p.publicado !== false
    };
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[c]));
  }

  function renderCategories() {
    panel.querySelectorAll('button[data-filtro]').forEach(btn => btn.remove());

    const fragment = document.createDocumentFragment();
    const all = document.createElement('button');
    all.type = 'button';
    all.dataset.filtro = 'todos';
    all.textContent = 'Todos';
    fragment.appendChild(all);

    getCategories().forEach(category => {
      if (category.valor === 'todos') return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.filtro = category.valor;
      btn.textContent = category.texto;
      fragment.appendChild(btn);
    });

    panel.appendChild(fragment);
    setActiveButton();
  }

  function renderProducts() {
    const existing = [...list.querySelectorAll('.producto')];
    existing.forEach(node => node.remove());

    const fragment = document.createDocumentFragment();
    products.forEach(p => {
      const article = document.createElement('article');
      article.className = 'producto' + (p.agotado || !p.imagen ? ' agotado' : '');
      article.dataset.id = p.id;
      article.dataset.categoria = p.categorias.join(' ');
      article.dataset.nombre = normalize(p.titulo);

      const frame = document.createElement('div');
      frame.className = 'marco-imagen';
      if (p.imagen) {
        const img = document.createElement('img');
        img.alt = p.titulo;
        img.src = p.imagen;
        frame.appendChild(img);
      }

      const h3 = document.createElement('h3');
      h3.textContent = p.titulo;
      const ul = document.createElement('ul');
      ul.className = 'caracteristicas';
      p.caracteristicas.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        ul.appendChild(li);
      });

      const row = document.createElement('div');
      row.className = 'fila-precio';
      const price = document.createElement('span');
      price.className = 'precio';
      price.textContent = '$' + p.precio.toFixed(2);
      row.appendChild(price);

      if (!p.agotado && p.imagen) {
        const link = document.createElement('a');
        link.className = 'btn-pedir';
        link.target = '_blank';
        link.rel = 'noopener';
        link.href = 'https://wa.me/50379011314?text=' + encodeURIComponent('Hola, quiero pedir ' + p.titulo);
        link.innerHTML = '<span>Pedir</span><span class="icono" aria-hidden="true">✓</span>';
        row.appendChild(link);
      } else {
        const note = document.createElement('span');
        note.className = 'agotado-texto';
        note.textContent = 'Producto agotado';
        row.appendChild(note);
      }

      article.append(frame, h3, ul, row);
      fragment.appendChild(article);
    });

    list.insertBefore(fragment, empty);
  }

  function setActiveButton() {
    panel.querySelectorAll('button[data-filtro]').forEach(btn => {
      btn.classList.toggle('activa', btn.dataset.filtro === activeCategory);
    });
  }

  function filterProducts() {
    const term = normalize(search?.value || '');
    let count = 0;

    products.forEach(p => {
      const article = list.querySelector('.producto[data-id="' + CSS.escape(p.id) + '"]');
      if (!article) return;
      const text = normalize(p.titulo + ' ' + p.caracteristicas.join(' '));
      const matchesText = !term || text.includes(term);
      const matchesCategory = activeCategory === 'todos' || p.categorias.includes(activeCategory);
      const visible = matchesText && matchesCategory;
      article.hidden = !visible;
      if (visible) count++;
    });

    if (empty) empty.hidden = count !== 0;
  }

  function selectCategory(category) {
    if (!panel.querySelector('button[data-filtro="' + CSS.escape(category) + '"]')) {
      category = 'todos';
    }
    activeCategory = category;
    setActiveButton();
    filterProducts();
    if (window.innerWidth <= 900) toggleMenu(false);
  }

  function toggleMenu(force) {
    if (!menu || !menuBg) return;
    const open = force ?? !panel.classList.contains('abierta');
    panel.classList.toggle('abierta', open);
    menuBg.classList.toggle('visible', open);
    menu.setAttribute('aria-expanded', String(open));
  }

  // Categorías: evento delegado independiente del administrador.
  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-filtro]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    selectCategory(button.dataset.filtro);
  });

  menu?.addEventListener('click', () => toggleMenu());
  menuBg?.addEventListener('click', () => toggleMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') toggleMenu(false);
  });
  search?.addEventListener('input', filterProducts);

  window.tienda = {
    getCatalog: () => products.map(p => ({...p, categorias: [...p.categorias]})),
    getCategories,
    refresh() {
      products = getCatalog();
      renderCategories();
      renderProducts();
      filterProducts();
    },
    resetCategories() {
      localStorage.removeItem(KEY_EXTRA_CATS);
      localStorage.removeItem(KEY_HIDDEN_CATS);
      activeCategory = 'todos';
      renderCategories();
      filterProducts();
    },
    setBackground(data) {
      document.body.style.backgroundImage = data ? `url(${data})` : '';
    },
    keys: { KEY_CATALOG, KEY_EXTRA_CATS, KEY_HIDDEN_CATS, KEY_BACKGROUND }
  };

  // Limpia cualquier estado visual temporal que pudiera haber quedado guardado.
  $('modalPassFondo')?.classList.remove('visible');
  $('modalAdminFondo')?.classList.remove('visible');
  panel.classList.remove('abierta');
  menuBg?.classList.remove('visible');
  menu?.setAttribute('aria-expanded', 'false');

  const embedded = readEmbedded('datosPublicados');
  if (embedded?.fondo) window.tienda.setBackground(embedded.fondo);
  else {
    const background = safeJSON(KEY_BACKGROUND, '');
    if (background) window.tienda.setBackground(background);
  }

  products = getCatalog();
  renderCategories();
  renderProducts();
  filterProducts();
})();
