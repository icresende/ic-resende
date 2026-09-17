<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin/pastoral" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Perguntas da <em>Casa Pastoral</em></h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="card">
      <h2>{{ editingId ? "Editar pergunta" : "Nova pergunta" }}</h2>
      <div class="field">
        <label>Etapa</label>
        <select v-model.number="form.stage">
          <option :value="1">1 · Pessoa atendida</option>
          <option :value="2">2 · Atendimento</option>
        </select>
      </div>
      <div class="field">
        <label>Pergunta</label>
        <input v-model="form.label" type="text" placeholder="Ex: Nome completo" />
      </div>
      <div class="field">
        <label>Tipo de resposta</label>
        <select v-model="form.type">
          <option value="text">Texto curto</option>
          <option value="textarea">Texto longo</option>
          <option value="phone">Whatsapp</option>
          <option value="single_select">Escolha única (oval)</option>
          <option value="multi_select">Múltipla escolha (marque todas)</option>
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

    <h2>Etapa 1 · Pessoa atendida</h2>
    <div v-for="f in stage1" :key="f.id" class="card">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ f.label }}</strong>
          <span class="pastoral-type-tag">{{ typeLabel(f.type) }}</span>
          <span v-if="f.required" class="pastoral-required">*</span>
        </div>
        <div>
          <button class="btn btn--ghost" @click="startEdit(f)">Editar</button>
          <button class="btn btn--danger" @click="remove(f.id)">Excluir</button>
        </div>
      </div>
    </div>

    <h2>Etapa 2 · Atendimento</h2>
    <div v-for="f in stage2" :key="f.id" class="card">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ f.label }}</strong>
          <span class="pastoral-type-tag">{{ typeLabel(f.type) }}</span>
          <span v-if="f.required" class="pastoral-required">*</span>
        </div>
        <div>
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

const emptyForm = () => ({ stage: 1, label: "", type: "text", required: true });
const form = reactive(emptyForm());

const stage1 = computed(() => fields.value.filter((f) => f.stage === 1).sort((a, b) => a.sort_order - b.sort_order));
const stage2 = computed(() => fields.value.filter((f) => f.stage === 2).sort((a, b) => a.sort_order - b.sort_order));

function typeLabel(type: string) {
  return { text: "Texto curto", textarea: "Texto longo", phone: "Whatsapp", single_select: "Escolha única", multi_select: "Múltipla escolha" }[type] || type;
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
  const token = await getToken();
  fields.value = await call("/pastoral-fields?all=true", { token });
  loading.value = false;
}

function startEdit(f: any) {
  editingId.value = f.id;
  form.stage = f.stage;
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
      await call("/pastoral-fields/" + editingId.value, {
        method: "PUT",
        token,
        body: { stage: form.stage, label: form.label, type: form.type, options, required: form.required },
      });
      successMsg.value = "Pergunta atualizada!";
    } else {
      const key = slugify(form.label);
      const sameStage = fields.value.filter((f) => f.stage === form.stage);
      await call("/pastoral-fields", {
        method: "POST",
        token,
        body: {
          stage: form.stage,
          key,
          label: form.label,
          type: form.type,
          options,
          required: form.required,
          sort_order: sameStage.length + 1,
        },
      });
      successMsg.value = "Pergunta criada!";
    }
    cancelEdit();
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao salvar pergunta.";
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  if (!confirm("Excluir esta pergunta? Ela deixará de aparecer no formulário.")) return;
  const token = await getToken();
  await call("/pastoral-fields/" + id, { method: "DELETE", token });
  await load();
}

onMounted(load);
</script>
