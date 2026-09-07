<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Relatório da <em>Celebração</em></h1>
      <button class="btn btn--gold" :disabled="!submissions.length" @click="downloadExcel">
        Baixar Excel
      </button>
    </div>
    <p v-if="celebration" class="muted">{{ celebration.label }} · {{ formatDate(celebration.date) }} · {{ celebration.salon }}</p>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!submissions.length" class="empty">Nenhum registro enviado ainda.</div>

    <div v-for="s in submissions" :key="s.id" class="card">
      <template v-if="editingId === s.id">
        <div class="grid-2">
          <div class="field">
            <label>Nome do responsável</label>
            <input v-model="editForm.respondent_name" type="text" />
          </div>
          <div class="field">
            <label>Contato</label>
            <input
              :value="editForm.respondent_contact"
              @input="onEditContactInput"
              type="text"
              inputmode="numeric"
              maxlength="15"
            />
          </div>
        </div>
        <div class="grid-2">
          <div class="field" v-for="(value, key) in editForm.data" :key="key">
            <label>{{ fieldLabel(editingSubmission, key) }}</label>
            <input v-model.number="editForm.data[key]" type="number" />
          </div>
        </div>
        <button class="btn btn--primary" :disabled="saving" @click="saveEdit(s.id)">
          {{ saving ? "Salvando..." : "Salvar" }}
        </button>
        <button class="btn btn--ghost" style="margin-left:8px;" @click="editingId = null">Cancelar</button>
      </template>

      <template v-else>
        <div class="list-item" style="border:none;padding:0 0 8px;">
          <strong>{{ s.ministries?.name }}</strong>
          <div style="text-align:right;">
            <button class="btn btn--ghost" @click="startEdit(s)">Editar</button>
          </div>
        </div>
        <div v-if="s.respondent_name || s.respondent_contact" class="muted" style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">
          <span>{{ s.respondent_name }} · {{ s.respondent_contact }}</span>
          <a
            v-if="whatsappLink(s.respondent_contact)"
            :href="whatsappLink(s.respondent_contact)"
            target="_blank"
            class="btn btn--gold"
            style="padding:4px 10px;font-size:0.8rem;"
          >
            WhatsApp
          </a>
        </div>
        <div class="grid-2">
          <div v-for="(value, key) in s.data" :key="key">
            <span class="muted">{{ fieldLabel(s, key) }}:</span> <strong>{{ value }}</strong>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const route = useRoute();
const { maskPhone } = usePhoneMask();

const celebration = ref<any>(null);
const submissions = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const editingId = ref<string | null>(null);
const editingSubmission = ref<any>(null);
const editForm = reactive<{ respondent_name: string; respondent_contact: string; data: Record<string, any> }>({
  respondent_name: "",
  respondent_contact: "",
  data: {},
});
const saving = ref(false);

function fieldLabel(submission: any, key: string) {
  const field = submission?.ministries?.fields?.find((f: any) => f.key === key);
  return field?.label || key;
}

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function whatsappLink(contact: string) {
  if (!contact) return "";
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 10) return "";
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  const id = route.params.id as string;
  const res = await call<{ celebration: any; submissions: any[] }>(`/celebrations/${id}/report`, { token });
  celebration.value = res.celebration;
  submissions.value = res.submissions;
  loading.value = false;
}

function onEditContactInput(e: Event) {
  const el = e.target as HTMLInputElement;
  editForm.respondent_contact = maskPhone(el.value);
}

function startEdit(s: any) {
  editingId.value = s.id;
  editingSubmission.value = s;
  editForm.respondent_name = s.respondent_name;
  editForm.respondent_contact = s.respondent_contact;
  editForm.data = { ...s.data };
}

async function saveEdit(id: string) {
  errorMsg.value = "";
  saving.value = true;
  try {
    const token = await getToken();
    await call(`/submissions/${id}`, {
      method: "PUT",
      token,
      body: {
        respondent_name: editForm.respondent_name,
        respondent_contact: editForm.respondent_contact,
        data: editForm.data,
      },
    });
    editingId.value = null;
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao salvar a correção.";
  } finally {
    saving.value = false;
  }
}

async function downloadExcel() {
  const XLSX = await import("xlsx");
  const rows = submissions.value.map((s) => {
    const row: Record<string, any> = {
      Ministério: s.ministries?.name || "",
    };
    if (s.respondent_name || s.respondent_contact) {
      row.Respondente = s.respondent_name;
      row.Contato = s.respondent_contact;
    }
    for (const [key, value] of Object.entries(s.data || {})) {
      row[fieldLabel(s, key)] = value;
    }
    return row;
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Relatório");
  const fileName = `relatorio-${celebration.value?.label || "celebracao"}-${celebration.value?.date || ""}.xlsx`;
  XLSX.writeFile(book, fileName);
}

onMounted(load);
</script>
