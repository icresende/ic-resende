<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin/pastoral" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else-if="submission">
      <div class="list-item" style="border:none;padding:0 0 8px;">
        <h1 style="margin:0;">{{ submission.attended_name || "Sem nome" }}</h1>
        <div>
          <button v-if="!editing" class="btn btn--ghost" @click="startEdit">Editar</button>
          <button class="btn btn--danger" @click="remove">Excluir</button>
        </div>
      </div>
      <p class="muted">Atendido por {{ submission.attended_by || "—" }} · {{ formatDateTime(submission.submitted_at) }}</p>

      <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>

      <div class="card">
        <h2>1. Pessoa atendida</h2>
        <template v-for="(item, i) in (editing ? editStage1 : submission.stage1_data)" :key="'s1-' + i">
          <div v-if="!editing" class="pastoral-answer">
            <div class="pastoral-answer__label">{{ item.label }}</div>
            <div class="pastoral-answer__value">{{ displayValue(item.value) }}</div>
          </div>
          <div v-else class="field">
            <label>{{ item.label }}</label>
            <textarea v-if="Array.isArray(item.value) || item.type === 'textarea'" v-model="editableValue(item).value" rows="2" />
            <input v-else v-model="editableValue(item).value" type="text" />
          </div>
        </template>
      </div>

      <div class="card">
        <h2>2. Atendimento</h2>
        <template v-for="(item, i) in (editing ? editStage2 : submission.stage2_data)" :key="'s2-' + i">
          <div v-if="!editing" class="pastoral-answer">
            <div class="pastoral-answer__label">{{ item.label }}</div>
            <div class="pastoral-answer__value">{{ displayValue(item.value) }}</div>
          </div>
          <div v-else class="field">
            <label>{{ item.label }}</label>
            <textarea v-if="Array.isArray(item.value) || item.type === 'textarea'" v-model="editableValue(item).value" rows="2" />
            <input v-else v-model="editableValue(item).value" type="text" />
          </div>
        </template>
      </div>

      <template v-if="editing">
        <button class="btn btn--primary" :disabled="saving" @click="save">{{ saving ? "Salvando..." : "Salvar" }}</button>
        <button class="btn btn--ghost" style="margin-left:8px;" @click="editing = false">Cancelar</button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

const submission = ref<any>(null);
const loading = ref(true);
const editing = ref(false);
const saving = ref(false);
const errorMsg = ref("");

const editStage1 = ref<any[]>([]);
const editStage2 = ref<any[]>([]);

function displayValue(value: any) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value || "—";
}

function editableValue(item: any) {
  return {
    get value() {
      return Array.isArray(item.value) ? item.value.join(", ") : item.value;
    },
    set value(v: string) {
      item.value = item._wasArray ? v.split(",").map((s: string) => s.trim()).filter(Boolean) : v;
    },
  };
}

function formatDateTime(ts: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  submission.value = await call("/pastoral-submissions/" + route.params.id, { token });
  loading.value = false;
}

function startEdit() {
  errorMsg.value = "";
  editStage1.value = (submission.value.stage1_data || []).map((f: any) => ({ ...f, _wasArray: Array.isArray(f.value) }));
  editStage2.value = (submission.value.stage2_data || []).map((f: any) => ({ ...f, _wasArray: Array.isArray(f.value) }));
  editing.value = true;
}

async function save() {
  saving.value = true;
  errorMsg.value = "";
  try {
    const token = await getToken();
    const clean = (arr: any[]) => arr.map(({ _wasArray, ...rest }) => rest);
    await call("/pastoral-submissions/" + route.params.id, {
      method: "PUT",
      token,
      body: {
        stage1_data: clean(editStage1.value),
        stage2_data: clean(editStage2.value),
      },
    });
    editing.value = false;
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm("Excluir esta ficha de atendimento? Essa ação não pode ser desfeita.")) return;
  const token = await getToken();
  await call("/pastoral-submissions/" + route.params.id, { method: "DELETE", token });
  router.push("/admin/pastoral");
}

onMounted(load);
</script>
