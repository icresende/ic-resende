<template>
  <div class="admin-tabs">
    <NuxtLink to="/admin" class="btn" :class="isActive('/admin') ? 'btn--primary' : 'btn--ghost'">Painel</NuxtLink>
    <NuxtLink to="/admin/celebrations" class="btn" :class="isActive('/admin/celebrations') ? 'btn--primary' : 'btn--ghost'">Relatórios</NuxtLink>
    <NuxtLink to="/admin/ministries" class="btn" :class="isActive('/admin/ministries') ? 'btn--primary' : 'btn--ghost'">Ministérios</NuxtLink>
    <NuxtLink to="/admin/dashboard" class="btn" :class="isActive('/admin/dashboard') ? 'btn--primary' : 'btn--ghost'">Dashboard</NuxtLink>
    <NuxtLink to="/admin/organograma" class="btn" :class="isActive('/admin/organograma') ? 'btn--primary' : 'btn--ghost'">Organograma</NuxtLink>
    <NuxtLink to="/admin/pastoral" class="btn" :class="isActive('/admin/pastoral') ? 'btn--primary' : 'btn--ghost'">Casa Pastoral</NuxtLink>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
function isActive(path: string) {
  if (path === "/admin") return route.path === "/admin";
  return route.path.startsWith(path);
}
</script>
