<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Ministérios</h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="card">
      <h2>{{ editingId ? "Editar ministério" : "Novo ministério" }}</h2>
      <div class="field">
        <label>Nome do ministério</label>
        <input v-model="form.name" type="text" placeholder="Ex: Comunicação" />
      </div>

      <label style="font-size:0.86rem;font-weight:600;color:var(--green-900);">Campos do formulário</label>
      <div v-for="(f, i) in form.fields" :key="i" class="field" style="display:flex;gap:8px;align-items:end;">
        <div style="flex:1;">
          <label>O que o voluntário vai preencher</label>
          <input v-model="f.label" type="text" placeholder="Ex: Voluntários presentes" />
        </div>
        <button class="btn btn--ghost" @click="form.fields.splice(i,1)">Remover</button>
      </div>
      <button class="btn btn--ghost" @click="addField">+ Adicionar campo</button>
      <br /><br />
      <button class="btn btn--primary" :disabled="saving" @click="save">
        {{ saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar ministério" }}
      </button>
      <button v-if="editingId" class="btn btn--ghost" style="margin-left:8px;" @click="cancelEdit">Cancelar</button>
    </div>

    <h2>Ministérios cadastrados</h2>
    <div v-if="loading" class="muted">Carregando...</div>
    <div v-for="m in ministries" :key="m.id" class="card">
      <div class="list-item" style="border:none;padding:0;align-items:flex-start;">
        <div>
          <strong>{{ m.name }}</strong>
          <span class="badge" :class="m.active ? 'badge--done' : 'badge--pending'" style="margin-left:8px;">
            {{ m.active ? "Ativo" : "Inativo" }}
          </span>
          <div class="muted">{{ (m.fields || []).map((f:any) => f.label).join(", ") }}</div>
        </div>
        <div>
          <button class="btn btn--ghost" @click="startEdit(m)">Editar</button>
          <button v-if="m.active" class="btn btn--ghost" @click="toggleActive(m, false)">Desativar</button>
          <button v-else class="btn btn--ghost" @click="toggleActive(m, true)">Ativar</button>
          <button class="btn btn--danger" @click="remove(m.id)">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const ministries = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const editingId = ref<string | null>(null);

const emptyForm = () => ({
  name: "",
  fields: [{ key: "presentes", label: "Voluntários presentes", type: "number", default: 0 }],
});

const form = reactive(emptyForm());

function addField() {
  form.fields.push({ key: "", label: "", type: "number", default: 0 });
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "campo";
}

function generateKeys(fields: { key?: string; label: string }[]) {
  const seen = new Set<string>();
  return fields.map((f) => {
    let key = f.key && f.key.trim() ? f.key : slugify(f.label);
    let n = 2;
    while (seen.has(key)) {
      key = `${f.key || slugify(f.label)}_${n}`;
      n++;
    }
    seen.add(key);
    return { ...f, key };
  });
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  ministries.value = await call("/ministries?all=true", { token });
  loading.value = false;
}

function startEdit(m: any) {
  editingId.value = m.id;
  form.name = m.name;
  form.fields = (m.fields || []).map((f: any) => ({ ...f }));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, emptyForm());
}

async function save() {
  errorMsg.value = "";
  if (!form.name || !form.fields.length || form.fields.some((f) => !f.label.trim())) {
    errorMsg.value = "Preencha o nome e o texto de todos os campos.";
    return;
  }
  form.fields = generateKeys(form.fields);
  saving.value = true;
  try {
    const token = await getToken();
    if (editingId.value) {
      await call(`/ministries/${editingId.value}`, {
        method: "PUT",
        token,
        body: { name: form.name, fields: form.fields },
      });
      successMsg.value = "Ministério atualizado!";
    } else {
      await call("/ministries", {
        method: "POST",
        token,
        body: { name: form.name, fields: form.fields, sort_order: ministries.value.length + 1 },
      });
      successMsg.value = "Ministério criado!";
    }
    cancelEdit();
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao salvar ministério.";
  } finally {
    saving.value = false;
  }
}

async function toggleActive(m: any, active: boolean) {
  const token = await getToken();
  await call(`/ministries/${m.id}`, { method: "PUT", token, body: { active } });
  await load();
}

async function remove(id: string) {
  if (!confirm("Excluir este ministério e todos os registros ligados a ele? Essa ação não pode ser desfeita.")) return;
  const token = await getToken();
  await call(`/ministries/${id}`, { method: "DELETE", token });
  await load();
}

onMounted(load);
</script>
