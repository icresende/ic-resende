export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;
  if (to.path === "/admin/login") return;

  const supabase = useSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return navigateTo("/admin/login");
  }
});
