/* ============================================================
   BIENVENIDA CON FUEGOS ARTIFICIALES
   ------------------------------------------------------------
   Al hacer clic en el logo negro del encabezado aparece una
   capa oscura con el mensaje "Antonio's Store" y debajo "Calidad y Confiabilidad"
   y fuegos artificiales dibujados en un canvas.
   Se cierra solo a los ~5 segundos, o antes si se hace clic
   o se pulsa Escape.
   ============================================================ */
(function(){
'use strict';

const logo   = document.querySelector('.logo');
const capa   = document.getElementById('capaBienvenida');
const lienzo = document.getElementById('lienzoFuegos');
if(!logo || !capa || !lienzo) return;

const ctx = lienzo.getContext('2d');
const menosAnimacion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORES  = ['#25f4ee','#e1306c','#ffd166','#25d366','#8a7bff','#ffffff','#ff7b39','#2f4fbd'];
const DURACION = 5000;   // milisegundos que dura el espectáculo

let particulas = [];
let animando   = false;
let idCuadro   = 0;
let idLanzador = 0;
let idCierre   = 0;

/* ---------- Ajusta el canvas al tamaño real de la pantalla ---------- */
function ajustarLienzo(){
  const escala = window.devicePixelRatio || 1;
  lienzo.width  = Math.floor(window.innerWidth  * escala);
  lienzo.height = Math.floor(window.innerHeight * escala);
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
}

/* ---------- Una explosión: muchas chispas saliendo de un punto ---------- */
function explotar(x, y){
  const color = COLORES[Math.floor(Math.random() * COLORES.length)];
  const total = 46 + Math.floor(Math.random() * 30);
  for(let i = 0; i < total; i++){
    const angulo = (Math.PI * 2 * i) / total + Math.random() * 0.25;
    const rapidez = 2 + Math.random() * 4.5;
    particulas.push({
      x, y,
      vx: Math.cos(angulo) * rapidez,
      vy: Math.sin(angulo) * rapidez,
      vida: 1,
      desgaste: 0.008 + Math.random() * 0.012,
      radio: 1.5 + Math.random() * 2,
      color: Math.random() < 0.15 ? '#ffffff' : color
    });
  }
}

/* Lanza una explosión en un punto al azar de la mitad superior */
function explosionAlAzar(){
  const x = window.innerWidth  * (0.12 + Math.random() * 0.76);
  const y = window.innerHeight * (0.12 + Math.random() * 0.45);
  explotar(x, y);
}

/* ---------- Dibujo cuadro a cuadro ---------- */
function cuadro(){
  const an = window.innerWidth, al = window.innerHeight;

  // velo semitransparente: deja estela detrás de las chispas
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(3,4,10,.22)';
  ctx.fillRect(0, 0, an, al);

  ctx.globalCompositeOperation = 'lighter';
  for(const p of particulas){
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.045;          // gravedad
    p.vx *= 0.99;
    p.vy *= 0.99;           // rozamiento del aire
    p.vida -= p.desgaste;
    if(p.vida <= 0) continue;

    ctx.globalAlpha = Math.max(0, p.vida);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radio * p.vida + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  particulas = particulas.filter(p => p.vida > 0);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if(animando) idCuadro = requestAnimationFrame(cuadro);
}

/* ---------- Abrir y cerrar ---------- */
function abrirBienvenida(){
  if(capa.classList.contains('visible')) return;

  capa.hidden = false;
  // forzar reflow para que la transición de opacidad se note
  void capa.offsetWidth;
  capa.classList.add('visible');

  if(!menosAnimacion){
    ajustarLienzo();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particulas = [];
    animando = true;
    idCuadro = requestAnimationFrame(cuadro);

    // primeras explosiones escalonadas
    explosionAlAzar();
    setTimeout(explosionAlAzar, 220);
    setTimeout(explosionAlAzar, 460);
    idLanzador = setInterval(explosionAlAzar, 520);
  }

  idCierre = setTimeout(cerrarBienvenida, DURACION);
}

function cerrarBienvenida(){
  if(!capa.classList.contains('visible')) return;

  clearTimeout(idCierre);
  clearInterval(idLanzador);
  capa.classList.remove('visible');

  setTimeout(() => {
    animando = false;
    cancelAnimationFrame(idCuadro);
    particulas = [];
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    capa.hidden = true;
  }, 460);   // espera a que termine el desvanecido
}

/* ---------- Eventos ---------- */
logo.addEventListener('click', abrirBienvenida);
logo.addEventListener('keydown', e => {
  if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrirBienvenida(); }
});
capa.addEventListener('click', cerrarBienvenida);
document.addEventListener('keydown', e => { if(e.key === 'Escape') cerrarBienvenida(); });
window.addEventListener('resize', () => { if(animando) ajustarLienzo(); });

})();
