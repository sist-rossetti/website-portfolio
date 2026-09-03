/* ============================================================
   Panel de administración — lógica
   Secciones: acceso · consultas · contenido · diseño ·
              secciones · colecciones · imágenes · SEO · usuarios
   ============================================================ */
(function () {
  'use strict';

  var sb = window.crearCliente ? window.crearCliente() : null;
  var perfil = null;
  var contenido = null;   // documento en edición
  var original = null;    // copia para detectar cambios
  var consultas = [];
  var filtro = { texto: '', estado: '' };

  var FUENTES = ['Inter', 'Manrope', 'Space Grotesk', 'IBM Plex Sans', 'Sora', 'Work Sans', 'DM Sans', 'Outfit', 'Plus Jakarta Sans', 'Source Serif 4', 'Lora', 'Playfair Display'];
  var PALETA = ['#3d6f9e', '#2f6f6a', '#7a5ea8', '#a8603d', '#3f7a4e', '#8a3d5c', '#4a5a7a', '#9184d9'];

  /* ---------- utilidades ---------- */
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function el(tag, cls, texto) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function clon(o) { return JSON.parse(JSON.stringify(o)); }
  function ruta(obj, camino) {
    return camino.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function poner(obj, camino, valor) {
    var partes = camino.split('.');
    var ultima = partes.pop();
    var destino = partes.reduce(function (o, k) {
      if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
      return o[k];
    }, obj);
    destino[ultima] = valor;
  }
  function aviso(texto, esError) {
    var n = el('div', 'aviso' + (esError ? ' error' : ''), texto);
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 2600);
  }
  function fecha(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  /* ============================================================
     1. ACCESO
     ============================================================ */
  var loginForm = $('#login-form');
  var loginError = $('#li-error');

  function mostrarError(msg) {
    loginError.textContent = msg;
    loginError.hidden = false;
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;

    if (!sb) {
      mostrarError('Falta configurar la conexión: edite js/supabase-config.js con los datos de su proyecto.');
      return;
    }
    var boton = $('#li-enviar');
    boton.disabled = true;
    boton.textContent = 'Entrando…';

    sb.auth.signInWithPassword({
      email: $('#li-correo').value.trim(),
      password: $('#li-clave').value
    }).then(function (r) {
      if (r.error) throw r.error;
      return entrar();
    }).catch(function (err) {
      mostrarError(err.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : (err.message || 'No pudimos iniciar sesión.'));
    }).then(function () {
      boton.disabled = false;
      boton.textContent = 'Entrar';
    });
  });

  $('#li-recuperar').addEventListener('click', function () {
    var correo = $('#li-correo').value.trim();
    if (!sb || !correo) { mostrarError('Escriba su correo y vuelva a pulsar.'); return; }
    sb.auth.resetPasswordForEmail(correo, { redirectTo: location.href })
      .then(function () { aviso('Le enviamos un enlace para restablecer la contraseña.'); })
      .catch(function () { mostrarError('No pudimos enviar el correo.'); });
  });

  $('#salir').addEventListener('click', function () {
    if (sb) sb.auth.signOut();
    location.reload();
  });

  function entrar() {
    return sb.auth.getUser().then(function (r) {
      var usuario = r.data && r.data.user;
      if (!usuario) throw new Error('Sesión no válida');
      return sb.from('perfiles').select('*').eq('id', usuario.id).single();
    }).then(function (r) {
      perfil = r.data || { correo: '—', rol: 'editor' };
      $('#usuario-correo').textContent = perfil.correo;
      $('#usuario-rol').textContent = perfil.rol;
      $$('.solo-admin').forEach(function (n) { n.hidden = perfil.rol !== 'admin'; });
      $('#login-screen').hidden = true;
      $('#app').hidden = false;
      return Promise.all([cargarContenido(), cargarConsultas()]);
    });
  }

  /* ============================================================
     2. NAVEGACIÓN DEL PANEL
     ============================================================ */
  var TITULOS = {
    consultas: 'Consultas', contenido: 'Textos', diseno: 'Diseño', secciones: 'Secciones',
    servicios: 'Servicios', planes: 'Planes', portafolio: 'Portafolio', contacto: 'Contacto',
    medios: 'Imágenes', seo: 'SEO', usuarios: 'Usuarios y versiones'
  };

  $('.side-nav').addEventListener('click', function (e) {
    var b = e.target.closest('.side-link');
    if (!b) return;
    var vista = b.dataset.vista;
    $$('.side-link').forEach(function (n) { n.classList.toggle('is-active', n === b); });
    $$('.vista').forEach(function (n) { n.classList.toggle('is-visible', n.dataset.vista === vista); });
    $('#vista-titulo').textContent = TITULOS[vista] || vista;
    var editaContenido = vista !== 'consultas' && vista !== 'usuarios' && vista !== 'medios';
    $('#publicar').hidden = !editaContenido;
    $('#descartar').hidden = !editaContenido;
    if (vista === 'usuarios') { cargarUsuarios(); cargarVersiones(); }
    if (vista === 'medios') cargarMedios();
  });

  /* ============================================================
     3. CONTENIDO: carga, guardado
     ============================================================ */
  function fusionar(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    if (Array.isArray(extra)) return extra;
    var out = Object.assign({}, base);
    Object.keys(extra).forEach(function (k) {
      var e = extra[k];
      out[k] = (e && typeof e === 'object' && !Array.isArray(e)) ? fusionar(base[k] || {}, e) : e;
    });
    return out;
  }

  function cargarContenido() {
    return sb.from('contenido').select('datos').eq('id', 1).single().then(function (r) {
      var datos = r.data && r.data.datos;
      contenido = (datos && Object.keys(datos).length)
        ? fusionar(clon(window.CONTENIDO_DEFECTO), datos)
        : clon(window.CONTENIDO_DEFECTO);
      original = clon(contenido);
      pintarTodo();
    });
  }

  $('#publicar').addEventListener('click', function () {
    var boton = this;
    boton.disabled = true;
    boton.textContent = 'Publicando…';
    sb.from('contenido').update({
      datos: contenido,
      actualizado_en: new Date().toISOString(),
      actualizado_por: perfil ? perfil.id : null
    }).eq('id', 1).then(function (r) {
      if (r.error) throw r.error;
      original = clon(contenido);
      aviso('Cambios publicados');
    }).catch(function (err) {
      aviso(err.message || 'No pudimos publicar', true);
    }).then(function () {
      boton.disabled = false;
      boton.textContent = 'Publicar cambios';
    });
  });

  $('#descartar').addEventListener('click', function () {
    contenido = clon(original);
    pintarTodo();
    aviso('Cambios descartados');
  });

  function pintarTodo() {
    pintarTextos();
    pintarDiseno();
    pintarSecciones();
    pintarServicios();
    pintarPlanes();
    pintarPortafolio();
    pintarContacto();
    pintarSeo();
  }

  /* ---------- constructores de formulario ---------- */
  function campo(etiqueta, camino, opciones) {
    opciones = opciones || {};
    var wrap = el('div', 'field');
    var id = 'f-' + camino.replace(/\./g, '-');
    var lab = el('label', null, etiqueta);
    lab.htmlFor = id;
    wrap.appendChild(lab);

    var input = document.createElement(opciones.multilinea ? 'textarea' : 'input');
    input.className = 'input';
    input.id = id;
    if (opciones.tipo) input.type = opciones.tipo;
    if (opciones.placeholder) input.placeholder = opciones.placeholder;
    input.value = ruta(contenido, camino) != null ? ruta(contenido, camino) : '';
    input.addEventListener('input', function () { poner(contenido, camino, input.value); });
    wrap.appendChild(input);
    if (opciones.nota) wrap.appendChild(el('p', 'ayuda', opciones.nota));
    return wrap;
  }

  function bloque(titulo, ayuda) {
    var b = el('div', 'bloque card elev-sm');
    b.appendChild(el('h2', null, titulo));
    if (ayuda) b.appendChild(el('p', 'ayuda', ayuda));
    return b;
  }

  function grupo2() { return el('div', 'form-2'); }

  function botonMini(texto, titulo, fn) {
    var b = el('button', 'mini', texto);
    b.type = 'button';
    if (titulo) b.title = titulo;
    b.addEventListener('click', fn);
    return b;
  }

  function editorChips(lista, alCambiar) {
    var cont = el('div', 'chips');
    function pintar() {
      cont.textContent = '';
      lista.forEach(function (txt, i) {
        var c = el('span', 'chip');
        c.appendChild(document.createTextNode(txt));
        var x = el('button', null, '✕');
        x.type = 'button';
        x.addEventListener('click', function () { lista.splice(i, 1); pintar(); alCambiar && alCambiar(); });
        c.appendChild(x);
        cont.appendChild(c);
      });
      var add = el('button', 'mini', '+');
      add.type = 'button';
      add.title = 'Agregar';
      add.addEventListener('click', function () {
        var v = prompt('Nueva etiqueta');
        if (v && v.trim()) { lista.push(v.trim()); pintar(); alCambiar && alCambiar(); }
      });
      cont.appendChild(add);
    }
    pintar();
    return cont;
  }

  /* ============================================================
     4. VISTA: TEXTOS
     ============================================================ */
  function pintarTextos() {
    var c = $('#v-contenido');
    c.textContent = '';

    var b1 = bloque('Marca y cabecera');
    var g1 = grupo2();
    g1.appendChild(campo('Nombre de la marca', 'marca.nombre'));
    g1.appendChild(campo('Símbolo (si no hay logo)', 'marca.simbolo'));
    b1.appendChild(g1);
    b1.appendChild(campo('URL del logo', 'marca.logoUrl', { nota: 'Súbalo en Imágenes y pegue el enlace aquí. Si está vacío se usa el símbolo.' }));
    b1.appendChild(campo('Botón de la cabecera', 'botonCabecera'));
    c.appendChild(b1);

    var b2 = bloque('Portada');
    b2.appendChild(campo('Línea superior', 'hero.eyebrow'));
    b2.appendChild(campo('Titular', 'hero.titulo', { multilinea: true, nota: 'Use un salto de línea para cortar el titular en dos.' }));
    b2.appendChild(campo('Primer párrafo', 'hero.parrafo1', { multilinea: true }));
    b2.appendChild(campo('Segundo párrafo', 'hero.parrafo2', { multilinea: true }));
    var g2 = grupo2();
    g2.appendChild(campo('Botón principal', 'hero.boton1'));
    g2.appendChild(campo('Botón secundario', 'hero.boton2'));
    b2.appendChild(g2);
    b2.appendChild(campo('Leyenda de la animación', 'hero.leyenda'));
    c.appendChild(b2);

    var b3 = bloque('Franja de beneficios', 'Cuatro cifras sobre fondo azul. Si escribe un número en "contar hasta", la cifra se anima al aparecer.');
    contenido.band.items.forEach(function (it, i) {
      var item = el('div', 'item');
      var cab = el('div', 'item-cab');
      cab.appendChild(el('span', 'titulo', 'Cifra ' + (i + 1)));
      var acc = el('div', 'item-acciones');
      acc.appendChild(botonMini('↑', 'Subir', function () { mover(contenido.band.items, i, -1); pintarTextos(); }));
      acc.appendChild(botonMini('↓', 'Bajar', function () { mover(contenido.band.items, i, 1); pintarTextos(); }));
      acc.appendChild(botonMini('✕', 'Quitar', function () { contenido.band.items.splice(i, 1); pintarTextos(); }));
      cab.appendChild(acc);
      item.appendChild(cab);
      var g = grupo2();
      g.appendChild(campo('Cifra', 'band.items.' + i + '.valor'));
      g.appendChild(campo('Etiqueta', 'band.items.' + i + '.etiqueta'));
      item.appendChild(g);
      var g2b = grupo2();
      g2b.appendChild(campo('Contar hasta', 'band.items.' + i + '.contar', { tipo: 'number', nota: 'Déjelo vacío si la cifra no es numérica.' }));
      g2b.appendChild(campo('Sufijo', 'band.items.' + i + '.sufijo'));
      item.appendChild(g2b);
      b3.appendChild(item);
    });
    var addBand = el('button', 'btn btn-secondary agregar', '+ Agregar cifra');
    addBand.addEventListener('click', function () {
      contenido.band.items.push({ valor: '0', etiqueta: 'nueva cifra' });
      pintarTextos();
    });
    b3.appendChild(addBand);
    c.appendChild(b3);

    var b4 = bloque('Llamada a la acción');
    b4.appendChild(campo('Título', 'cta.titulo'));
    b4.appendChild(campo('Texto', 'cta.texto', { multilinea: true }));
    b4.appendChild(campo('Botón', 'cta.boton'));
    c.appendChild(b4);

    var b5 = bloque('Pie del sitio');
    b5.appendChild(campo('Texto del pie', 'pie'));
    c.appendChild(b5);
  }

  function mover(lista, i, d) {
    var j = i + d;
    if (j < 0 || j >= lista.length) return;
    var tmp = lista[i]; lista[i] = lista[j]; lista[j] = tmp;
  }

  /* ============================================================
     5. VISTA: DISEÑO
     ============================================================ */
  var RAMPA = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  var FACTOR = { 100: .82, 200: .62, 300: .40, 400: .20, 500: 0, 600: -.16, 700: -.32, 800: -.48, 900: -.62 };

  function hexARgb(hex) {
    var h = (hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbAHex(r) {
    return '#' + r.map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }
  function mezclar(hex, f) {
    var objetivo = f > 0 ? 255 : 0, t = Math.abs(f);
    return rgbAHex(hexARgb(hex).map(function (v) { return v + (objetivo - v) * t; }));
  }

  function pintarDiseno() {
    var t = contenido.tema;

    var rueda = $('#d-acento'), hexa = $('#d-acento-hex');
    rueda.value = t.acento; hexa.value = t.acento;

    function aplicarAcento(valor) {
      if (!/^#[0-9a-f]{6}$/i.test(valor)) return;
      t.acento = valor.toLowerCase();
      rueda.value = t.acento; hexa.value = t.acento;
      pintarRampa();
      marcarPaleta();
      pintarPrevia();
    }
    rueda.oninput = function () { aplicarAcento(rueda.value); };
    hexa.oninput = function () { aplicarAcento(hexa.value.trim()); };

    function pintarRampa() {
      var r = $('#d-rampa');
      r.textContent = '';
      RAMPA.forEach(function (paso) {
        var i = el('i');
        i.style.background = FACTOR[paso] === 0 ? t.acento : mezclar(t.acento, FACTOR[paso]);
        i.title = 'accent-' + paso;
        r.appendChild(i);
      });
    }

    var paleta = $('#d-paleta');
    paleta.textContent = '';
    PALETA.forEach(function (hex) {
      var s = el('button', 'swatch');
      s.type = 'button';
      s.style.background = hex;
      s.title = hex;
      s.dataset.hex = hex;
      s.addEventListener('click', function () { aplicarAcento(hex); });
      paleta.appendChild(s);
    });
    function marcarPaleta() {
      $$('.swatch', paleta).forEach(function (s) {
        s.classList.toggle('is-on', s.dataset.hex.toLowerCase() === t.acento.toLowerCase());
      });
    }

    var fondo = $('#d-fondo'), fondoHex = $('#d-fondo-hex');
    fondo.value = t.fondo; fondoHex.value = t.fondo;
    function aplicarFondo(v) {
      if (!/^#[0-9a-f]{6}$/i.test(v)) return;
      t.fondo = v.toLowerCase();
      fondo.value = t.fondo; fondoHex.value = t.fondo;
      pintarPrevia();
    }
    fondo.oninput = function () { aplicarFondo(fondo.value); };
    fondoHex.oninput = function () { aplicarFondo(fondoHex.value.trim()); };

    [['#d-fuente-titulo', 'tipografiaTitulos'], ['#d-fuente-texto', 'tipografiaTexto']].forEach(function (par) {
      var sel = $(par[0]);
      sel.textContent = '';
      FUENTES.forEach(function (f) {
        var o = el('option', null, f);
        o.value = f;
        if (t[par[1]] === f) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = function () {
        t[par[1]] = sel.value;
        cargarFuentes();
        pintarPrevia();
      };
    });

    function cargarFuentes() {
      var fams = [t.tipografiaTitulos, t.tipografiaTexto].filter(Boolean);
      var unicas = fams.filter(function (f, i) { return fams.indexOf(f) === i; });
      var href = 'https://fonts.googleapis.com/css2?' + unicas.map(function (f) {
        return 'family=' + f.replace(/ /g, '+') + ':wght@400;500;600';
      }).join('&') + '&display=swap';
      var id = 'fuentes-previa';
      var link = document.getElementById(id);
      if (!link) {
        link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = href;
    }

    function pintarPrevia() {
      var p = $('#d-previa');
      p.textContent = '';
      p.style.background = t.fondo;
      p.style.borderColor = mezclar(t.acento, -.5);

      var titulo = el('div', 'p-titulo', 'Su empresa no necesita más personal.');
      titulo.style.fontFamily = '"' + t.tipografiaTitulos + '", sans-serif';
      titulo.style.color = '#f3f5fe';
      p.appendChild(titulo);

      var texto = el('div', 'p-texto', 'Desarrollamos aplicaciones y automatizamos su operación.');
      texto.style.fontFamily = '"' + t.tipografiaTexto + '", sans-serif';
      p.appendChild(texto);

      var botones = el('div', 'p-botones');
      var b1 = el('span', null, 'Agendar diagnóstico');
      b1.style.cssText = 'padding:9px 16px;border-radius:8px;font-size:13px;border:1px solid ' +
        mezclar(t.acento, .2) + ';color:' + mezclar(t.acento, .62) +
        ';background:' + mezclar(t.acento, -.55);
      var b2 = el('span', null, 'Ver planes');
      b2.style.cssText = 'padding:9px 16px;border-radius:8px;font-size:13px;border:1px solid #3a3d4d;color:#e9e9ed';
      botones.appendChild(b1); botones.appendChild(b2);
      p.appendChild(botones);

      var muestra = $('#d-muestra');
      muestra.style.fontFamily = '"' + t.tipografiaTitulos + '", sans-serif';
      muestra.style.color = t.acento;
    }

    pintarRampa();
    marcarPaleta();
    cargarFuentes();
    pintarPrevia();
  }

  /* ============================================================
     6. VISTA: SECCIONES (visibilidad y orden)
     ============================================================ */
  function listaOrdenable(cont, lista, obtenerNombre, alCambiar) {
    cont.textContent = '';
    lista.forEach(function (it, i) {
      var fila = el('div', 'fila-orden');
      fila.draggable = true;
      fila.dataset.i = i;

      fila.appendChild(el('span', 'asa', '⠿'));
      fila.appendChild(el('span', 'nombre', obtenerNombre(it)));

      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = it.visible !== false;
      chk.addEventListener('change', function () { it.visible = chk.checked; alCambiar && alCambiar(); });
      var lab = el('label', 'check');
      lab.appendChild(chk);
      lab.appendChild(document.createTextNode('Visible'));
      fila.appendChild(lab);

      var flechas = el('div', 'flechas');
      flechas.appendChild(botonMini('↑', 'Subir', function () {
        mover(lista, i, -1);
        listaOrdenable(cont, lista, obtenerNombre, alCambiar);
      }));
      flechas.appendChild(botonMini('↓', 'Bajar', function () {
        mover(lista, i, 1);
        listaOrdenable(cont, lista, obtenerNombre, alCambiar);
      }));
      fila.appendChild(flechas);

      fila.addEventListener('dragstart', function () {
        fila.classList.add('arrastrando');
        cont.dataset.desde = i;
      });
      fila.addEventListener('dragend', function () { fila.classList.remove('arrastrando'); });
      fila.addEventListener('dragover', function (e) { e.preventDefault(); });
      fila.addEventListener('drop', function (e) {
        e.preventDefault();
        var desde = parseInt(cont.dataset.desde, 10);
        var hasta = i;
        if (isNaN(desde) || desde === hasta) return;
        var mov = lista.splice(desde, 1)[0];
        lista.splice(hasta, 0, mov);
        listaOrdenable(cont, lista, obtenerNombre, alCambiar);
      });

      cont.appendChild(fila);
    });
  }

  function pintarSecciones() {
    listaOrdenable($('#s-nav'), contenido.navegacion, function (t) { return t.etiqueta; });
    listaOrdenable($('#s-bloques'), contenido.bloques, function (b) { return b.nombre; });
    var chk = $('#s-animacion');
    chk.checked = contenido.hero.mostrarAnimacion !== false;
    chk.onchange = function () { contenido.hero.mostrarAnimacion = chk.checked; };
  }

  /* ============================================================
     7. VISTAS: COLECCIONES
     ============================================================ */
  function cabeceraItem(titulo, lista, i, repintar) {
    var cab = el('div', 'item-cab');
    cab.appendChild(el('span', 'titulo', titulo));
    var acc = el('div', 'item-acciones');
    acc.appendChild(botonMini('↑', 'Subir', function () { mover(lista, i, -1); repintar(); }));
    acc.appendChild(botonMini('↓', 'Bajar', function () { mover(lista, i, 1); repintar(); }));
    acc.appendChild(botonMini('✕', 'Quitar', function () {
      if (confirm('¿Quitar este elemento?')) { lista.splice(i, 1); repintar(); }
    }));
    cab.appendChild(acc);
    return cab;
  }

  function pintarServicios() {
    var c = $('#v-servicios');
    c.textContent = '';
    var b = bloque('Tarjetas de servicio', 'Cada tarjeta aparece en la portada con su lista de etiquetas.');
    b.appendChild(campo('Título de la sección', 'servicios.titulo'));
    b.appendChild(campo('Introducción', 'servicios.intro', { multilinea: true }));

    contenido.servicios.items.forEach(function (it, i) {
      var item = el('div', 'item');
      item.appendChild(cabeceraItem(it.titulo || 'Servicio ' + (i + 1), contenido.servicios.items, i, pintarServicios));
      item.appendChild(campo('Etiqueta superior', 'servicios.items.' + i + '.kicker'));
      item.appendChild(campo('Título', 'servicios.items.' + i + '.titulo'));
      item.appendChild(campo('Descripción', 'servicios.items.' + i + '.texto', { multilinea: true }));
      var lab = el('div', 'field');
      lab.appendChild(el('label', null, 'Etiquetas'));
      lab.appendChild(editorChips(it.etiquetas));
      item.appendChild(lab);
      b.appendChild(item);
    });

    var add = el('button', 'btn btn-secondary agregar', '+ Agregar servicio');
    add.addEventListener('click', function () {
      contenido.servicios.items.push({ kicker: '', titulo: 'Nuevo servicio', texto: '', etiquetas: [] });
      pintarServicios();
    });
    b.appendChild(add);
    c.appendChild(b);
  }

  function pintarPlanes() {
    var c = $('#v-planes');
    c.textContent = '';

    var b = bloque('Planes');
    b.appendChild(campo('Título de la sección', 'planes.titulo'));
    b.appendChild(campo('Introducción', 'planes.intro', { multilinea: true }));
    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = contenido.planes.mostrarPrecios !== false;
    chk.onchange = function () { contenido.planes.mostrarPrecios = chk.checked; };
    var lab = el('label', 'check');
    lab.appendChild(chk);
    lab.appendChild(document.createTextNode('Mostrar los precios en el sitio'));
    b.appendChild(lab);

    contenido.planes.items.forEach(function (p, i) {
      var item = el('div', 'item');
      item.appendChild(cabeceraItem(p.nombre || 'Plan ' + (i + 1), contenido.planes.items, i, pintarPlanes));
      var g = grupo2();
      g.appendChild(campo('Nombre', 'planes.items.' + i + '.nombre'));
      g.appendChild(campo('Precio', 'planes.items.' + i + '.precio'));
      item.appendChild(g);
      var g2 = grupo2();
      g2.appendChild(campo('Nota bajo el precio', 'planes.items.' + i + '.nota'));
      g2.appendChild(campo('Etiqueta destacada', 'planes.items.' + i + '.etiqueta', { placeholder: 'El más elegido' }));
      item.appendChild(g2);
      item.appendChild(campo('Descripción', 'planes.items.' + i + '.texto', { multilinea: true }));
      item.appendChild(campo('Texto del botón', 'planes.items.' + i + '.boton'));

      var dchk = document.createElement('input');
      dchk.type = 'checkbox';
      dchk.checked = !!p.destacado;
      dchk.onchange = function () { p.destacado = dchk.checked; };
      var dlab = el('label', 'check');
      dlab.appendChild(dchk);
      dlab.appendChild(document.createTextNode('Destacar este plan (borde de acento)'));
      item.appendChild(dlab);

      var flab = el('div', 'field');
      flab.appendChild(el('label', null, 'Qué incluye'));
      flab.appendChild(editorChips(p.caracteristicas));
      item.appendChild(flab);
      b.appendChild(item);
    });

    var add = el('button', 'btn btn-secondary agregar', '+ Agregar plan');
    add.addEventListener('click', function () {
      contenido.planes.items.push({ nombre: 'Nuevo plan', precio: '', nota: '', texto: '', caracteristicas: [], boton: 'Solicitar propuesta', destacado: false, etiqueta: '' });
      pintarPlanes();
    });
    b.appendChild(add);
    c.appendChild(b);

    /* --- comparativa --- */
    var bc = bloque('Tabla comparativa');
    bc.appendChild(campo('Título', 'planes.comparativaTitulo'));
    var comp = contenido.planes.comparativa;
    comp.filas.forEach(function (f, i) {
      var item = el('div', 'item');
      item.appendChild(cabeceraItem(f.concepto || 'Fila ' + (i + 1), comp.filas, i, pintarPlanes));
      item.appendChild(campo('Concepto', 'planes.comparativa.filas.' + i + '.concepto'));
      var g = el('div', 'form-2');
      comp.columnas.forEach(function (col, j) {
        var w = el('div', 'field');
        w.appendChild(el('label', null, col));
        var inp = document.createElement('input');
        inp.className = 'input';
        inp.value = f.valores[j] || '';
        inp.addEventListener('input', function () { f.valores[j] = inp.value; });
        w.appendChild(inp);
        g.appendChild(w);
      });
      item.appendChild(g);
      bc.appendChild(item);
    });
    var addFila = el('button', 'btn btn-secondary agregar', '+ Agregar fila');
    addFila.addEventListener('click', function () {
      comp.filas.push({ concepto: 'Nuevo concepto', valores: comp.columnas.map(function () { return '—'; }) });
      pintarPlanes();
    });
    bc.appendChild(addFila);
    c.appendChild(bc);

    /* --- extras --- */
    var be = bloque('Servicios que se contratan aparte');
    be.appendChild(campo('Título', 'planes.extrasTitulo'));
    contenido.planes.extras.forEach(function (e, i) {
      var item = el('div', 'item');
      item.appendChild(cabeceraItem(e.titulo || 'Extra ' + (i + 1), contenido.planes.extras, i, pintarPlanes));
      item.appendChild(campo('Título', 'planes.extras.' + i + '.titulo'));
      item.appendChild(campo('Texto', 'planes.extras.' + i + '.texto', { multilinea: true }));
      be.appendChild(item);
    });
    var addExtra = el('button', 'btn btn-secondary agregar', '+ Agregar servicio aparte');
    addExtra.addEventListener('click', function () {
      contenido.planes.extras.push({ titulo: 'Nuevo', texto: '' });
      pintarPlanes();
    });
    be.appendChild(addExtra);
    c.appendChild(be);
  }

  function pintarPortafolio() {
    var c = $('#v-portafolio');
    c.textContent = '';
    var b = bloque('Proyectos', 'El enlace se abre en una pestaña nueva. Suba la captura en Imágenes y pegue el enlace.');
    b.appendChild(campo('Título de la sección', 'portafolio.titulo'));
    b.appendChild(campo('Introducción', 'portafolio.intro', { multilinea: true }));

    contenido.portafolio.items.forEach(function (p, i) {
      var item = el('div', 'item');
      item.appendChild(cabeceraItem(p.nombre || 'Proyecto ' + (i + 1), contenido.portafolio.items, i, pintarPortafolio));
      var g = grupo2();
      g.appendChild(campo('Nombre', 'portafolio.items.' + i + '.nombre'));
      g.appendChild(campo('Tipo', 'portafolio.items.' + i + '.tipo'));
      item.appendChild(g);
      item.appendChild(campo('Descripción', 'portafolio.items.' + i + '.texto', { multilinea: true }));
      var g2 = grupo2();
      g2.appendChild(campo('Enlace', 'portafolio.items.' + i + '.url', { placeholder: 'https://' }));
      g2.appendChild(campo('Imagen (URL)', 'portafolio.items.' + i + '.imagen'));
      item.appendChild(g2);
      b.appendChild(item);
    });

    var add = el('button', 'btn btn-secondary agregar', '+ Agregar proyecto');
    add.addEventListener('click', function () {
      contenido.portafolio.items.push({ tipo: '', nombre: 'Nuevo proyecto', texto: '', url: '', imagen: '' });
      pintarPortafolio();
    });
    b.appendChild(add);
    c.appendChild(b);

    var b2 = bloque('Cierre de la sección');
    b2.appendChild(campo('Texto', 'portafolio.demoTexto', { multilinea: true }));
    b2.appendChild(campo('Botón', 'portafolio.demoBoton'));
    c.appendChild(b2);
  }

  function pintarContacto() {
    var c = $('#v-contacto');
    c.textContent = '';

    var b = bloque('Datos de contacto');
    var g = grupo2();
    g.appendChild(campo('Teléfono visible', 'contacto.telefono'));
    g.appendChild(campo('WhatsApp (solo números)', 'contacto.whatsapp', { nota: 'Con código de país, sin + ni espacios. Ej: 5491122334455' }));
    b.appendChild(g);
    var g2 = grupo2();
    g2.appendChild(campo('Correo', 'contacto.correo', { tipo: 'email' }));
    g2.appendChild(campo('Horario', 'contacto.horario'));
    b.appendChild(g2);
    b.appendChild(campo('Enlace del calendario', 'contacto.calendario', { placeholder: 'https://calendly.com/…' }));
    c.appendChild(b);

    var b2 = bloque('Sección de contacto');
    b2.appendChild(campo('Título', 'contactoSec.titulo'));
    b2.appendChild(campo('Introducción', 'contactoSec.intro', { multilinea: true }));
    var g3 = grupo2();
    g3.appendChild(campo('Texto del botón', 'contactoSec.botonEnviar'));
    g3.appendChild(campo('Nota junto al botón', 'contactoSec.notaEnvio'));
    b2.appendChild(g3);
    var lab = el('div', 'field');
    lab.appendChild(el('label', null, 'Opciones de "¿Qué necesita?"'));
    lab.appendChild(editorChips(contenido.contactoSec.necesidades));
    b2.appendChild(lab);
    c.appendChild(b2);

    var b3 = bloque('Tarjeta de agenda');
    b3.appendChild(campo('Título', 'contactoSec.agendaTitulo'));
    b3.appendChild(campo('Texto', 'contactoSec.agendaTexto', { multilinea: true }));
    b3.appendChild(campo('Botón', 'contactoSec.agendaBoton'));
    c.appendChild(b3);

    var b4 = bloque('Mensaje de confirmación');
    b4.appendChild(campo('Etiqueta', 'contactoSec.graciasTitulo'));
    b4.appendChild(campo('Texto', 'contactoSec.graciasTexto', { multilinea: true }));
    c.appendChild(b4);
  }

  function pintarSeo() {
    var c = $('#v-seo');
    c.textContent = '';
    var b = bloque('Metadatos', 'Es lo que se ve en Google y al compartir el enlace en redes o WhatsApp.');
    b.appendChild(campo('Título de la página', 'meta.titulo', { nota: 'Ideal entre 50 y 60 caracteres.' }));
    b.appendChild(campo('Descripción', 'meta.descripcion', { multilinea: true, nota: 'Ideal entre 120 y 155 caracteres.' }));
    b.appendChild(campo('Imagen para compartir (URL)', 'meta.ogImagen', { nota: 'Recomendado 1200 × 630 px.' }));
    c.appendChild(b);
  }

  /* ============================================================
     8. CONSULTAS
     ============================================================ */
  function cargarConsultas() {
    return sb.from('consultas').select('*').order('creado_en', { ascending: false })
      .then(function (r) {
        if (r.error) throw r.error;
        consultas = r.data || [];
        pintarConsultas();
      })
      .catch(function (err) { aviso(err.message || 'No pudimos cargar las consultas', true); });
  }

  var ESTADOS = { nueva: 'Nueva', en_proceso: 'En proceso', cerrada: 'Cerrada' };

  function filtradas() {
    var q = filtro.texto.toLowerCase();
    return consultas.filter(function (c) {
      if (filtro.estado && c.estado !== filtro.estado) return false;
      if (!q) return true;
      return [c.nombre, c.empresa, c.correo, c.mensaje].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }

  function pintarConsultas() {
    var cuerpo = $('#q-lista');
    cuerpo.textContent = '';
    var lista = filtradas();
    $('#q-vacio').hidden = lista.length > 0;

    lista.forEach(function (c) {
      var tr = el('tr');
      if (!c.leida) tr.className = 'no-leida';
      tr.appendChild(el('td', 'fecha', fecha(c.creado_en)));
      tr.appendChild(el('td', null, c.nombre));
      tr.appendChild(el('td', null, c.empresa || '—'));
      tr.appendChild(el('td', 'necesita-cell', (c.necesita || []).join(', ') || '—'));
      var tdEstado = el('td');
      tdEstado.appendChild(el('span', 'pill ' + c.estado, ESTADOS[c.estado]));
      tr.appendChild(tdEstado);
      tr.appendChild(el('td', null, '›'));
      tr.addEventListener('click', function () { abrirConsulta(c); });
      cuerpo.appendChild(tr);
    });

    var nuevas = consultas.filter(function (c) { return c.estado === 'nueva'; }).length;
    var badge = $('#badge-nuevas');
    badge.textContent = nuevas;
    badge.hidden = nuevas === 0;
  }

  $('#q-busca').addEventListener('input', function () {
    filtro.texto = this.value;
    pintarConsultas();
  });
  $('#q-estado').addEventListener('click', function (e) {
    var b = e.target.closest('.seg-opt');
    if (!b) return;
    $$('.seg-opt', this).forEach(function (n) { n.classList.toggle('is-on', n === b); });
    filtro.estado = b.dataset.estado;
    pintarConsultas();
  });

  $('#q-exportar').addEventListener('click', function () {
    var cols = ['creado_en', 'nombre', 'empresa', 'correo', 'telefono', 'necesita', 'mensaje', 'estado', 'notas'];
    var filas = [cols.join(';')].concat(filtradas().map(function (c) {
      return cols.map(function (k) {
        var v = c[k];
        if (Array.isArray(v)) v = v.join(', ');
        return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      }).join(';');
    }));
    var blob = new Blob(['\ufeff' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'consultas-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  function abrirConsulta(c) {
    var cuerpo = $('#cajon-cuerpo');
    cuerpo.textContent = '';

    cuerpo.appendChild(el('h2', null, c.nombre));
    cuerpo.appendChild(el('p', 'ayuda', fecha(c.creado_en)));

    function dato(etiqueta, valor, cls) {
      var d = el('dl', 'dato');
      d.appendChild(el('dt', null, etiqueta));
      d.appendChild(el('dd', cls || null, valor || '—'));
      cuerpo.appendChild(d);
    }
    dato('Empresa', c.empresa);
    dato('Correo', c.correo);
    dato('Teléfono', c.telefono);
    dato('Necesita', (c.necesita || []).join(', '));
    dato('Mensaje', c.mensaje, 'mensaje');

    var fEstado = el('div', 'field');
    fEstado.appendChild(el('label', null, 'Estado'));
    var sel = el('select', 'input');
    Object.keys(ESTADOS).forEach(function (k) {
      var o = el('option', null, ESTADOS[k]);
      o.value = k;
      if (c.estado === k) o.selected = true;
      sel.appendChild(o);
    });
    fEstado.appendChild(sel);
    cuerpo.appendChild(fEstado);

    var fNotas = el('div', 'field');
    fNotas.appendChild(el('label', null, 'Notas internas'));
    var ta = el('textarea', 'input');
    ta.value = c.notas || '';
    ta.placeholder = 'Qué se le respondió, próximos pasos…';
    fNotas.appendChild(ta);
    cuerpo.appendChild(fNotas);

    var acciones = el('div', 'submit-row');
    acciones.style.cssText = 'display:flex;gap:10px;margin-top:18px';
    var guardar = el('button', 'btn btn-primary', 'Guardar');
    guardar.addEventListener('click', function () {
      guardar.disabled = true;
      sb.from('consultas').update({ estado: sel.value, notas: ta.value, leida: true })
        .eq('id', c.id)
        .then(function (r) {
          if (r.error) throw r.error;
          c.estado = sel.value; c.notas = ta.value; c.leida = true;
          pintarConsultas();
          cerrarCajon();
          aviso('Consulta actualizada');
        })
        .catch(function (err) { aviso(err.message || 'No pudimos guardar', true); })
        .then(function () { guardar.disabled = false; });
    });
    acciones.appendChild(guardar);

    var mail = el('a', 'btn btn-secondary', 'Responder por correo');
    mail.href = 'mailto:' + c.correo + '?subject=' + encodeURIComponent('Su consulta en nuestro sitio');
    acciones.appendChild(mail);
    cuerpo.appendChild(acciones);

    $('#cajon').hidden = false;

    if (!c.leida) {
      sb.from('consultas').update({ leida: true }).eq('id', c.id).then(function () {
        c.leida = true;
        pintarConsultas();
      });
    }
  }

  function cerrarCajon() { $('#cajon').hidden = true; }
  $('#cajon').addEventListener('click', function (e) {
    if (e.target.closest('[data-cerrar-cajon]')) cerrarCajon();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarCajon();
  });

  /* ============================================================
     9. IMÁGENES
     ============================================================ */
  $('#m-archivo').addEventListener('change', function () {
    var archivos = Array.prototype.slice.call(this.files || []);
    if (!archivos.length) return;
    var error = $('#m-error');
    error.hidden = true;

    Promise.all(archivos.map(function (f) {
      var nombre = Date.now() + '-' + f.name.replace(/[^\w.\-]/g, '_');
      return sb.storage.from('medios').upload(nombre, f, { cacheControl: '3600' });
    })).then(function (rs) {
      var fallo = rs.filter(function (r) { return r.error; })[0];
      if (fallo) throw fallo.error;
      aviso(archivos.length + ' imagen(es) subida(s)');
      cargarMedios();
    }).catch(function (err) {
      error.textContent = err.message || 'No pudimos subir la imagen.';
      error.hidden = false;
    });
    this.value = '';
  });

  function cargarMedios() {
    sb.storage.from('medios').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
      .then(function (r) {
        if (r.error) throw r.error;
        var cont = $('#m-lista');
        cont.textContent = '';
        (r.data || []).filter(function (f) { return f.name !== '.emptyFolderPlaceholder'; })
          .forEach(function (f) {
            var url = sb.storage.from('medios').getPublicUrl(f.name).data.publicUrl;
            var caja = el('div', 'medio');
            var img = el('img');
            img.src = url; img.alt = f.name; img.loading = 'lazy';
            caja.appendChild(img);
            var pie = el('div', 'medio-pie');
            pie.appendChild(el('div', 'medio-nombre', f.name));
            var acc = el('div', 'medio-acciones');
            acc.appendChild(botonMini('⧉', 'Copiar enlace', function () {
              navigator.clipboard.writeText(url).then(function () { aviso('Enlace copiado'); });
            }));
            acc.appendChild(botonMini('✕', 'Borrar', function () {
              if (!confirm('¿Borrar ' + f.name + '?')) return;
              sb.storage.from('medios').remove([f.name]).then(function () {
                aviso('Imagen borrada');
                cargarMedios();
              });
            }));
            pie.appendChild(acc);
            caja.appendChild(pie);
            cont.appendChild(caja);
          });
      })
      .catch(function (err) { aviso(err.message || 'No pudimos listar las imágenes', true); });
  }

  /* ============================================================
     10. USUARIOS Y VERSIONES
     ============================================================ */
  function cargarUsuarios() {
    sb.from('perfiles').select('*').order('creado_en').then(function (r) {
      var cuerpo = $('#u-lista');
      cuerpo.textContent = '';
      (r.data || []).forEach(function (u) {
        var tr = el('tr');
        tr.appendChild(el('td', null, u.correo));
        tr.appendChild(el('td', null, u.nombre || '—'));

        var td = el('td');
        if (perfil.rol === 'admin') {
          var sel = el('select', 'input');
          sel.style.maxWidth = '130px';
          ['admin', 'editor'].forEach(function (rol) {
            var o = el('option', null, rol);
            o.value = rol;
            if (u.rol === rol) o.selected = true;
            sel.appendChild(o);
          });
          sel.onchange = function () {
            sb.from('perfiles').update({ rol: sel.value }).eq('id', u.id).then(function (res) {
              aviso(res.error ? (res.error.message || 'No pudimos cambiar el rol') : 'Rol actualizado', !!res.error);
            });
          };
          td.appendChild(sel);
        } else {
          td.textContent = u.rol;
        }
        tr.appendChild(td);
        tr.appendChild(el('td', 'fecha', u.creado_en ? fecha(u.creado_en) : '—'));
        cuerpo.appendChild(tr);
      });
    });
  }

  function cargarVersiones() {
    sb.from('contenido_versiones').select('id, creado_en').order('id', { ascending: false }).limit(30)
      .then(function (r) {
        var cont = $('#u-versiones');
        cont.textContent = '';
        if (!r.data || !r.data.length) {
          cont.appendChild(el('p', 'ayuda', 'Todavía no hay versiones anteriores.'));
          return;
        }
        r.data.forEach(function (v) {
          var fila = el('div', 'version');
          fila.appendChild(el('span', null, fecha(v.creado_en)));
          var b = el('button', 'btn btn-secondary', 'Restaurar');
          b.addEventListener('click', function () {
            if (!confirm('¿Restaurar el contenido de esta fecha?')) return;
            sb.from('contenido_versiones').select('datos').eq('id', v.id).single().then(function (res) {
              if (res.error) throw res.error;
              contenido = fusionar(clon(window.CONTENIDO_DEFECTO), res.data.datos);
              pintarTodo();
              aviso('Versión cargada. Pulse "Publicar cambios" para aplicarla.');
            }).catch(function (err) { aviso(err.message || 'No pudimos restaurar', true); });
          });
          fila.appendChild(b);
          cont.appendChild(fila);
        });
      });
  }

  /* ============================================================
     11. ARRANQUE
     ============================================================ */
  if (!sb) {
    $('#li-error').textContent = 'Falta configurar la conexión: edite js/supabase-config.js con la URL y la clave anon de su proyecto de Supabase.';
    $('#li-error').hidden = false;
  } else {
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) entrar().catch(function () { /* sesión inválida */ });
    });
  }
})();
