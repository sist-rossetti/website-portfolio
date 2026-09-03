/* ============================================================
   Comportamiento del sitio público
   1. Pestañas (con dirección de entrada) e indicador deslizante
   2. Apariciones al hacer scroll + contadores
   3. Formulario → tabla "consultas" en Supabase
   ============================================================ */
(function () {
  'use strict';

  var ORDER = ['inicio', 'servicios', 'portafolio', 'contacto'];
  var indicator, current = 'inicio';

  function paneles(id) { return document.querySelector('[data-panel="' + id + '"]'); }
  function pestañas() { return Array.prototype.slice.call(document.querySelectorAll('.tab')); }

  /* ---------- 1. Pestañas ---------- */
  function moverIndicador() {
    indicator = indicator || document.querySelector('.tab-indicator');
    var btn = pestañas().filter(function (t) { return t.dataset.tab === current; })[0];
    if (!btn || !indicator) return;
    indicator.style.left = btn.offsetLeft + 'px';
    indicator.style.width = btn.offsetWidth + 'px';
  }

  function mostrar(id, empujar) {
    var destino = paneles(id);
    if (!destino || !destino.dataset.disponible) return;
    if (id === current) { window.scrollTo(0, 0); return; }

    var adelante = ORDER.indexOf(id) >= ORDER.indexOf(current);
    var actual = paneles(current);
    if (actual) {
      actual.classList.remove('is-visible', 'enter-right', 'enter-left');
      actual.hidden = true;
    }
    destino.hidden = false;
    destino.classList.add('is-visible', adelante ? 'enter-right' : 'enter-left');

    pestañas().forEach(function (t) {
      var on = t.dataset.tab === id;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });

    current = id;
    moverIndicador();
    prepararApariciones();
    window.scrollTo(0, 0);
    if (empujar !== false) history.replaceState(null, '', '#' + id);
  }

  document.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (tab) { mostrar(tab.dataset.tab); return; }
    var link = e.target.closest('[data-tab-link]');
    if (link) { e.preventDefault(); mostrar(link.dataset.tabLink); }
  });
  window.addEventListener('resize', moverIndicador);

  /* ---------- 2. Apariciones y contadores ---------- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.style.opacity = '1';
        el.style.transform = 'none';
        if (el.hasAttribute('data-count')) contar(el);
        el.querySelectorAll('[data-count]').forEach(contar);
        io.unobserve(el);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  }

  function prepararApariciones() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.dataset.revealReady) return;
      el.dataset.revealReady = '1';
      if (!io) return;
      var tipo = el.getAttribute('data-reveal');
      var d = parseFloat(el.getAttribute('data-reveal-delay') || 0);
      el.style.opacity = '0';
      el.style.transform =
        tipo === 'left' ? 'translateX(-34px)' :
        tipo === 'right' ? 'translateX(34px)' : 'translateY(28px)';
      el.style.transition =
        'opacity .65s cubic-bezier(.2,.75,.3,1) ' + d + 's, ' +
        'transform .8s cubic-bezier(.2,.75,.3,1) ' + d + 's';
      io.observe(el);
    });
  }

  function contar(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var to = parseFloat(el.getAttribute('data-count'));
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    var t0 = performance.now(), dur = 1000;
    function paso(ahora) {
      var p = Math.min(1, (ahora - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(to * e) + suf;
      if (p < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  /* ---------- 3. Formulario ---------- */
  function conectarFormulario() {
    var form = document.getElementById('contact-form');
    if (!form || form.dataset.listo) return;
    form.dataset.listo = '1';

    var tarjeta = document.getElementById('sent-card');
    var nombreEnviado = document.getElementById('sent-name');
    var error = document.getElementById('form-error');

    document.getElementById('needs').addEventListener('click', function (e) {
      var b = e.target.closest('.need');
      if (!b) return;
      b.classList.toggle('is-on');
      b.setAttribute('aria-pressed', b.classList.contains('is-on') ? 'true' : 'false');
    });

    function seleccionadas() {
      return Array.prototype.slice
        .call(document.querySelectorAll('.need.is-on'))
        .map(function (b) { return b.textContent.trim(); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (error) error.hidden = true;

      var nombre = form.nombre.value.trim();
      var correo = form.correo.value.trim();
      if (!nombre || !correo) {
        if (error) { error.textContent = 'Por favor complete su nombre y su correo.'; error.hidden = false; }
        return;
      }

      var boton = form.querySelector('[type="submit"]');
      var etiqueta = boton ? boton.textContent : '';
      if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }

      var cliente = window.SITIO && window.SITIO.cliente;
      var fila = {
        nombre: nombre,
        empresa: form.empresa.value.trim(),
        correo: correo,
        telefono: form.telefono.value.trim(),
        necesita: seleccionadas(),
        mensaje: form.mensaje.value.trim(),
        origen: location.href
      };

      function exito() {
        nombreEnviado.textContent = nombre;
        form.hidden = true;
        tarjeta.hidden = false;
      }
      function fallo() {
        if (error) {
          error.textContent = 'No pudimos enviar el mensaje. Escríbanos por WhatsApp o inténtelo de nuevo.';
          error.hidden = false;
        }
      }
      function restaurar() {
        if (boton) { boton.disabled = false; boton.textContent = etiqueta; }
      }

      if (!cliente) {
        // Conexión sin configurar: no mentimos al visitante, le damos una vía directa.
        var c = window.SITIO && window.SITIO.contenido;
        var wa = c && c.contacto && c.contacto.whatsapp;
        var correoDestino = (c && c.contacto && c.contacto.correo) || '';
        if (error) {
          error.textContent = '';
          error.appendChild(document.createTextNode('El formulario todavía no está conectado. Escríbanos '));
          if (wa) {
            var enlaceWa = document.createElement('a');
            enlaceWa.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(
              'Hola, soy ' + nombre + '. ' + (fila.mensaje || '')
            );
            enlaceWa.target = '_blank';
            enlaceWa.rel = 'noopener';
            enlaceWa.textContent = 'por WhatsApp';
            error.appendChild(enlaceWa);
            error.appendChild(document.createTextNode(' o '));
          }
          var enlaceMail = document.createElement('a');
          enlaceMail.href = 'mailto:' + correoDestino +
            '?subject=' + encodeURIComponent('Consulta de ' + nombre) +
            '&body=' + encodeURIComponent(fila.mensaje || '');
          enlaceMail.textContent = 'a ' + correoDestino;
          error.appendChild(enlaceMail);
          error.appendChild(document.createTextNode('.'));
          error.hidden = false;
        }
        restaurar();
        return;
      }

      cliente.from('consultas').insert(fila)
        .then(function (r) { if (r.error) throw r.error; exito(); })
        .catch(fallo)
        .then(restaurar, restaurar);
    });

    var otra = document.getElementById('send-again');
    if (otra) {
      otra.addEventListener('click', function () {
        form.reset();
        document.querySelectorAll('.need.is-on').forEach(function (b) {
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed', 'false');
        });
        tarjeta.hidden = true;
        form.hidden = false;
      });
    }
  }

  /* ---------- Arranque ---------- */
  document.addEventListener('sitio:pintado', function () {
    prepararApariciones();
    moverIndicador();
    conectarFormulario();
    var actual = document.querySelector('.tab[data-tab="' + current + '"]');
    if (actual) actual.classList.add('is-active');
  });

  window.SITIO.iniciar();

  var hash = (location.hash || '').replace('#', '');
  if (ORDER.indexOf(hash) > 0) mostrar(hash, false);
  window.addEventListener('load', moverIndicador);
})();
