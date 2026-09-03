/* ============================================================
   Conexión con Supabase.
   Reemplace los dos valores con los de su proyecto:
   Supabase → Project Settings → API
   (la clave "anon" es pública por diseño; no ponga aquí la service_role)
   ============================================================ */
window.SUPABASE_CONFIG = {
  url: 'https://SU-PROYECTO.supabase.co',
  anonKey: 'SU_CLAVE_ANON_PUBLICA'
};

window.crearCliente = function () {
  var c = window.SUPABASE_CONFIG;
  if (!c.url || c.url.indexOf('SU-PROYECTO') !== -1) return null;
  if (!window.supabase) return null;
  return window.supabase.createClient(c.url, c.anonKey);
};
