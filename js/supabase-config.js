/* ============================================================
   Conexión con Supabase.
   Reemplace los dos valores con los de su proyecto:
   Supabase → Project Settings → API
   (la clave "anon" es pública por diseño; no ponga aquí la service_role)
   ============================================================ */
window.SUPABASE_CONFIG = {
  url: 'https://ovqkhyvyfmyaoccfskjq.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cWtoeXZ5Zm15YW9jY2Zza2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NzU3OTAsImV4cCI6MjEwNDA1MTc5MH0.t-8xufLyVNh-tsdrYGOONqm9PhU6WCq_sRCpp8Brhrw'
};

window.crearCliente = function () {
  var c = window.SUPABASE_CONFIG;
  if (!c.url || c.url.indexOf('SU-PROYECTO') !== -1) return null;
  if (!window.supabase) return null;
  return window.supabase.createClient(c.url, c.anonKey);
};
