<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin/pastoral" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else-if="primary">
      <div class="list-item" style="border:none;padding:0 0 8px;">
        <h1 style="margin:0;">
          {{ (stage1 || primary).attended_name || "Sem nome" }}
          <span v-if="merged" class="badge badge--done" style="margin-left:6px;vertical-align:middle;">Ficha completa</span>
        </h1>
        <div>
          <button v-if="!editing" class="btn btn--ghost" @click="startEdit">Editar</button>
          <button class="btn btn--danger" @click="remove">Excluir</button>
        </div>
      </div>
      <p class="muted">
        <template v-if="stage2?.attended_by">Atendido por {{ stage2.attended_by }} · </template>
        {{ formatDateTime(latestDate) }}
        <template v-if="!merged"> · somente etapa {{ primary.stage }}</template>
      </p>

      <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

      <!-- Etapa 1 -->
      <section v-if="stage1" class="card">
        <h2>1. Pessoa atendida</h2>
        <template v-for="(item, i) in (editing ? editData1 : stage1.data)" :key="'s1-' + i">
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
      </section>

      <!-- Etapa 2 -->
      <section v-if="stage2" class="card">
        <h2>2. Atendimento</h2>
        <template v-for="(item, i) in (editing ? editData2 : stage2.data)" :key="'s2-' + i">
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
      </section>

      <template v-if="editing">
        <button class="btn btn--primary" :disabled="saving" @click="save">{{ saving ? "Salvando..." : "Salvar" }}</button>
        <button class="btn btn--ghost" style="margin-left:8px;" @click="editing = false">Cancelar</button>
      </template>

      <!-- Vínculo -->
      <div class="card">
        <h2>Vínculo das etapas</h2>

        <template v-if="merged">
          <p class="muted">As duas etapas estão vinculadas nesta ficha.</p>
          <button class="btn btn--danger" :disabled="linking" @click="unlink">Desvincular</button>
        </template>

        <template v-else>
          <p class="muted">Falta a etapa {{ otherStage }}. Escolha a correspondente para formar a ficha completa.</p>
          <div v-if="loadingCandidates" class="muted">Carregando opções...</div>
          <div v-else-if="!candidates.length" class="empty">Nenhuma etapa {{ otherStage }} sem vínculo disponível.</div>
          <template v-else>
            <div class="field">
              <label>Etapa {{ otherStage }} disponível</label>
              <select v-model="selectedCandidate">
                <option value="">Selecione...</option>
                <option v-for="c in candidates" :key="c.id" :value="c.id">
                  {{ c.attended_name || "Sem nome" }} — {{ formatDateTime(c.submitted_at) }}
                </option>
              </select>
            </div>
            <button class="btn btn--primary" :disabled="linking || !selectedCandidate" @click="link">
              {{ linking ? "Vinculando..." : "Vincular" }}
            </button>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

const primary = ref<any>(null);
const other = ref<any>(null);
const loading = ref(true);
const editing = ref(false);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const editData1 = ref<any[]>([]);
const editData2 = ref<any[]>([]);

const candidates = ref<any[]>([]);
const loadingCandidates = ref(false);
const selectedCandidate = ref("");
const linking = ref(false);

const merged = computed(() => !!other.value);
const stage1 = computed(() =>
  primary.value?.stage === 1 ? primary.value : other.value?.stage === 1 ? other.value : null
);
const stage2 = computed(() =>
  primary.value?.stage === 2 ? primary.value : other.value?.stage === 2 ? other.value : null
);
const otherStage = computed(() => (primary.value?.stage === 1 ? 2 : 1));
const latestDate = computed(() =>
  [primary.value?.submitted_at, other.value?.submitted_at].filter(Boolean).sort().pop()
);

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
  editing.value = false;
  const token = await getToken();
  const res = await call("/pastoral-submissions/" + route.params.id, { token });
  const { linked, ...rest } = res;
  primary.value = rest;
  other.value = linked || null;
  loading.value = false;
  if (!other.value) await loadCandidates();
}

async function loadCandidates() {
  loadingCandidates.value = true;
  selectedCandidate.value = "";
  try {
    const token = await getToken();
    const unlinked = await call("/pastoral-submissions?unlinked=true", { token });
    candidates.value = (unlinked || []).filter(
      (s: any) => s.stage === otherStage.value && s.id !== primary.value.id
    );
  } catch {
    errorMsg.value = "Erro ao carregar as etapas disponíveis.";
  } finally {
    loadingCandidates.value = false;
  }
}

function startEdit() {
  errorMsg.value = "";
  const prep = (arr: any[]) => (arr || []).map((f: any) => ({ ...f, _wasArray: Array.isArray(f.value) }));
  editData1.value = prep(stage1.value?.data);
  editData2.value = prep(stage2.value?.data);
  editing.value = true;
}

async function save() {
  saving.value = true;
  errorMsg.value = "";
  try {
    const token = await getToken();
    const clean = (arr: any[]) => arr.map(({ _wasArray, ...rest }) => rest);
    if (stage1.value) {
      await call("/pastoral-submissions/" + stage1.value.id, { method: "PUT", token, body: { data: clean(editData1.value) } });
    }
    if (stage2.value) {
      await call("/pastoral-submissions/" + stage2.value.id, { method: "PUT", token, body: { data: clean(editData2.value) } });
    }
    await load();
    successMsg.value = "Ficha atualizada!";
  } catch {
    errorMsg.value = "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

async function link() {
  linking.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  try {
    const token = await getToken();
    await call(`/pastoral-submissions/${primary.value.id}/link`, {
      method: "POST",
      token,
      body: { target_id: selectedCandidate.value },
    });
    successMsg.value = "Etapas vinculadas!";
    await load();
  } catch {
    errorMsg.value = "Erro ao vincular.";
  } finally {
    linking.value = false;
  }
}

async function unlink() {
  if (!confirm("Desfazer o vínculo entre as duas etapas?")) return;
  linking.value = true;
  try {
    const token = await getToken();
    await call(`/pastoral-submissions/${primary.value.id}/unlink`, { method: "POST", token });
    successMsg.value = "Vínculo desfeito.";
    await load();
  } catch {
    errorMsg.value = "Erro ao desvincular.";
  } finally {
    linking.value = false;
  }
}

async function remove() {
  const msg = merged.value
    ? "Excluir esta ficha completa (as duas etapas)? Essa ação não pode ser desfeita."
    : "Excluir esta etapa? Essa ação não pode ser desfeita.";
  if (!confirm(msg)) return;
  const token = await getToken();
  if (other.value) {
    await call("/pastoral-submissions/" + other.value.id, { method: "DELETE", token });
  }
  await call("/pastoral-submissions/" + primary.value.id, { method: "DELETE", token });
  router.push("/admin/pastoral");
}

watch(() => route.params.id, load);
onMounted(load);
</script>
