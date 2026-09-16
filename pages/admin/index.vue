<template>
  <div class="page page--wide">
    <AdminTabs />
    <h1 style="margin-bottom:2px;">Painel <em>Admin</em></h1>
    <p class="muted">Marque o check ou arraste um card para arquivar um relatório.</p>

    <div v-if="loading" class="muted">Carregando...</div>
    <template v-else>
      <div class="kanban">
        <div
          class="kanban__col"
          :class="{ 'is-over': overCol === 'active' }"
          @dragover.prevent="overCol = 'active'"
          @dragleave="overCol = null"
          @drop="onDrop('active')"
        >
          <h3>Ativos</h3>
          <div v-if="!active.length" class="muted">Nenhum relatório ativo.</div>
          <details v-for="(g, idx) in activeGroups" :key="g.label" class="group" :open="idx === 0">
            <summary>{{ g.label }} <span class="count">{{ g.items.length }}</span></summary>
            <div class="group__body">
              <div
                v-for="c in g.items"
                :key="c.id"
                class="kanban__card"
                :style="{ borderLeft: `4px solid ${c.color || 'var(--line)'}` }"
                draggable="true"
                @dragstart="dragId = c.id"
              >
                <div class="kanban__card-row">
                  <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;min-width:0;">
                    <input type="checkbox" style="width:auto;margin-top:3px;" @change="archive(c.id, true)" />
                    <span style="min-width:0;">
                      <strong>{{ c.label }}</strong>
                      <span v-if="c.is_recurring" class="badge badge--done" style="margin-left:6px;">Recorrente</span>
                      <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }}</div>
                    </span>
                  </label>
                  <details class="card-menu">
                    <summary>⋮</summary>
                    <div class="card-menu__list">
                      <NuxtLink :to="`/admin/status/${c.id}`" class="btn btn--ghost">Status</NuxtLink>
                      <NuxtLink :to="`/admin/report/${c.id}`" class="btn btn--ghost">Relatório</NuxtLink>
                      <NuxtLink :to="`/admin/celebrations?edit=${c.id}`" class="btn btn--ghost">Editar</NuxtLink>
                      <button class="btn btn--danger" @click.stop="remove(c.id)">Excluir</button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </details>
        </div>

        <div
          class="kanban__col"
          :class="{ 'is-over': overCol === 'archived' }"
          @dragover.prevent="overCol = 'archived'"
          @dragleave="overCol = null"
          @drop="onDrop('archived')"
        >
          <h3>Arquivados</h3>
          <div v-if="!archivedList.length" class="muted">Nenhum relatório arquivado.</div>
          <details v-for="(g, idx) in archivedGroups" :key="g.label" class="group group--muted" :open="idx === 0">
            <summary>{{ g.label }} <span class="count">{{ g.items.length }}</span></summary>
            <div class="group__body">
              <div
                v-for="c in g.items"
                :key="c.id"
                class="kanban__card"
                :style="{ borderLeft: `4px solid ${c.color || 'var(--line)'}` }"
                draggable="true"
                @dragstart="dragId = c.id"
              >
                <div class="kanban__card-row">
                  <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;min-width:0;">
                    <input type="checkbox" checked style="width:auto;margin-top:3px;" @change="archive(c.id, false)" />
                    <span style="min-width:0;">
                      <strong>{{ c.label }}</strong>
                      <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }}</div>
                    </span>
                  </label>
                  <details class="card-menu">
                    <summary>⋮</summary>
                    <div class="card-menu__list">
                      <NuxtLink :to="`/admin/report/${c.id}`" class="btn btn--ghost">Relatório</NuxtLink>
                      <NuxtLink :to="`/admin/celebrations?edit=${c.id}`" class="btn btn--ghost">Editar</NuxtLink>
                      <button class="btn btn--danger" @click.stop="remove(c.id)">Excluir</button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const celebrations = ref<any[]>([]);
const loading = ref(true);
const dragId = ref<string | null>(null);
const overCol = ref<string | null>(null);

const active = computed(() =>
  celebrations.value.filter((c) => c.date && !c.archived).sort((a, b) => (a.date || "").localeCompare(b.date || ""))
);
const archivedList = computed(() =>
  celebrations.value.filter((c) => c.date && c.archived).sort((a, b) => (b.date || "").localeCompare(a.date || ""))
);

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function monthLabel(d: string) {
  if (!d) return "Sem data";
  const [y, m] = d.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}
function groupByMonth(list: any[]) {
  const map = new Map<string, any[]>();
  for (const c of list) {
    const key = monthLabel(c.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}
const activeGroups = computed(() => groupByMonth(active.value));
const archivedGroups = computed(() => groupByMonth(archivedList.value));

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
  loading.value = true;
  const token = await getToken();
  celebrations.value = await call("/celebrations?all=true", { token });
  loading.value = false;
}

async function archive(id: string, archived: boolean) {
  const token = await getToken();
  await call(`/celebrations/${id}`, { method: "PUT", token, body: { archived } });
  await load();
}

async function onDrop(target: "active" | "archived") {
  overCol.value = null;
  if (!dragId.value) return;
  await archive(dragId.value, target === "archived");
  dragId.value = null;
}

async function remove(id: string) {
  if (!confirm("Excluir este relatório e todos os registros ligados a ele?")) return;
  const token = await getToken();
  await call(`/celebrations/${id}`, { method: "DELETE", token });
  await load();
}

onMounted(load);
</script>
