<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Celebrações</h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="card">
      <h2>{{ editingId ? "Editar celebração" : "Nova celebração" }}</h2>
      <div class="field">
        <label><input v-model="form.is_recurring" type="checkbox" style="width:auto;margin-right:6px;" />Celebração recorrente (o sistema cria a data automaticamente toda semana)</label>
      </div>

      <div class="grid-2" v-if="form.is_recurring">
        <div class="field">
          <label>Dia da semana</label>
          <select v-model.number="form.weekday">
            <option :value="0">Domingo</option>
            <option :value="1">Segunda-feira</option>
            <option :value="2">Terça-feira</option>
            <option :value="3">Quarta-feira</option>
            <option :value="4">Quinta-feira</option>
            <option :value="5">Sexta-feira</option>
            <option :value="6">Sábado</option>
          </select>
        </div>
        <div class="field">
          <label>Horário</label>
          <input v-model="form.time" type="time" />
        </div>
      </div>
      <div class="grid-2" v-else>
        <div class="field">
          <label>Data</label>
          <input v-model="form.date" type="date" />
        </div>
        <div class="field">
          <label>Horário</label>
          <input v-model="form.time" type="time" />
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label>Nome / rótulo</label>
          <input v-model="form.label" type="text" placeholder="Ex: Culto 10h" />
        </div>
        <div class="field">
          <label>Salão</label>
          <input v-model="form.salon" type="text" placeholder="Ex: Salão Principal" />
        </div>
      </div>
      <div class="field">
        <label><input v-model="form.is_special" type="checkbox" style="width:auto;margin-right:6px;" />Celebração temática/especial</label>
      </div>
      <div class="field">
        <label><input v-model="form.ask_contact" type="checkbox" style="width:auto;margin-right:6px;" />Pedir nome e whatsapp de quem preenche</label>
      </div>
      <div class="field">
        <label>Cor (para diferenciar quando houver várias celebrações)</label>
        <input v-model="form.color" type="color" style="width:70px;height:38px;padding:2px;" />
      </div>

      <label style="font-size:0.86rem;font-weight:600;color:var(--green-900);">Ministérios que participam</label>
      <p class="muted" style="margin-top:2px;">Todos vêm marcados por padrão — desmarque os que não se aplicam. Ministérios que já responderam ficam travados para não perder o que foi enviado.</p>
      <div class="grid-2">
        <div v-for="m in allMinistries" :key="m.id" class="field" style="margin-bottom:6px;">
          <label style="display:flex;align-items:center;gap:8px;font-weight:400;">
            <input
              type="checkbox"
              style="width:auto;"
              v-model="selectedMinistryIds"
              :value="m.id"
              :disabled="doneMinistryIds.includes(m.id)"
            />
            {{ m.name }}
            <span v-if="doneMinistryIds.includes(m.id)" class="badge badge--done">Já respondeu</span>
          </label>
        </div>
      </div>

      <button class="btn btn--primary" :disabled="saving" @click="save">
        {{ saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar celebração" }}
      </button>
      <button v-if="editingId" class="btn btn--ghost" style="margin-left:8px;" @click="cancelEdit">Cancelar</button>
    </div>

    <h2>Modelos semanais (recorrentes)</h2>
    <p class="muted" style="margin-top:-4px;">O sistema gera a data da semana automaticamente a partir daqui.</p>
    <div v-if="loading" class="muted">Carregando...</div>
    <div v-for="c in templates" :key="c.id" class="card" :style="{ borderLeft: `4px solid ${c.color || 'var(--line)'}` }">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ c.label }}</strong>
          <span class="badge badge--done" style="margin-left:8px;">Modelo</span>
          <div class="muted">Toda {{ weekdayName(c.weekday) }} · {{ c.time?.slice(0,5) }} · {{ c.salon }}</div>
        </div>
        <div>
          <button class="btn btn--ghost" @click="startEdit(c)">Editar</button>
          <button class="btn btn--danger" @click="remove(c.id)">Excluir</button>
        </div>
      </div>
    </div>

    <h2>Celebrações cadastradas</h2>
    <div v-for="c in instances" :key="c.id" class="card" :style="{ borderLeft: `4px solid ${c.color || 'var(--line)'}` }">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ c.label }}</strong>
          <span v-if="c.template_id" class="badge badge--done" style="margin-left:8px;">Gerada automaticamente</span>
          <span v-if="c.archived" class="badge badge--pending" style="margin-left:8px;">Arquivada</span>
          <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }} · {{ c.salon }}</div>
        </div>
        <div>
          <button class="btn btn--ghost" @click="startEdit(c)">Editar</button>
          <button class="btn btn--danger" @click="remove(c.id)">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const celebrations = ref<any[]>([]);
