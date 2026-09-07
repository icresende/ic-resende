<template>
  <div class="page">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Status do <em>Registro</em></h1>
    <p v-if="celebration" class="muted">{{ celebration.label }} · {{ formatDate(celebration.date) }}</p>

    <div v-if="loading" class="muted">Carregando...</div>
    <template v-else>
      <div class="progress-bar">
        <div class="progress-bar__fill" :style="{ width: progressPct + '%' }" />
      </div>
      <p class="muted">{{ doneCount }} de {{ statusList.length }} ministérios já registraram</p>

      <div class="card">
        <div v-for="s in statusList" :key="s.ministries.id" class="list-item">
          <span>{{ s.ministries.name }}</span>
          <span class="badge" :class="s.status === 'done' ? 'badge--done' : 'badge--pending'">
            {{ s.status === "done" ? "Registrado" : "Falta registrar" }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const route = useRoute();

const celebration = ref<any>(null);
const statusList = ref<any[]>([]);
const loading = ref(true);

const doneCount = computed(() => statusList.value.filter((s) => s.status === "done").length);
const progressPct = computed(() =>
  statusList.value.length ? Math.round((doneCount.value / statusList.value.length) * 100) : 0
);

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

onMounted(async () => {
  const id = route.params.id as string;
  const [c, s] = await Promise.all([call(`/celebrations/${id}`), call(`/celebrations/${id}/status`)]);
  celebration.value = c;
  statusList.value = s;
  loading.value = false;
});
</script>
