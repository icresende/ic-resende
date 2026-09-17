<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin/servico" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else-if="submission">
      <div class="list-item" style="border:none;padding:0 0 8px;">
        <h1 style="margin:0;">{{ submission.respondent_name || "Sem nome" }}</h1>
        <div>
          <button v-if="!editing" class="btn btn--ghost" @click="startEdit">Editar</button>
          <button class="btn btn--danger" @click="remove">Excluir</button>
        </div>
      </div>
      <p class="muted">{{ formatDateTime(submission.submitted_at) }}</p>

      <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>

      <div class="card">
        <template v-for="(item, i) in (editing ? editData : submission.data)" :key="'f-' + i">
          <div v-if="!editing" class="pastoral-answer">
            <div class="pastoral-answer__label">{{ item.label }}</div>
            <div class="pastoral-answer__value">{{ displayValue(item.value) }}</div>
          </div>
          <div v-else class="field">
            <label>{{ item.label }}</label>
            <textarea v-if="Array.isArray(item.value) || item.type === 'textarea'" v-model="editableValue(item).value" rows="3" />
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
const editData = ref<any[]>([]);

function displayValue(value: any) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value === 0 ? "0" : value || "—";
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
  submission.value = await call("/service-submissions/" + route.params.id, { token });
  loading.value = false;
}

function startEdit() {
  errorMsg.value = "";
  editData.value = (submission.value.data || []).map((f: any) => ({ ...f, _wasArray: Array.isArray(f.value) }));
  editing.value = true;
}

async function save() {
  saving.value = true;
  errorMsg.value = "";
  try {
    const token = await getToken();
    const clean = editData.value.map(({ _wasArray, ...rest }) => rest);
    const nome = clean.find((f: any) => f.key === "nome");
    const desc = clean.find((f: any) => f.key === "descricao");
    await call("/service-submissions/" + route.params.id, {
      method: "PUT",
      token,
      body: {
        data: clean,
        respondent_name: nome ? String(nome.value || "") : submission.value.respondent_name,
        summary: desc ? String(desc.value || "") : submission.value.summary,
      },
    });
    editing.value = false;
    await load();
  } catch {
    errorMsg.value = "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm("Excluir esta ficha? Essa ação não pode ser desfeita.")) return;
  const token = await getToken();
  await call("/service-submissions/" + route.params.id, { method: "DELETE", token });
  router.push("/admin/servico");
}

onMounted(load);
</script>
