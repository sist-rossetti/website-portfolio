/* ============================================================
   Contenido por defecto del sitio.
   Es el respaldo: si la base de datos no responde o está vacía,
   el sitio se dibuja con estos valores. El panel guarda cambios
   sobre esta misma estructura.
   ============================================================ */
window.CONTENIDO_DEFECTO = {
  meta: {
    titulo: '[Tu Marca] — Desarrollo de aplicaciones y automatización de procesos',
    descripcion: 'Desarrollamos aplicaciones a la medida de su operación y automatizamos las tareas que consumen las horas de su equipo: cotizar, agendar, facturar, dar seguimiento, reportar.',
    ogImagen: ''
  },

  marca: { nombre: '[Tu Marca]', simbolo: '◆', logoUrl: '' },

  tema: {
    acento: '#3d6f9e',
    fondo: '#161826',
    tipografiaTitulos: 'Inter',
    tipografiaTexto: 'Inter'
  },

  contacto: {
    telefono: '+00 000 000 000',
    whatsapp: '00000000000',
    correo: 'hola@sudominio.com',
    calendario: '',
    horario: 'Lun a vie, 9:00 – 18:00'
  },

  navegacion: [
    { id: 'inicio', etiqueta: 'Inicio', visible: true },
    { id: 'servicios', etiqueta: 'Servicios y planes', visible: true },
    { id: 'portafolio', etiqueta: 'Portafolio', visible: true },
    { id: 'contacto', etiqueta: 'Contacto', visible: true }
  ],

  botonCabecera: 'Cotizar mi proyecto',

  /* Orden y visibilidad de los bloques de la portada */
  bloques: [
    { id: 'hero', nombre: 'Portada', visible: true },
    { id: 'band', nombre: 'Franja de beneficios', visible: true },
    { id: 'servicios', nombre: 'Servicios', visible: true },
    { id: 'cta', nombre: 'Llamada a la acción', visible: true }
  ],

  hero: {
    eyebrow: 'Desarrollo y automatización a medida',
    titulo: 'Su empresa no necesita más personal.\nNecesita procesos que se hagan solos.',
    parrafo1: 'Desarrollamos aplicaciones a la medida de su operación y automatizamos las tareas que hoy consumen las horas de su equipo: cotizar, agendar, facturar, dar seguimiento, reportar.',
    parrafo2: 'El resultado es medible: menos errores, menos trabajo manual y decisiones con información del día, no del mes pasado.',
    boton1: 'Agendar diagnóstico gratuito',
    boton2: 'Ver planes y servicios',
    leyenda: 'De la pila de papeles a un tablero que se actualiza solo.',
    mostrarAnimacion: true
  },

  band: {
    items: [
      { valor: '-40%', etiqueta: 'tiempo en tareas administrativas', contar: 40, prefijo: '-', sufijo: '%' },
      { valor: '24/7', etiqueta: 'procesos corriendo sin supervisión' },
      { valor: '4 sem.', etiqueta: 'primera versión en producción', contar: 4, sufijo: ' sem.' },
      { valor: '100%', etiqueta: 'a medida, sin licencias atadas', contar: 100, sufijo: '%' }
    ]
  },

  servicios: {
    titulo: 'Nuestros servicios',
    intro: 'Cuatro frentes que suelen contratarse juntos: construimos la herramienta, automatizamos el proceso, acompañamos al equipo y lo mantenemos funcionando.',
    items: [
      {
        kicker: '01 — Desarrollo personalizado',
        titulo: 'Software hecho para su forma de trabajar',
        texto: 'Nada de plantillas forzadas. Definimos el flujo real y lo construimos encima.',
        etiquetas: ['Websites corporativos', 'Sistemas de agendamiento', 'E-commerce', 'Portales e intranets', 'Apps móviles', 'Integraciones y APIs']
      },
      {
        kicker: '02 — Automatizaciones',
        titulo: 'Que el proceso se haga solo',
        texto: 'Tomamos la tarea repetitiva más costosa y la convertimos en un flujo automático.',
        etiquetas: ['Gestión administrativa', 'Cotizadores automáticos', 'Procesos contables', 'Ventas y seguimiento (CRM)', 'Inventarios', 'Reportes y tableros']
      },
      {
        kicker: '03 — Soporte personalizado',
        titulo: 'Alguien que conoce su sistema',
        texto: 'Mantenimiento, mejoras y respuesta con tiempos acordados. Sin mesas de ayuda anónimas.',
        etiquetas: ['Mantenimiento evolutivo', 'Monitoreo', 'Respaldos', 'SLA definido']
      },
      {
        kicker: '04 — Consultorías y capacitaciones',
        titulo: 'Primero el diagnóstico, luego la inversión',
        texto: 'Levantamos sus procesos, priorizamos por retorno y entrenamos al equipo que lo va a usar.',
        etiquetas: ['Diagnóstico de procesos', 'Hoja de ruta tecnológica', 'Capacitación a equipos', 'Acompañamiento']
      }
    ]
  },

  cta: {
    titulo: '¿No sabe por dónde empezar?',
    texto: 'Una llamada de 30 minutos y le decimos qué automatizar primero, cuánto cuesta y en cuánto se paga.',
    boton: 'Reservar llamada'
  },

  planes: {
    titulo: 'Planes',
    intro: 'Precios de referencia. Todo proyecto empieza con un diagnóstico sin costo y una propuesta cerrada antes de facturar.',
    mostrarPrecios: true,
    items: [
      {
        nombre: 'Esencial', precio: '$ 1.200', nota: 'proyecto único · desde', destacado: false, etiqueta: '',
        texto: 'Para salir a operar rápido con una pieza bien hecha.',
        caracteristicas: ['Website corporativo o landing', 'Formularios y WhatsApp conectados', 'Panel para editar contenido', '1 mes de soporte incluido'],
        boton: 'Solicitar propuesta'
      },
      {
        nombre: 'Crecimiento', precio: '$ 3.500', nota: 'proyecto único · desde', destacado: true, etiqueta: 'El más elegido',
        texto: 'Un sistema propio que reemplaza hojas de cálculo y trabajo manual.',
        caracteristicas: ['Sistema a medida (agenda, cotizador, ventas o administración)', 'Hasta 3 automatizaciones de proceso', 'Usuarios y permisos', 'Tablero de indicadores', 'Capacitación al equipo', '3 meses de soporte incluido'],
        boton: 'Empezar diagnóstico'
      },
      {
        nombre: 'Corporativo', precio: 'A medida', nota: 'alcance por fases', destacado: false, etiqueta: '',
        texto: 'Varias áreas, integraciones y soporte continuo con SLA.',
        caracteristicas: ['Consultoría y hoja de ruta', 'Integración con ERP, contabilidad o facturación', 'Automatizaciones ilimitadas por fase', 'Ambientes de prueba y producción', 'Soporte con SLA y responsable asignado'],
        boton: 'Hablar con un consultor'
      }
    ],
    comparativaTitulo: 'Qué incluye cada plan',
    comparativa: {
      columnas: ['Esencial', 'Crecimiento', 'Corporativo'],
      filas: [
        { concepto: 'Diagnóstico inicial', valores: ['✓', '✓', '✓'] },
        { concepto: 'Desarrollo a medida', valores: ['—', '✓', '✓'] },
        { concepto: 'Automatizaciones de proceso', valores: ['—', '3', 'Por fase'] },
        { concepto: 'Capacitación', valores: ['—', '✓', '✓'] },
        { concepto: 'Soporte', valores: ['1 mes', '3 meses', 'Continuo, con SLA'] },
        { concepto: 'Integraciones externas', valores: ['—', 'Básicas', 'Completas'] }
      ]
    },
    extrasTitulo: 'Servicios que se contratan aparte',
    extras: [
      { titulo: 'Soporte mensual', texto: 'Mantenimiento, mejoras pequeñas y monitoreo. Bolsa de horas mensual.' },
      { titulo: 'Consultoría', texto: 'Levantamiento de procesos y priorización por retorno. Entregable escrito.' },
      { titulo: 'Capacitaciones', texto: 'Sesiones para el equipo sobre el sistema y herramientas de productividad.' }
    ]
  },

  portafolio: {
    titulo: 'Portafolio',
    intro: 'Proyectos entregados. Cada tarjeta enlaza al sitio o a una demostración del sistema.',
    items: [
      { tipo: 'Agendamiento', nombre: 'Clínica Bellavista', texto: 'Reservas en línea, recordatorios automáticos y agenda por profesional.', url: 'https://example.com', imagen: '' },
      { tipo: 'Cotizador', nombre: 'Distribuidora Andes', texto: 'Cotizaciones automáticas con listas de precios y aprobación interna.', url: 'https://example.com', imagen: '' },
      { tipo: 'E-commerce', nombre: 'Tienda Norte', texto: 'Catálogo, pagos y sincronización de inventario con bodega.', url: 'https://example.com', imagen: '' },
      { tipo: 'Automatización contable', nombre: 'Estudio Contable Rivas', texto: 'Carga de comprobantes y conciliación mensual sin captura manual.', url: 'https://example.com', imagen: '' },
      { tipo: 'Gestión administrativa', nombre: 'Grupo Meridiano', texto: 'Portal interno para solicitudes, aprobaciones y reportes de área.', url: 'https://example.com', imagen: '' },
      { tipo: 'Website corporativo', nombre: 'Aurora Legal', texto: 'Sitio institucional con captación de contactos y blog.', url: 'https://example.com', imagen: '' }
    ],
    demoTexto: '¿Quiere ver un caso parecido al suyo? Le mostramos el sistema funcionando en una demostración de 20 minutos.',
    demoBoton: 'Pedir demostración'
  },

  contactoSec: {
    titulo: 'Hablemos de su operación',
    intro: 'Cuéntenos qué tarea le está costando más tiempo. Respondemos el mismo día hábil con una primera propuesta de alcance.',
    necesidades: ['Website', 'Sistema de agendamiento', 'E-commerce', 'Automatización de procesos', 'Cotizador', 'Soporte', 'Consultoría'],
    agendaTitulo: 'Diagnóstico de 30 minutos',
    agendaTexto: 'Elija un horario disponible y hablamos por videollamada.',
    agendaBoton: 'Abrir calendario',
    notaEnvio: 'Respuesta el mismo día hábil',
    botonEnviar: 'Enviar solicitud',
    graciasTitulo: 'Mensaje enviado',
    graciasTexto: 'Le escribimos a la brevedad. Si prefiere, puede escribirnos por WhatsApp ahora mismo.'
  },

  pie: '© 2026 [Tu Marca] · Desarrollo y automatización'
};
