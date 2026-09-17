<template>
  <div class="page page--wide">
    <AdminTabs />
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Casa <em>Pastoral</em></h1>
      <NuxtLink to="/admin/pastoral/perguntas" class="btn btn--ghost">Editar perguntas</NuxtLink>
    </div>
    <p class="muted">Fichas de atendimento respondidas.</p>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!submissions.length" class="empty">Nenhuma ficha respondida ainda.</div>

    <details v-for="(g, idx) in groups" :key="g.label" class="group" :open="idx === 0">
      <summary>{{ g.label }} <span class="count">{{ g.items.length }}</span></summary>
      <div class="group__body">
        <NuxtLink
          v-for="s in g.items"
          :key="s.id"
          :to="'/admin/pastoral/' + s.id"
          class="card card--clickable"
          style="display:block;"
        >
          <div class="list-item" style="border:none;padding:0;">
            <span>
              <strong>{{ s.attended_name || "Sem nome" }}</strong>
              <div class="muted">Atendido por {{ s.attended_by || "—" }} · {{ formatDateTime(s.submitted_at) }}</div>
            </span>
          </div>
        </NuxtLink>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const submissions = ref<any[]>([]);
const loading = ref(true);

function monthLabel(ts: string) {
  if (!ts) return "Sem data";
  const label = new Date(ts).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateTime(ts: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

const groups = computed(() => {
  const map = new Map<string, any[]>();
  for (const s of submissions.value) {
    const key = monthLabel(s.submitted_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
});

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  submissions.value = await call("/pastoral-submissions", { token });
  loading.value = false;
}

onMounted(load);
</script>
