<template>
  <div class="page">
    <div class="toolbar" v-if="step > 1">
      <button class="btn btn--ghost" @click="step = step - 1">← Voltar</button>
    </div>
    <h1>Relatório da <em>Celebração</em></h1>
    <p>Selecione a celebração, o seu ministério e preencha as informações.</p>

    <div class="steps">
      <div class="step" :class="{ 'is-active': step === 1, 'is-done': step > 1 }" />
      <div class="step" :class="{ 'is-active': step === 2, 'is-done': step > 2 }" />
      <div class="step" :class="{ 'is-active': step === 3 }" />
    </div>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <!-- Passo 1: escolher celebração -->
    <section v-if="step === 1">
      <h2>1. Qual celebração?</h2>
      <div v-if="loadingCelebrations" class="muted">Carregando...</div>
      <div v-else-if="!celebrations.length" class="empty">Nenhuma celebração cadastrada ainda.</div>
      <div v-else>
        <div
          v-for="c in celebrations"
          :key="c.id"
          class="card card--clickable"
          :style="{ borderLeft: `4px solid ${c.color || 'var(--line)'}` }"
          @click="selectCelebration(c)"
        >
          <strong>{{ c.label }}</strong>
          <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }} · {{ c.salon || c.campus }}</div>
        </div>
      </div>
    </section>

    <!-- Passo 2: escolher ministério -->
    <section v-if="step === 2 && selectedCelebration">
      <h2>2. Qual o seu ministério?</h2>
      <p class="muted">{{ selectedCelebration.label }} · {{ formatDate(selectedCelebration.date) }}</p>
      <div v-if="loadingMinistries" class="muted">Carregando...</div>
      <div v-else>
        <div
          v-for="m in ministriesWithStatus"
          :key="m.id"
          class="card"
          :class="m.status === 'done' ? '' : 'card--clickable'"
          :style="m.status === 'done' ? 'opacity:0.6;cursor:not-allowed;' : ''"
          @click="selectMinistry(m)"
        >
          <div class="list-item" style="border:none;padding:0;">
            <span>{{ m.name }}</span>
            <span class="badge" :class="m.status === 'done' ? 'badge--done' : 'badge--pending'">
              {{ m.status === 'done' ? 'Já registrado' : 'Pendente' }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Passo 3: preencher formulário -->
    <section v-if="step === 3 && selectedMinistry">
      <h2>3. {{ selectedMinistry.name }}</h2>
      <p class="muted">{{ selectedCelebration.label }} · {{ formatDate(selectedCelebration.date) }}</p>

      <div class="card">
        <div class="grid-2" v-if="selectedCelebration.ask_contact !== false">
          <div class="field">
            <label>Seu nome</label>
            <input v-model="respondentName" type="text" placeholder="Nome completo" />
          </div>
          <div class="field">
            <label>Contato (whatsapp)</label>
            <input
              :value="respondentContact"
              @input="onContactInput"
              type="text"
              inputmode="numeric"
              placeholder="(00) 00000-0000"
              maxlength="15"
            />
          </div>
        </div>

        <div class="grid-2">
          <div class="field" v-for="f in selectedMinistry.fields" :key="f.key">
            <label>{{ f.label }}</label>
            <input
              v-model.number="formData[f.key]"
              :type="f.type === 'number' ? 'number' : 'text'"
              min="0"
            />
          </div>
        </div>
      </div>

      <button class="btn btn--primary" :disabled="submitting" @click="submit">
        {{ submitting ? 'Enviando...' : 'Enviar registro' }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
const { call } = useApi();
const { maskPhone, isValidPhone } = usePhoneMask();

const step = ref(1);
const celebrations = ref<any[]>([]);
const loadingCelebrations = ref(true);
const selectedCelebration = ref<any>(null);

const statusList = ref<any[]>([]);
const loadingMinistries = ref(false);
const selectedMinistry = ref<any>(null);

const respondentName = ref("");
const respondentContact = ref("");
const formData = reactive<Record<string, number | string>>({});
const submitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

// Só os ministérios selecionados pelo admin para esta celebração aparecem aqui, em ordem alfabética
const ministriesWithStatus = computed(() => {
  return statusList.value
    .filter((s) => s.ministries)
    .map((s) => ({ ...s.ministries, status: s.status }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
});

function onContactInput(e: Event) {
  const el = e.target as HTMLInputElement;
  respondentContact.value = maskPhone(el.value);
}

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

async function loadCelebrations() {
  loadingCelebrations.value = true;
  try {
    celebrations.value = await call("/celebrations");
  } catch (e: any) {
    errorMsg.value = "Não foi possível carregar as celebrações.";
  } finally {
    loadingCelebrations.value = false;
  }
}

async function selectCelebration(c: any) {
  selectedCelebration.value = c;
  step.value = 2;
  loadingMinistries.value = true;
  errorMsg.value = "";
  try {
    statusList.value = await call(`/celebrations/${c.id}/status`);
  } catch (e: any) {
    errorMsg.value = "Não foi possível carregar os ministérios.";
  } finally {
    loadingMinistries.value = false;
  }
}

function selectMinistry(m: any) {
  if (m.status === "done") {
    errorMsg.value = "Este ministério já enviou uma resposta para esta celebração.";
    return;
  }
  errorMsg.value = "";
  selectedMinistry.value = m;
  Object.keys(formData).forEach((k) => delete formData[k]);
  (m.fields || []).forEach((f: any) => (formData[f.key] = f.default ?? 0));
  step.value = 3;
}

async function submit() {
  errorMsg.value = "";
  const needsContact = selectedCelebration.value.ask_contact !== false;
  if (needsContact) {
    if (!respondentName.value || !respondentContact.value) {
      errorMsg.value = "Informe seu nome e contato.";
      return;
    }
    if (!isValidPhone(respondentContact.value)) {
      errorMsg.value = "Informe um WhatsApp válido com DDD.";
      return;
    }
  }
  submitting.value = true;
  try {
    await call("/submissions", {
      method: "POST",
      body: {
        celebration_id: selectedCelebration.value.id,
        ministry_id: selectedMinistry.value.id,
        respondent_name: respondentName.value,
        respondent_contact: respondentContact.value,
        data: formData,
      },
    });
    successMsg.value = "Registro enviado com sucesso!";
    step.value = 1;
    selectedMinistry.value = null;
    respondentName.value = "";
    respondentContact.value = "";
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao enviar. Tente novamente.";
    try {
      statusList.value = await call(`/celebrations/${selectedCelebration.value.id}/status`);
    } catch {}
  } finally {
    submitting.value = false;
  }
}

onMounted(loadCelebrations);
</script>
