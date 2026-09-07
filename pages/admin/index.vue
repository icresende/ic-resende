<template>
  <div class="page page--wide">
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Painel <em>Admin</em></h1>
      <div>
        <NuxtLink to="/admin/ministries" class="btn btn--ghost">Ministérios</NuxtLink>
        <NuxtLink to="/admin/celebrations" class="btn btn--ghost">Celebrações</NuxtLink>
        <NuxtLink to="/admin/dashboard" class="btn btn--ghost">Dashboard</NuxtLink>
        <NuxtLink to="/admin/organograma" class="btn btn--primary">Organograma</NuxtLink>
      </div>
    </div>
    <p class="muted">Marque o check ou arraste um card para arquivar uma celebração.</p>

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
          <h3>Ativas</h3>
          <div v-if="!active.length" class="muted">Nenhuma celebração ativa.</div>
          <div
            v-for="c in active"
            :key="c.id"
            class="kanban__card"
            :style="{ borderLeft: `4px solid ${c.color || 'var(--line)'}` }"
            draggable="true"
            @dragstart="dragId = c.id"
          >
            <div class="list-item" style="border:none;padding:0;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" style="width:auto;" @change="archive(c.id, true)" />
                <span>
                  <strong>{{ c.label }}</strong>
                  <span v-if="c.is_recurring" class="badge badge--done" style="margin-left:6px;">Recorrente</span>
                  <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }}</div>
                </span>
              </label>
              <div>
                <NuxtLink :to="`/admin/status/${c.id}`" class="btn btn--ghost">Status</NuxtLink>
                <NuxtLink :to="`/admin/report/${c.id}`" class="btn btn--ghost">Relatório</NuxtLink>
                <NuxtLink :to="`/admin/celebrations?edit=${c.id}`" class="btn btn--ghost">Editar</NuxtLink>
                <button class="btn btn--danger" @click.stop="remove(c.id)">Excluir</button>
              </div>
            </div>
          </div>
        </div>

        <div
          class="kanban__col"
          :class="{ 'is-over': overCol === 'archived' }"
          @dragover.prevent="overCol = 'archived'"
          @dragleave="overCol = null"
          @drop="onDrop('archived')"
        >
          <h3>Arquivadas</h3>
          <div v-if="!archivedList.length" class="muted">Nenhuma celebração arquivada.</div>
          <div
            v-for="c in archivedList"
            :key="c.id"
            class="kanban__card"
            :style="{ borderLeft: `4px solid ${c.color || 'var(--line)'}` }"
            draggable="true"
            @dragstart="dragId = c.id"
          >
            <div class="list-item" style="border:none;padding:0;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" checked style="width:auto;" @change="archive(c.id, false)" />
                <span>
                  <strong>{{ c.label }}</strong>
                  <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }}</div>
                </span>
              </label>
              <div>
                <NuxtLink :to="`/admin/report/${c.id}`" class="btn btn--ghost">Relatório</NuxtLink>
                <NuxtLink :to="`/admin/celebrations?edit=${c.id}`" class="btn btn--ghost">Editar</NuxtLink>
                <button class="btn btn--danger" @click.stop="remove(c.id)">Excluir</button>
              </div>
            </div>
          </div>
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

const active = computed(() => celebrations.value.filter((c) => c.date && !c.archived));
const archivedList = computed(() => celebrations.value.filter((c) => c.date && c.archived));

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
  if (!confirm("Excluir esta celebração e todos os registros ligados a ela?")) return;
  const token = await getToken();
  await call(`/celebrations/${id}`, { method: "DELETE", token });
  await load();
}

onMounted(load);
</script>
