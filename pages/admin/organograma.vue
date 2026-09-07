<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Organograma</h1>
    <p class="muted">Clique num item para editar. Arraste um ministério para mudar de categoria.</p>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else>
      <div class="org-leadership">Liderança da Igreja</div>

      <div style="text-align:center;margin:20px 0 28px;">
        <button v-if="!addingBlue" class="btn btn--primary" @click="addingBlue = true">+ Nova categoria</button>
        <div v-else class="card" style="max-width:340px;margin:0 auto;text-align:left;">
          <div class="field"><label>Nome da categoria</label><input v-model="newBlueTitle" /></div>
          <button class="btn btn--primary" @click="saveBlue">Salvar</button>
          <button class="btn btn--ghost" style="margin-left:8px;" @click="addingBlue = false">Cancelar</button>
        </div>
      </div>

      <div class="org-tree">
        <div v-for="(blue, i) in blueNodes" :key="blue.id" class="org-category">
          <div class="org-category__head">
            <span>{{ blue.title }}</span>
            <div>
              <button class="btn btn--ghost" @click="toggleAddWhite(blue.id)">+</button>
              <button class="btn btn--ghost" style="margin-left:4px;" @click="toggleEditBlue(blue)">✎</button>
            </div>
          </div>

          <div
            class="org-node"
            :style="{ '--accent': accentFor(i) }"
            @dragover.prevent
            @drop="onDrop(blue.id)"
          >
            <template v-if="editingBlueId === blue.id">
              <input v-model="editForm.title" class="org-inline-input" placeholder="Título" />
              <input v-model="editForm.leader_name" class="org-inline-input" placeholder="Líder do ministério" />
              <button class="btn btn--primary" style="padding:5px 10px;font-size:0.75rem;" @click="saveBlueEdit(blue.id)">Salvar</button>
              <button class="btn btn--danger" style="padding:5px 10px;font-size:0.75rem;margin-left:4px;" @click="remove(blue.id)">Excluir</button>
            </template>
            <template v-else>
              <div class="org-node__title">{{ blue.title }}</div>
              <div class="org-node__count">{{ childrenOf(blue.id).length }} ministério(s)</div>
              <div class="org-node__leader">
                👑 {{ blue.leader_name || "Sem líder definido" }}
              </div>
            </template>
          </div>

          <div v-if="addingWhiteFor === blue.id" class="org-add-form">
            <input v-model="newWhiteTitle" class="org-inline-input" placeholder="Nome do ministério" />
            <button class="btn btn--primary" style="padding:5px 10px;font-size:0.75rem;" @click="saveWhite(blue.id)">Salvar</button>
            <button class="btn btn--ghost" style="padding:5px 10px;font-size:0.75rem;margin-left:4px;" @click="addingWhiteFor = null">Cancelar</button>
          </div>

          <div class="org-members" @dragover.prevent @drop="onDrop(blue.id)">
            <div
              v-for="w in childrenOf(blue.id)"
              :key="w.id"
              class="org-member"
              :class="{ 'is-editing': editingId === w.id }"
              :style="{ '--accent': accentFor(i) }"
              :draggable="editingId !== w.id"
              @dragstart="dragId = w.id"
              @click="toggleEdit(w)"
            >
              <template v-if="editingId === w.id">
                <input v-model="editForm.title" class="org-inline-input" placeholder="Título" @click.stop />
                <input v-model="editForm.leader_name" class="org-inline-input" placeholder="Líder do ministério" @click.stop />
                <div @click.stop>
                  <button class="btn btn--primary" style="padding:4px 8px;font-size:0.72rem;" @click="saveEdit(w.id)">Salvar</button>
                  <button class="btn btn--danger" style="padding:4px 8px;font-size:0.72rem;margin-left:4px;" @click="remove(w.id)">Excluir</button>
                </div>
              </template>
              <template v-else>
                <span class="org-member__dot" />
                <span class="org-member__text">
                  <strong>{{ w.title }}</strong>
                  <span class="org-member__leaders">
                    👤 {{ w.leader_name || "Sem líder" }}
                  </span>
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-if="orphans.length" class="org-category" style="margin-top:30px;">
        <div class="org-category__head"><span>Sem categoria</span></div>
        <div class="org-members" @dragover.prevent @drop="onDrop(null)">
          <div
            v-for="w in orphans"
            :key="w.id"
            class="org-member"
            draggable="true"
            @dragstart="dragId = w.id"
          >
            <span class="org-member__dot" />
            <span class="org-member__text">{{ w.title }}</span>
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

