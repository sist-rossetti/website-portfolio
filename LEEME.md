# Sitio web + panel de administración

Sitio estático (HTML, CSS y JavaScript sin dependencias) con un panel de administración
que guarda datos de verdad en **Supabase**: las consultas del formulario y todo el
contenido editable del sitio.

## Qué incluye

- **Sitio público** con cuatro pestañas: Inicio, Servicios y planes, Portafolio, Contacto.
- **Panel de administración** en `/admin`, con acceso por correo y contraseña.
- **Consultas**: listado con búsqueda y filtros por estado, detalle con notas internas,
  estados (nueva / en proceso / cerrada), marcado de leída y exportación a CSV.
- **Edición total del sitio**: textos de todas las secciones, colores con rueda,
  tipografías, mostrar u ocultar secciones, reordenar bloques, planes y precios,
  proyectos del portafolio, servicios y etiquetas, datos de contacto, imágenes y SEO.
- **Roles**: `admin` (todo, incluida la gestión de usuarios) y `editor` (contenido y consultas).
- **Historial**: cada publicación guarda la versión anterior; se puede volver a las últimas 30.

## Estructura

```
sitio/
├── index.html                  Sitio público
├── netlify.toml                Configuración de publicación
├── css/
│   ├── nocturne.css            Tokens del sistema visual (no editar)
│   └── site.css                Estilos del sitio y la animación de la portada
├── js/
│   ├── supabase-config.js      ← Aquí van sus credenciales
│   ├── content-default.js      Contenido por defecto (respaldo si la base no responde)
│   ├── render.js               Dibuja el sitio a partir del contenido
│   └── app.js                  Pestañas, animaciones y envío del formulario
├── admin/
│   ├── index.html              Panel
│   ├── css/admin.css
│   └── js/admin.js
└── supabase/
    └── schema.sql              Tablas, permisos y almacenamiento
```

---

## Puesta en marcha (unos 15 minutos)

### 1. Crear el proyecto en Supabase

1. Entre a [supabase.com](https://supabase.com) y cree una cuenta (plan gratuito).
2. **New project**: elija un nombre, una contraseña para la base y la región más cercana.
3. Cuando termine de crearse, vaya a **SQL Editor → New query**, pegue el contenido
   completo de `supabase/schema.sql` y pulse **Run**.
   Esto crea las tablas, los permisos y el depósito de imágenes.

### 2. Conectar el sitio con la base

1. En Supabase vaya a **Project Settings → API**.
2. Copie **Project URL** y la clave **anon public**.
3. Ábralas en `js/supabase-config.js` y reemplace los dos valores:

```js
window.SUPABASE_CONFIG = {
  url: 'https://abcdefgh.supabase.co',
  anonKey: 'eyJhbGciOi...'
};
```

> La clave `anon` es pública por diseño: los permisos están en la base (RLS), no en la clave.
> **Nunca** copie aquí la clave `service_role`.

### 3. Crear su usuario

1. En Supabase: **Authentication → Users → Add user**.
2. Ponga su correo y una contraseña, y marque **Auto Confirm User**.
3. El primer usuario que se crea queda automáticamente con rol `admin`.

Para agregar más personas, repita el paso y cambie su rol desde el panel, en **Usuarios**.

### 4. Publicar en Netlify

**Opción A — arrastrar la carpeta** (lo más rápido)

1. Entre a [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastre la carpeta `sitio`. Queda publicada en una URL propia.

**Opción B — desde GitHub** (recomendado, permite actualizar con un push)

1. Cree un repositorio nuevo en GitHub.
2. Desde la carpeta `sitio`:

```bash
git init
git add .
git commit -m "Sitio y panel de administración"
git branch -M main
git remote add origin https://github.com/SU-USUARIO/SU-REPO.git
git push -u origin main
```

3. En Netlify: **Add new site → Import an existing project → GitHub**, elija el repositorio.
   No hace falta comando de build; el directorio de publicación es la raíz.

### 5. Autorizar el dominio en Supabase

En **Authentication → URL Configuration**, agregue la URL de Netlify en **Site URL**
y en **Redirect URLs** (necesario para el enlace de "olvidé mi contraseña").

### 6. Primer uso

1. Entre a `https://su-sitio.netlify.app/admin`.
2. Inicie sesión con el usuario que creó.
3. Cambie los textos, los colores y los datos de contacto, y pulse **Publicar cambios**.

---

## Cómo funciona el contenido

Todo el contenido editable vive en **una sola fila** de la tabla `contenido`, como un
documento JSON. El sitio hace esto al cargar:

1. Se dibuja de inmediato con `js/content-default.js` (sin esperar a la red).
2. Consulta la base y, si hay contenido guardado, vuelve a dibujar con esos valores.

Es decir: si la base no responde, el sitio igual se ve completo. Y si quiere cambiar los
valores de fábrica, edite `content-default.js`.

## Notas

- El color de acento genera toda su escala de tonos automáticamente: al elegir uno,
  cambian bordes, botones, etiquetas y la animación de la portada.
- Las imágenes se guardan en el depósito `medios` de Supabase y se sirven por URL pública.
- El sitio respeta `prefers-reduced-motion`.
- La navegación guarda la sección en la URL (`#portafolio`), así se pueden compartir enlaces directos.
- El panel está marcado como `noindex`, no aparece en buscadores.

## Costos

El plan gratuito de Supabase (500 MB de base, 1 GB de almacenamiento) y el de Netlify
(100 GB de tráfico) alcanzan de sobra para un sitio corporativo con formulario.
