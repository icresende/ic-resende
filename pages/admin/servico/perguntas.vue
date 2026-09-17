<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin/servico" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Perguntas da <em>Ficha de Serviço</em></h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="card">
      <h2>{{ editingId ? "Editar pergunta" : "Nova pergunta" }}</h2>
      <div class="field">
        <label>Pergunta</label>
        <input v-model="form.label" type="text" placeholder="Ex: Materiais utilizados" />
      </div>
      <div class="field">
        <label>Tipo de resposta</label>
        <select v-model="form.type">
          <option value="text">Texto curto</option>
          <option value="textarea">Texto longo</option>
          <option value="number">Número</option>
          <option value="date">Data</option>
          <option value="phone">Whatsapp</option>
          <option value="single_select">Escolha única</option>
          <option value="multi_select">Múltipla escolha</option>
        </select>
      </div>
      <div v-if="form.type === 'single_select' || form.type === 'multi_select'" class="field">
        <label>Opções (uma por linha)</label>
        <textarea v-model="optionsText" rows="4" placeholder="Opção 1&#10;Opção 2"></textarea>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;color:var(--green-900);font-weight:600;margin-bottom:16px;">
        <input v-model="form.required" type="checkbox" style="width:auto;" /> Obrigatória
      </label>
      <button class="btn btn--primary" :disabled="saving" @click="save">
        {{ saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar pergunta" }}
      </button>
      <button v-if="editingId" class="btn btn--ghost" style="margin-left:8px;" @click="cancelEdit">Cancelar</button>
    </div>

    <h2>Perguntas da ficha</h2>
    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!ordered.length" class="empty">Nenhuma pergunta cadastrada.</div>
    <div v-for="(f, i) in ordered" :key="f.id" class="card">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ f.label }}</strong>
          <span class="pastoral-type-tag">{{ typeLabel(f.type) }}</span>
          <span v-if="f.required" class="pastoral-required">*</span>
        </div>
        <div>
          <button class="btn btn--ghost" :disabled="i === 0" @click="move(i, -1)">↑</button>
          <button class="btn btn--ghost" :disabled="i === ordered.length - 1" @click="move(i, 1)">↓</button>
          <button class="btn btn--ghost" @click="startEdit(f)">Editar</button>
          <button class="btn btn--danger" @click="remove(f.id)">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const fields = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const editingId = ref<string | null>(null);
const optionsText = ref("");

const emptyForm = () => ({ label: "", type: "text", required: true });
const form = reactive(emptyForm());

const ordered = computed(() => [...fields.value].sort((a, b) => a.sort_order - b.sort_order));

function typeLabel(type: string) {
  return {
    text: "Texto curto",
    textarea: "Texto longo",
    number: "Número",
    date: "Data",
    phone: "Whatsapp",
    single_select: "Escolha única",
    multi_select: "Múltipla escolha",
  }[type] || type;
}

function slugify(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "pergunta";
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  fields.value = await call("/service-fields");
  loading.value = false;
}

function startEdit(f: any) {
  editingId.value = f.id;
  form.label = f.label;
  form.type = f.type;
  form.required = f.required;
  optionsText.value = (f.options || []).join("\n");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  optionsText.value = "";
}

async function save() {
  errorMsg.value = "";
  successMsg.value = "";
  if (!form.label.trim()) {
    errorMsg.value = "Preencha o texto da pergunta.";
    return;
  }
  const options = optionsText.value.split("\n").map((o) => o.trim()).filter(Boolean);
  if ((form.type === "single_select" || form.type === "multi_select") && !options.length) {
    errorMsg.value = "Adicione ao menos uma opção.";
    return;
  }
  saving.value = true;
  try {
    const token = await getToken();
    if (editingId.value) {
      await call("/service-fields/" + editingId.value, {
        method: "PUT",
        token,
        body: { label: form.label, type: form.type, options, required: form.required },
      });
      successMsg.value = "Pergunta atualizada!";
    } else {
      let key = slugify(form.label);
      if (fields.value.some((f) => f.key === key)) key = key + "_" + Date.now().toString().slice(-4);
      await call("/service-fields", {
        method: "POST",
        token,
        body: { key, label: form.label, type: form.type, options, required: form.required, sort_order: fields.value.length + 1 },
      });
      successMsg.value = "Pergunta criada!";
    }
    cancelEdit();
    await load();
  } catch {
    errorMsg.value = "Erro ao salvar pergunta.";
  } finally {
    saving.value = false;
  }
}

async function move(index: number, delta: number) {
  const list = [...ordered.value];
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  const token = await getToken();
  for (let i = 0; i < list.length; i++) {
    if (list[i].sort_order !== i + 1) {
      await call("/service-fields/" + list[i].id, { method: "PUT", token, body: { sort_order: i + 1 } });
    }
  }
  await load();
}

async function remove(id: string) {
  if (!confirm("Excluir esta pergunta? Ela deixará de aparecer na ficha.")) return;
  const token = await getToken();
  await call("/service-fields/" + id, { method: "DELETE", token });
  await load();
}

onMounted(load);
</script>
