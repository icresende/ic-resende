<template>
  <div class="page page--wide">
    <AdminTabs />
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Casa <em>Pastoral</em></h1>
      <NuxtLink to="/admin/pastoral/perguntas" class="btn btn--ghost">Editar perguntas</NuxtLink>
    </div>
    <p class="muted">Etapas vinculadas aparecem como uma ficha só. As soltas ficam em “Sem vínculo”.</p>

    <div class="tabs">
      <button class="tab" :class="{ 'is-active': filter === 'all' }" @click="filter = 'all'">Todas</button>
      <button class="tab" :class="{ 'is-active': filter === 'unlinked' }" @click="filter = 'unlinked'">Sem vínculo</button>
      <button class="tab" :class="{ 'is-active': filter === '1' }" @click="filter = '1'">Etapa 1</button>
      <button class="tab" :class="{ 'is-active': filter === '2' }" @click="filter = '2'">Etapa 2</button>
    </div>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!filtered.length" class="empty">Nenhuma ficha encontrada.</div>

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
          <div>
            <strong>{{ s.attended_name || "Sem nome" }}</strong>
            <span v-if="s.merged" class="badge badge--done" style="margin-left:6px;">Ficha completa</span>
            <template v-else>
              <span class="badge" :class="s.stage === 1 ? 'badge--pending' : 'badge--done'" style="margin-left:6px;">
                Etapa {{ s.stage }}
              </span>
              <span class="badge badge--pending" style="margin-left:6px;">Sem vínculo</span>
            </template>
          </div>
          <div class="muted">
            <template v-if="s.attended_by">Atendido por {{ s.attended_by }} · </template>
            {{ formatDateTime(s.submitted_at) }}
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
const filter = ref<"all" | "unlinked" | "1" | "2">("all");

function monthLabel(ts: string) {
  if (!ts) return "Sem data";
  const label = new Date(ts).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateTime(ts: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

// Junta as duas etapas vinculadas em um único item ("ficha completa")
function buildDisplayItems(list: any[]) {
  const byId = new Map(list.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const items: any[] = [];

  for (const s of list) {
    if (seen.has(s.id)) continue;

    if (s.linked_id && byId.has(s.linked_id)) {
      const other = byId.get(s.linked_id);
      seen.add(s.id);
      seen.add(other.id);
      const stage1 = s.stage === 1 ? s : other;
      const stage2 = s.stage === 2 ? s : other;
      items.push({
        id: stage1.id,
        attended_name: stage1.attended_name || stage2.attended_name || "",
        attended_by: stage2.attended_by || "",
        submitted_at: [s.submitted_at, other.submitted_at].sort().pop(),
        merged: true,
      });
    } else {
      seen.add(s.id);
      items.push({ ...s, merged: false });
    }
  }
  return items;
}

const displayItems = computed(() => buildDisplayItems(submissions.value));

const filtered = computed(() => {
  if (filter.value === "unlinked") return displayItems.value.filter((s) => !s.merged);
  if (filter.value === "1" || filter.value === "2") {
    return displayItems.value.filter((s) => !s.merged && s.stage === Number(filter.value));
  }
  return displayItems.value;
});

const groups = computed(() => {
  const map = new Map<string, any[]>();
  for (const s of filtered.value) {
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
