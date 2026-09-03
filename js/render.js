/* ============================================================
   Dibuja el sitio a partir del documento de contenido.
   1. Usa CONTENIDO_DEFECTO para pintar de inmediato.
   2. Consulta la base y, si hay contenido guardado, repinta.
   ============================================================ */
window.SITIO = (function () {
  'use strict';

  var contenido = null;

  /* -------- utilidades -------- */
  function el(tag, cls, texto) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function ruta(obj, camino) {
    return camino.split('.').reduce(function (o, k) {
      return (o == null) ? undefined : o[k];
    }, obj);
  }
  function vaciar(nodo) { while (nodo && nodo.firstChild) nodo.removeChild(nodo.firstChild); }
  function nodo(id) { return document.getElementById(id); }

  /* -------- fusión con los valores por defecto -------- */
  function fusionar(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    if (Array.isArray(extra)) return extra;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(extra).forEach(function (k) {
      var b = base ? base[k] : undefined;
      var e = extra[k];
      out[k] = (e && typeof e === 'object' && !Array.isArray(e)) ? fusionar(b || {}, e) : e;
    });
    return out;
  }

  /* -------- 1. tema: colores y tipografías -------- */
  var RAMPA = {
    100: 0.82, 200: 0.62, 300: 0.40, 400: 0.20,
    500: 0, 600: -0.16, 700: -0.32, 800: -0.48, 900: -0.62
  };
  function hexARgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbAHex(r) {
    return '#' + r.map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }
  function mezclar(hex, factor) {
    var c = hexARgb(hex);
    var objetivo = factor > 0 ? 255 : 0;
    var t = Math.abs(factor);
    return rgbAHex(c.map(function (v) { return v + (objetivo - v) * t; }));
  }
  function aplicarTema(t) {
    var raiz = document.documentElement;
    if (t.acento) {
      raiz.style.setProperty('--color-accent', t.acento);
      Object.keys(RAMPA).forEach(function (paso) {
        var v = RAMPA[paso] === 0 ? t.acento : mezclar(t.acento, RAMPA[paso]);
        raiz.style.setProperty('--color-accent-' + paso, v);
        raiz.style.setProperty('--color-accent-2-' + paso, v);
      });
      raiz.style.setProperty('--color-accent-2', t.acento);
    }
    if (t.fondo) raiz.style.setProperty('--color-bg', t.fondo);

    var familias = [t.tipografiaTitulos, t.tipografiaTexto].filter(Boolean);
    if (familias.length) {
      var unicas = familias.filter(function (f, i) { return familias.indexOf(f) === i; });
      var href = 'https://fonts.googleapis.com/css2?' + unicas.map(function (f) {
        return 'family=' + f.replace(/ /g, '+') + ':wght@400;500;600';
      }).join('&') + '&display=swap';
      var link = nodo('fuentes');
      if (link && link.href !== href) link.href = href;
      raiz.style.setProperty('--font-heading', '"' + t.tipografiaTitulos + '", system-ui, sans-serif');
      raiz.style.setProperty('--font-body', '"' + t.tipografiaTexto + '", system-ui, sans-serif');
    }
  }

  /* -------- 2. textos por data-k -------- */
  function aplicarTextos(c) {
    document.querySelectorAll('[data-k]').forEach(function (n) {
      var v = ruta(c, n.getAttribute('data-k'));
      if (v == null) return;
      if (String(v).indexOf('\n') !== -1) {
        vaciar(n);
        String(v).split('\n').forEach(function (linea, i) {
          if (i) n.appendChild(document.createElement('br'));
          n.appendChild(document.createTextNode(linea));
        });
      } else {
        n.textContent = v;
      }
    });
  }

  /* -------- 3. cabecera, navegación, pie -------- */
  function aplicarChrome(c) {
    document.title = c.meta.titulo;
    var d = nodo('meta-desc'); if (d) d.content = c.meta.descripcion || '';
    var ot = nodo('meta-og-title'); if (ot) ot.content = c.meta.titulo || '';
    var od = nodo('meta-og-desc'); if (od) od.content = c.meta.descripcion || '';
    var oi = nodo('meta-og-image'); if (oi) oi.content = c.meta.ogImagen || '';

    nodo('brand-name').textContent = c.marca.nombre;
    var marca = nodo('brand-mark');
    var logo = nodo('brand-logo');
    if (c.marca.logoUrl) {
      logo.src = c.marca.logoUrl; logo.alt = c.marca.nombre; logo.hidden = false; marca.hidden = true;
    } else {
      marca.textContent = c.marca.simbolo || '◆'; marca.hidden = false; logo.hidden = true;
    }
    nodo('header-cta').textContent = c.botonCabecera;

    var tabs = nodo('tabs');
    var indicador = tabs.querySelector('.tab-indicator');
    Array.prototype.slice.call(tabs.querySelectorAll('.tab')).forEach(function (t) { t.remove(); });
    c.navegacion.filter(function (t) { return t.visible; }).forEach(function (t) {
      var b = el('button', 'tab', t.etiqueta);
      b.dataset.tab = t.id;
      tabs.insertBefore(b, indicador);
      var panel = document.querySelector('[data-panel="' + t.id + '"]');
      if (panel) panel.dataset.disponible = '1';
    });
    c.navegacion.filter(function (t) { return !t.visible; }).forEach(function (t) {
      var panel = document.querySelector('[data-panel="' + t.id + '"]');
      if (panel) { panel.hidden = true; panel.classList.remove('is-visible'); delete panel.dataset.disponible; }
    });

    nodo('footer-contacto').textContent = c.contacto.telefono + ' · ' + c.contacto.correo;

    var wa = nodo('wa-card');
    if (wa) wa.href = c.contacto.whatsapp ? 'https://wa.me/' + c.contacto.whatsapp : '#';
    var tel = nodo('tel-card');
    if (tel) tel.href = 'tel:' + (c.contacto.telefono || '').replace(/[^+\d]/g, '');
    var mail = nodo('mail-card');
    if (mail) mail.href = 'mailto:' + c.contacto.correo;
    var cal = nodo('calendar-link');
    if (cal) { cal.href = c.contacto.calendario || '#'; if (c.contacto.calendario) cal.target = '_blank'; }
  }

  /* -------- 4. bloques de la portada: orden y visibilidad -------- */
  function aplicarBloques(c) {
    var inicio = nodo('inicio');
    (c.bloques || []).forEach(function (b) {
      var s = inicio.querySelector('[data-bloque="' + b.id + '"]');
      if (!s) return;
      s.hidden = !b.visible;
      inicio.appendChild(s);
    });
    var visual = nodo('hero-visual');
    if (visual) visual.hidden = !c.hero.mostrarAnimacion;
  }

  /* -------- 5. colecciones -------- */
  function pintarBand(c) {
    var cont = nodo('band-items');
    vaciar(cont);
    c.band.items.forEach(function (it, i) {
      var d = el('div');
      d.dataset.reveal = 'up';
      if (i) d.dataset.revealDelay = (i * 0.08).toFixed(2);
      var b = el('b', null, it.valor);
      if (it.contar) {
        b.dataset.count = it.contar;
        if (it.prefijo) b.dataset.prefix = it.prefijo;
        if (it.sufijo) b.dataset.suffix = it.sufijo;
      }
      d.appendChild(b);
      d.appendChild(el('span', null, it.etiqueta));
      cont.appendChild(d);
    });
  }

  function pintarServicios(c) {
    var cont = nodo('servicios-items');
    vaciar(cont);
    c.servicios.items.forEach(function (it) {
      var art = el('article', 'card elev-sm service');
      art.dataset.reveal = 'up';
      art.appendChild(el('div', 'card-kicker', it.kicker));
      art.appendChild(el('h3', null, it.titulo));
      art.appendChild(el('p', 'card-body', it.texto));
      var row = el('div', 'tag-row');
      (it.etiquetas || []).forEach(function (t) { row.appendChild(el('span', 'tag tag-outline', t)); });
      art.appendChild(row);
      cont.appendChild(art);
    });
  }

  function pintarPlanes(c) {
    var cont = nodo('planes-items');
    vaciar(cont);
    c.planes.items.forEach(function (p, i) {
      var art = el('article', 'card ' + (p.destacado ? 'elev-md plan plan-featured' : 'elev-sm plan'));
      art.dataset.reveal = 'up';
      if (i) art.dataset.revealDelay = (i * 0.1).toFixed(2);

      if (p.etiqueta) {
        var head = el('div', 'plan-head');
        head.appendChild(el('div', 'card-kicker', p.nombre));
        head.appendChild(el('span', 'tag tag-accent', p.etiqueta));
        art.appendChild(head);
      } else {
        art.appendChild(el('div', 'card-kicker', p.nombre));
      }

      var precioBox = el('div');
      if (c.planes.mostrarPrecios !== false) precioBox.appendChild(el('div', 'price', p.precio));
      precioBox.appendChild(el('div', 'price-note', p.nota));
      art.appendChild(precioBox);

      art.appendChild(el('p', 'card-body', p.texto));
      var ul = el('ul', 'feature-list');
      (p.caracteristicas || []).forEach(function (f) { ul.appendChild(el('li', null, f)); });
      art.appendChild(ul);

      var btn = el('button', 'btn ' + (p.destacado ? 'btn-primary' : 'btn-secondary') + ' btn-block', p.boton);
      btn.dataset.tabLink = 'contacto';
      art.appendChild(btn);
      cont.appendChild(art);
    });

    var head = nodo('compare-head');
    var body = nodo('compare-body');
    vaciar(head); vaciar(body);
    var comp = c.planes.comparativa || { columnas: [], filas: [] };
    var trh = el('tr');
    var th0 = el('th', 'left', 'Incluye');
    trh.appendChild(th0);
    comp.columnas.forEach(function (col) { trh.appendChild(el('th', null, col)); });
    head.appendChild(trh);
    comp.filas.forEach(function (f) {
      var tr = el('tr');
      tr.appendChild(el('td', null, f.concepto));
      f.valores.forEach(function (v) { tr.appendChild(el('td', v === '—' ? 'muted' : null, v)); });
      body.appendChild(tr);
    });

    var extras = nodo('planes-extras');
    vaciar(extras);
    (c.planes.extras || []).forEach(function (e) {
      var d = el('div', 'card elev-sm');
      d.appendChild(el('div', 'card-title', e.titulo));
      d.appendChild(el('p', 'card-body', e.texto));
      extras.appendChild(d);
    });
  }

  function pintarPortafolio(c) {
    var cont = nodo('portafolio-items');
    vaciar(cont);
    var retardos = ['0', '.07', '.14', '.05', '.12', '.19'];
    c.portafolio.items.forEach(function (p, i) {
      var wrap = el('div');
      wrap.dataset.reveal = 'up';
      wrap.dataset.revealDelay = retardos[i % retardos.length];

      var a = el('a', 'card elev-sm project');
      a.href = p.url || '#';
      if (p.url) { a.target = '_blank'; a.rel = 'noopener'; }

      var shot = el('div', 'shot');
      if (p.imagen) {
        var img = el('img');
        img.src = p.imagen; img.alt = p.nombre; img.loading = 'lazy';
        shot.appendChild(img);
      } else {
        shot.appendChild(el('span', null, 'Captura del proyecto'));
      }
      a.appendChild(shot);

      var body = el('div', 'project-body');
      body.appendChild(el('div', 'card-kicker', p.tipo));
      body.appendChild(el('div', 'card-title', p.nombre));
      body.appendChild(el('p', 'card-body', p.texto));
      body.appendChild(el('span', 'go', 'Ver proyecto ↗'));
      a.appendChild(body);

      wrap.appendChild(a);
      cont.appendChild(wrap);
    });
  }

  function pintarContacto(c) {
    var needs = nodo('needs');
    vaciar(needs);
    (c.contactoSec.necesidades || []).forEach(function (n) {
      var b = el('button', 'tag tag-outline need', n);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      needs.appendChild(b);
    });

    var slots = nodo('slots');
    vaciar(slots);
    var dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    var hoy = new Date();
    for (var i = 1; i <= 4; i++) {
      var f = new Date(hoy.getTime() + i * 86400000);
      var s = el('div', 'slot');
      s.appendChild(el('span', null, dias[(f.getDay() + 6) % 7] || 'Lun'));
      s.appendChild(el('b', null, String(f.getDate()).padStart(2, '0')));
      slots.appendChild(s);
    }
  }

  /* -------- pintado completo -------- */
  function pintar(c) {
    contenido = c;
    aplicarTema(c.tema || {});
    aplicarChrome(c);
    aplicarBloques(c);
    pintarBand(c);
    pintarServicios(c);
    pintarPlanes(c);
    pintarPortafolio(c);
    pintarContacto(c);
    aplicarTextos(c);
    document.dispatchEvent(new CustomEvent('sitio:pintado', { detail: c }));
  }

  /* -------- arranque -------- */
  var cliente = null;

  function iniciar() {
    pintar(JSON.parse(JSON.stringify(window.CONTENIDO_DEFECTO)));

    cliente = window.crearCliente ? window.crearCliente() : null;
    if (!cliente) return;

    cliente.from('contenido').select('datos').eq('id', 1).single()
      .then(function (r) {
        var datos = r && r.data && r.data.datos;
        if (!datos || !Object.keys(datos).length) return;
        pintar(fusionar(window.CONTENIDO_DEFECTO, datos));
      })
      .catch(function () { /* el sitio ya está pintado con los valores por defecto */ });
  }

  return {
    iniciar: iniciar,
    pintar: pintar,
    fusionar: fusionar,
    get contenido() { return contenido; },
    get cliente() { return cliente; }
  };
})();
