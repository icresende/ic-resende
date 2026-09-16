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
        <div v-for="s in statusList" :key="s.ministries.id" class="list-item" style="align-items:flex-start;">
          <span>{{ s.ministries.name }}</span>

          <template v-if="s.status === 'done'">
            <template v-if="confirmingId !== s.ministries.id">
              <span style="display:flex;align-items:center;gap:8px;">
                <span class="badge badge--done">Registrado</span>
                <button class="btn btn--ghost" style="padding:6px 10px;font-size:0.82rem;" @click="confirmingId = s.ministries.id">
                  Reabrir
                </button>
              </span>
            </template>
            <template v-else>
              <span style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                <span class="muted" style="font-size:0.82rem;text-align:right;">Apaga a resposta enviada e libera o formulário de novo. Confirma?</span>
                <span style="display:flex;gap:8px;">
                  <button class="btn btn--ghost" style="padding:6px 10px;font-size:0.82rem;" @click="confirmingId = null">Cancelar</button>
                  <button class="btn btn--danger" style="padding:6px 10px;font-size:0.82rem;" :disabled="reopening" @click="reopen(s.ministries.id)">
                    {{ reopening ? "Reabrindo..." : "Sim, reabrir" }}
                  </button>
                </span>
              </span>
            </template>
          </template>
          <span v-else class="badge badge--pending">Falta registrar</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const route = useRoute();

const celebration = ref<any>(null);
const statusList = ref<any[]>([]);
const loading = ref(true);
const confirmingId = ref<string | null>(null);
const reopening = ref(false);

const doneCount = computed(() => statusList.value.filter((s) => s.status === "done").length);
const progressPct = computed(() =>
  statusList.value.length ? Math.round((doneCount.value / statusList.value.length) * 100) : 0
);

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  const id = route.params.id as string;
  const [c, s] = await Promise.all([call(`/celebrations/${id}`), call(`/celebrations/${id}/status`)]);
  celebration.value = c;
  statusList.value = s;
  loading.value = false;
}

async function reopen(ministryId: string) {
  reopening.value = true;
  try {
    const id = route.params.id as string;
    const token = await getToken();
    await call(`/celebrations/${id}/status/${ministryId}`, { method: "DELETE", token });
    confirmingId.value = null;
    await load();
  } finally {
    reopening.value = false;
  }
}

onMounted(load);
</script>