const nodes = ref<any[]>([]);
const loading = ref(true);
const dragId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editingBlueId = ref<string | null>(null);
const editForm = reactive<any>({});
const addingBlue = ref(false);
const newBlueTitle = ref("");
const addingWhiteFor = ref<string | null>(null);
const newWhiteTitle = ref("");

const ACCENTS = ["#146356", "#8a4b3a", "#2c3e6b", "#6b4b8a", "#8a6b1e", "#1e6b8a", "#4b6b3a", "#7a3a5a"];
function accentFor(i: number) {
  return ACCENTS[i % ACCENTS.length];
}

const blueNodes = computed(() => nodes.value.filter((n) => n.color === "blue").sort((a, b) => a.sort_order - b.sort_order));
const orphans = computed(() => nodes.value.filter((n) => n.color === "white" && !n.parent_id));

function childrenOf(parentId: string) {
  return nodes.value
    .filter((n) => n.color === "white" && n.parent_id === parentId)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  nodes.value = await call("/org-nodes", { token });
  loading.value = false;
}

function toggleEdit(node: any) {
  if (editingId.value === node.id) {
    editingId.value = null;
    return;
  }
  editingId.value = node.id;
  editForm.title = node.title;
  editForm.leader_name = node.leader_name;
}

function toggleEditBlue(node: any) {
  if (editingBlueId.value === node.id) {
    editingBlueId.value = null;
    return;
  }
  editingBlueId.value = node.id;
  editForm.title = node.title;
  editForm.leader_name = node.leader_name;
}

function toggleAddWhite(blueId: string) {
  addingWhiteFor.value = addingWhiteFor.value === blueId ? null : blueId;
  newWhiteTitle.value = "";
}

async function saveEdit(id: string) {
  const token = await getToken();
  await call(`/org-nodes/${id}`, { method: "PUT", token, body: { ...editForm } });
  editingId.value = null;
  await load();
}

async function saveBlueEdit(id: string) {
  const token = await getToken();
  await call(`/org-nodes/${id}`, { method: "PUT", token, body: { title: editForm.title, leader_name: editForm.leader_name } });
  editingBlueId.value = null;
  await load();
}

async function remove(id: string) {
  if (!confirm("Excluir este item do organograma?")) return;
  const token = await getToken();
  await call(`/org-nodes/${id}`, { method: "DELETE", token });
  editingId.value = null;
  editingBlueId.value = null;
  await load();
}

async function saveBlue() {
  if (!newBlueTitle.value.trim()) return;
  const token = await getToken();
  await call("/org-nodes", {
    method: "POST",
    token,
    body: { title: newBlueTitle.value, color: "blue", sort_order: blueNodes.value.length + 1 },
  });
  newBlueTitle.value = "";
  addingBlue.value = false;
  await load();
}

async function saveWhite(parentId: string) {
  if (!newWhiteTitle.value.trim()) return;
  const token = await getToken();
  await call("/org-nodes", {
    method: "POST",
    token,
    body: { title: newWhiteTitle.value, color: "white", parent_id: parentId, sort_order: childrenOf(parentId).length + 1 },
  });
  newWhiteTitle.value = "";
  addingWhiteFor.value = null;
  await load();
}

async function onDrop(parentId: string | null) {
  if (!dragId.value) return;
  const token = await getToken();
  await call(`/org-nodes/${dragId.value}`, { method: "PUT", token, body: { parent_id: parentId } });
  dragId.value = null;
  await load();
}

onMounted(load);
</script>