const templates = computed(() => celebrations.value.filter((c) => !c.date));
const instances = computed(() => celebrations.value.filter((c) => c.date));
const allMinistries = ref<any[]>([]);
const selectedMinistryIds = ref<string[]>([]);
const doneMinistryIds = ref<string[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const editingId = ref<string | null>(null);

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
function weekdayName(w: number) {
  return WEEKDAYS[w] ?? "";
}

const emptyForm = () => ({
  date: "",
  time: "10:00",
  weekday: 0,
  label: "",
  salon: "",
  campus: "IC. Resende",
  is_special: false,
  is_recurring: false,
  ask_contact: true,
  color: "#146356",
});

const form = reactive(emptyForm());

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
  const [cels, mins] = await Promise.all([
    call("/celebrations?all=true", { token }),
    call("/ministries?all=true", { token }),
  ]);
  celebrations.value = cels;
  allMinistries.value = mins.filter((m: any) => m.active);
  if (!editingId.value) selectedMinistryIds.value = allMinistries.value.map((m: any) => m.id);
  loading.value = false;
}

async function startEdit(c: any) {
  editingId.value = c.id;
  form.date = c.date || "";
  form.weekday = c.weekday ?? 0;
  form.time = c.time?.slice(0, 5);
  form.label = c.label;
  form.salon = c.salon || "";
  form.campus = c.campus;
  form.is_special = c.is_special;
  form.is_recurring = c.is_recurring && !c.template_id;
  form.ask_contact = c.ask_contact !== false;
  form.color = c.color || "#146356";

  const token = await getToken();
  const status = await call(`/celebrations/${c.id}/status`, { token });
  selectedMinistryIds.value = status.map((s: any) => s.ministries?.id).filter(Boolean);
  doneMinistryIds.value = status.filter((s: any) => s.status === "done").map((s: any) => s.ministries?.id).filter(Boolean);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  selectedMinistryIds.value = allMinistries.value.map((m) => m.id);
  doneMinistryIds.value = [];
}

async function save() {
  errorMsg.value = "";
  if (!form.time || !form.label) {
    errorMsg.value = "Preencha horário e nome.";
    return;
  }
  if (form.is_recurring && (form.weekday === null || form.weekday === undefined)) {
    errorMsg.value = "Escolha o dia da semana.";
    return;
  }
  if (!form.is_recurring && !form.date) {
    errorMsg.value = "Preencha a data.";
    return;
  }
  saving.value = true;
  try {
    const token = await getToken();
    const body: any = {
      time: form.time,
      label: form.label,
      salon: form.salon,
      campus: form.campus,
      is_special: form.is_special,
      is_recurring: form.is_recurring,
      ask_contact: form.ask_contact,
      color: form.color,
      ministry_ids: selectedMinistryIds.value,
      date: form.is_recurring ? null : form.date,
      weekday: form.is_recurring ? form.weekday : null,
    };
    if (editingId.value) {
      await call(`/celebrations/${editingId.value}`, { method: "PUT", token, body });
      successMsg.value = "Celebração atualizada!";
    } else {
      await call("/celebrations", { method: "POST", token, body });
      successMsg.value = "Celebração criada!";
    }
    cancelEdit();
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao salvar celebração.";
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  if (!confirm("Excluir esta celebração e todos os registros ligados a ela?")) return;
  const token = await getToken();
  await call(`/celebrations/${id}`, { method: "DELETE", token });
  await load();
}

const route = useRoute();
onMounted(async () => {
  await load();
  const editId = route.query.edit as string | undefined;
  if (editId) {
    const match = celebrations.value.find((c: any) => c.id === editId);
    if (match) startEdit(match);
  }
});
</script>
