/* ============================================================
   ADMINISTRADOR - RECREADO DESDE CERO
   ------------------------------------------------------------
   Único acceso protegido: contraseña.
   Las categorías públicas NO pasan por este control.
   ============================================================ */
(() => {
  'use strict';

  const PASSWORD = 'cris_2307';
  const CATALOG_KEY = 'tienda_catalogo_v2';
  const EXTRA_KEY = 'tienda_categorias_v2';
  const HIDDEN_KEY = 'tienda_categorias_ocultas_v2';
  const BACKGROUND_KEY = 'tienda_fondo_v2';

  const $ = id => document.getElementById(id);
  const btnAdmin = $('btnAdmin');
  const passModal = $('modalPassFondo');
  const adminModal = $('modalAdminFondo');
  const passField = $('campoPass');
  const passError = $('errorPass');
  const passEnter = $('btnPassEntrar');
  const passCancel = $('btnPassCancelar');
  const closeAdmin = $('btnCerrarAdmin');
  const form = $('formAdmin');
  const title = $('tituloFormAdmin');
  const editId = $('campoIdEdicion');
  const imageField = $('campoImagen');
  const imagePreview = $('previaImagen');
  const removeImage = $('btnQuitarImagen');
  const noImageNote = $('notaSinImagen');
  const nameField = $('campoNombre');
  const priceField = $('campoPrecio');
  const featuresField = $('campoCaract');
  const categoriesBox = $('listaCategoriasCheck');
  const adminList = $('listaAdminProductos');
  const cancelForm = $('btnCancelarForm');
  const downloadBtn = $('btnDescargarIndex');
  const newCatField = $('campoNuevaCategoria');
  const addCatBtn = $('btnAnadirCategoria');
  const bgField = $('campoFondoAdmin');
  const bgPreview = $('previaFondoAdmin');
  const saveBg = $('btnGuardarFondo');
  const resetBg = $('btnRestablecerFondo');

  let session = false;
  let currentImage = '';
  let pendingBackground = '';

  const DEFAULT_CATEGORIES = [
    { valor: 'audifonos', texto: 'Audífonos' },
    { valor: 'utiles', texto: 'Útiles y arte' },
    { valor: 'ofertas', texto: 'Ofertas' },
    { valor: 'gadgets', texto: 'Gadgets' },
    { valor: 'accesorios', texto: 'Accesorios' },
    { valor: 'figuras', texto: 'Figuras' }
  ];

  const normalize = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const slug = value => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getCategories() {
    const extra = read(EXTRA_KEY, []);
    const hidden = new Set(read(HIDDEN_KEY, []));
    const map = new Map(DEFAULT_CATEGORIES.map(c => [c.valor, c]));
    extra.forEach(c => { if (c?.valor && c?.texto) map.set(c.valor, c); });
    return [...map.values()].filter(c => !hidden.has(c.valor));
  }

  function catalogFromHTML() {
    return [...document.querySelectorAll('#listaProductos .producto')].map((article, index) => ({
      id: article.dataset.id || ('p' + (index + 1)),
      titulo: article.querySelector('h3')?.textContent.trim() || '',
      precio: Number((article.querySelector('.precio')?.textContent || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0,
      caracteristicas: [...article.querySelectorAll('.caracteristicas li')].map(li => li.textContent.trim()),
      categorias: String(article.dataset.categoria || '').split(/[\s,]+/).filter(Boolean),
      imagen: article.querySelector('img')?.src || '',
      agotado: article.classList.contains('agotado'),
      publicado: true
    }));
  }

  function getCatalog() {
    const saved = read(CATALOG_KEY, null);
    if (Array.isArray(saved)) return saved;
    return catalogFromHTML();
  }

  function saveCatalog(catalog) {
    write(CATALOG_KEY, catalog);
  }

  function showModal(modal) {
    modal?.classList.add('visible');
  }

  function hideModal(modal) {
    modal?.classList.remove('visible');
  }

  function openPassword() {
    passField.value = '';
    passError.hidden = true;
    showModal(passModal);
    setTimeout(() => passField.focus(), 50);
  }

  function openAdmin() {
    hideModal(passModal);
    session = true;
    showModal(adminModal);
    drawCategories();
    drawProducts();
    resetForm();
    loadBackgroundPreview();
  }

  function closeAdminPanel() {
    hideModal(adminModal);
    session = false;
    resetForm();
  }

  btnAdmin?.addEventListener('click', event => {
    event.preventDefault();
    if (session) openAdmin();
    else openPassword();
  });

  passCancel?.addEventListener('click', () => hideModal(passModal));
  passEnter?.addEventListener('click', checkPassword);
  passField?.addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });
  closeAdmin?.addEventListener('click', closeAdminPanel);
  passModal?.addEventListener('click', e => { if (e.target === passModal) hideModal(passModal); });
  adminModal?.addEventListener('click', e => { if (e.target === adminModal) closeAdminPanel(); });

  function checkPassword() {
    if (passField.value === PASSWORD) openAdmin();
    else {
      passError.hidden = false;
      passField.select();
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (adminModal?.classList.contains('visible')) closeAdminPanel();
      else hideModal(passModal);
    }
  });

  function drawCategories(selected = []) {
    if (!categoriesBox) return;
    categoriesBox.innerHTML = '';
    getCategories().forEach(category => {
      const row = document.createElement('span');
      row.className = 'fila-categoria';
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = category.valor;
      input.checked = selected.includes(category.valor);
      label.append(input, document.createTextNode(category.texto));
      row.appendChild(label);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-quitar-cat';
      remove.textContent = '✕';
      remove.title = 'Eliminar la categoría ' + category.texto;
      remove.addEventListener('click', () => removeCategory(category.valor, category.texto));
      row.appendChild(remove);
      categoriesBox.appendChild(row);
    });
  }

  function drawProducts() {
    if (!adminList) return;
    const catalog = getCatalog();
    adminList.innerHTML = '';

    catalog.filter(p => p.publicado !== false).forEach(product => {
      const row = document.createElement('div');
      row.className = 'fila-admin-producto';
      row.innerHTML = '<strong></strong><span></span><div class="acciones-admin"></div>';
      row.querySelector('strong').textContent = product.titulo;
      row.querySelector('span').textContent = '$' + Number(product.precio || 0).toFixed(2) + ' · ' + (product.categorias || []).join(', ');
      const actions = row.querySelector('.acciones-admin');

      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'btn-secundario'; edit.textContent = 'Editar';
      edit.addEventListener('click', () => editProduct(product.id));
      actions.appendChild(edit);

      const del = document.createElement('button');
      del.type = 'button'; del.className = 'btn-secundario'; del.textContent = 'Eliminar';
      del.addEventListener('click', () => deleteProduct(product.id));
      actions.appendChild(del);

      adminList.appendChild(row);
    });
  }

  function resetForm() {
    form?.reset();
    if (editId) editId.value = '';
    if (title) title.textContent = 'Agregar producto';
    currentImage = '';
    if (imagePreview) imagePreview.src = '';
    if (imagePreview) imagePreview.hidden = true;
    if (noImageNote) noImageNote.hidden = false;
    drawCategories([]);
  }

  function editProduct(id) {
    const product = getCatalog().find(p => p.id === id);
    if (!product) return;
    editId.value = product.id;
    title.textContent = 'Editar producto';
    nameField.value = product.titulo || '';
    priceField.value = product.precio ?? '';
    featuresField.value = (product.caracteristicas || []).join('\n');
    currentImage = product.imagen || '';
    if (imagePreview) { imagePreview.src = currentImage; imagePreview.hidden = !currentImage; }
    if (noImageNote) noImageNote.hidden = Boolean(currentImage);
    drawCategories(product.categorias || []);
    form?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  cancelForm?.addEventListener('click', resetForm);
  removeImage?.addEventListener('click', () => {
    currentImage = '';
    imageField.value = '';
    if (imagePreview) imagePreview.hidden = true;
    if (noImageNote) noImageNote.hidden = false;
  });

  imageField?.addEventListener('change', () => {
    const file = imageField.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentImage = reader.result;
      if (imagePreview) { imagePreview.src = currentImage; imagePreview.hidden = false; }
      if (noImageNote) noImageNote.hidden = true;
    };
    reader.readAsDataURL(file);
  });

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const titleValue = nameField.value.trim();
    const priceValue = Number(priceField.value);
    const categories = [...categoriesBox.querySelectorAll('input:checked')].map(input => input.value);
    if (!titleValue) return alert('Escribe el nombre del producto.');
    if (!Number.isFinite(priceValue) || priceValue < 0) return alert('Escribe un precio válido.');
    if (!categories.length) return alert('Selecciona al menos una categoría.');

    const catalog = getCatalog();
    const product = {
      id: editId.value || ('p' + Date.now().toString(36)),
      titulo: titleValue,
      precio: priceValue,
      caracteristicas: featuresField.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean),
      categorias: [...new Set(categories)],
      imagen: currentImage,
      agotado: !currentImage,
      publicado: true
    };

    const index = catalog.findIndex(p => p.id === product.id);
    if (index >= 0) catalog[index] = {...catalog[index], ...product};
    else catalog.unshift(product);
    saveCatalog(catalog);
    resetForm();
    drawProducts();
    window.tienda?.refresh();
  });

  function editCategoryValuesAfterRemoval(value) {
    const catalog = getCatalog();
    catalog.forEach(product => {
      product.categorias = (product.categorias || []).filter(c => c !== value);
    });
    saveCatalog(catalog);
  }

  function removeCategory(value, text) {
    if (!confirm('¿Eliminar la categoría "' + text + '"? Los productos conservarán sus datos, pero dejarán de pertenecer a esta categoría.')) return;
    editCategoryValuesAfterRemoval(value);
    const extra = read(EXTRA_KEY, []).filter(c => c.valor !== value);
    write(EXTRA_KEY, extra);
    const hidden = read(HIDDEN_KEY, []);
    if (DEFAULT_CATEGORIES.some(c => c.valor === value) && !hidden.includes(value)) hidden.push(value);
    write(HIDDEN_KEY, hidden);
    drawCategories([]);
    drawProducts();
    window.tienda?.refresh();
  }

  addCatBtn?.addEventListener('click', () => {
    const text = newCatField.value.trim();
    const value = slug(text);
    if (!text || !value) return;
    const categories = getCategories();
    if (categories.some(c => c.valor === value)) return alert('Esa categoría ya existe.');
    const extra = read(EXTRA_KEY, []);
    extra.push({valor:value, texto:text});
    write(EXTRA_KEY, extra);
    const hidden = read(HIDDEN_KEY, []).filter(v => v !== value);
    write(HIDDEN_KEY, hidden);
    newCatField.value = '';
    drawCategories([]);
    window.tienda?.refresh();
  });

  // Reinicia SOLAMENTE la configuración de categorías a los valores originales.
  function resetCategories() {
    if (!confirm('¿Restablecer las categorías originales? Se quitarán las categorías creadas y volverán a aparecer las categorías iniciales.')) return;
    localStorage.removeItem(EXTRA_KEY);
    localStorage.removeItem(HIDDEN_KEY);
    drawCategories([]);
    drawProducts();
    window.tienda?.resetCategories();
    alert('Las categorías fueron restablecidas a sus valores originales.');
  }

  // El botón se crea aquí para no alterar el diseño del HTML original.
  if (addCatBtn?.parentElement && !document.getElementById('btnResetCategorias')) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.id = 'btnResetCategorias';
    reset.className = 'btn-secundario';
    reset.textContent = 'Restablecer categorías';
    reset.addEventListener('click', resetCategories);
    addCatBtn.parentElement.appendChild(reset);
  }

  async function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  bgField?.addEventListener('change', async () => {
    const file = bgField.files?.[0];
    if (!file) return;
    pendingBackground = await readFileAsDataURL(file);
    if (bgPreview) { bgPreview.src = pendingBackground; bgPreview.hidden = false; }
  });

  function loadBackgroundPreview() {
    const background = localStorage.getItem(BACKGROUND_KEY) || '';
    pendingBackground = background;
    if (bgPreview) { bgPreview.src = background; bgPreview.hidden = !background; }
  }

  saveBg?.addEventListener('click', () => {
    if (pendingBackground) localStorage.setItem(BACKGROUND_KEY, pendingBackground);
    window.tienda?.setBackground(pendingBackground);
    alert('Fondo guardado.');
  });

  resetBg?.addEventListener('click', () => {
    localStorage.removeItem(BACKGROUND_KEY);
    pendingBackground = '';
    if (bgPreview) { bgPreview.src = ''; bgPreview.hidden = true; }
    window.tienda?.setBackground('');
  });

  function escapeScript(value) {
    return JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
  }

  downloadBtn?.addEventListener('click', () => {
    const catalog = getCatalog().filter(p => p.publicado !== false);
    const data = {
      categorias: read(EXTRA_KEY, []),
      categoriasOcultas: read(HIDDEN_KEY, []),
      fondo: localStorage.getItem(BACKGROUND_KEY) || ''
    };

    // Nunca serializar estados temporales del administrador.
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('#modalPassFondo, #modalAdminFondo').forEach(modal => modal.classList.remove('visible'));
    clone.querySelector('#panelCategorias')?.classList.remove('abierta');
    clone.querySelector('#fondoMenu')?.classList.remove('visible');
    clone.querySelector('#btnMenu')?.setAttribute('aria-expanded', 'false');

    // El archivo descargado comienza como una tienda pública.
    clone.querySelector('#btnAdmin')?.removeAttribute('data-admin-abierto');

    const replaceJSON = (id, value) => {
      const node = clone.querySelector('#' + id);
      if (node) node.textContent = JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
    };
    replaceJSON('catalogoPublicado', catalog);
    replaceJSON('datosPublicados', data);

    const html = '<!DOCTYPE html>\n' + clone.outerHTML;
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // Garantía: al cargar desde cero, ningún modal queda abierto.
  hideModal(passModal);
  hideModal(adminModal);
  session = false;
})();
