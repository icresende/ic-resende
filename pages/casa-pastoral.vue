<template>
  <div class="page">
    <div class="toolbar">
      <button v-if="stage" class="btn btn--ghost" @click="backToChoice">← Voltar</button>
      <NuxtLink v-else to="/base" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Casa <em>Pastoral</em></h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else>
      <!-- Escolha da etapa -->
      <section v-if="!stage">
        <p>Qual etapa você vai preencher agora?</p>

        <div class="card card--clickable hub-card" @click="chooseStage(1)">
          <strong>Etapa 1 · Pessoa atendida</strong>
          <div class="muted">Dados de quem vai ser atendido.</div>
        </div>

        <div class="card card--clickable hub-card" @click="chooseStage(2)">
          <strong>Etapa 2 · Atendimento</strong>
          <div class="muted">Preenchido por quem realizou o atendimento.</div>
        </div>
      </section>

      <!-- Formulário da etapa escolhida -->
      <section v-else>
        <h2>{{ stage === 1 ? "1. Sobre quem vai ser atendido" : "2. Sobre o atendimento" }}</h2>
        <div v-if="!currentFields.length" class="empty">Nenhuma pergunta cadastrada nesta etapa.</div>
        <template v-else>
          <div class="card">
            <PastoralField v-for="f in currentFields" :key="f.id" :field="f" v-model="formData[f.key]" />
          </div>
          <button class="btn btn--primary" :disabled="submitting" @click="submit">
            {{ submitting ? "Enviando..." : "Enviar etapa" }}
          </button>
        </template>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
const { call } = useApi();

const loading = ref(true);
const stage = ref<number | null>(null);
const fields = ref<any[]>([]);
const formData = reactive<Record<string, any>>({});
const submitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const currentFields = computed(() =>
  fields.value.filter((f) => f.stage === stage.value).sort((a, b) => a.sort_order - b.sort_order)
);

function defaultValue(type: string) {
  return type === "multi_select" ? [] : "";
}

function isEmpty(value: any) {
  if (Array.isArray(value)) return value.length === 0;
  return !value || !String(value).trim();
}

function resetForm() {
  Object.keys(formData).forEach((k) => delete formData[k]);
  for (const f of currentFields.value) formData[f.key] = defaultValue(f.type);
}

function chooseStage(s: number) {
  errorMsg.value = "";
  successMsg.value = "";
  stage.value = s;
  resetForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToChoice() {
  stage.value = null;
  errorMsg.value = "";
  successMsg.value = "";
}

async function load() {
  loading.value = true;
  try {
    fields.value = (await call("/pastoral-fields")) || [];
  } catch {
    errorMsg.value = "Não foi possível carregar o formulário.";
  } finally {
    loading.value = false;
  }
}

async function submit() {
  errorMsg.value = "";
  successMsg.value = "";
  for (const f of currentFields.value) {
    if (f.required && isEmpty(formData[f.key])) {
      errorMsg.value = `Preencha: ${f.label}`;
      return;
    }
  }
  submitting.value = true;
  try {
    const data = currentFields.value.map((f) => ({ key: f.key, label: f.label, type: f.type, value: formData[f.key] }));
    const attended_name =
      stage.value === 1 ? formData.nome_completo || "" : formData.pessoa_atendida_nome || "";
    const attended_by = stage.value === 2 ? formData.atendente_nome || "" : "";
    await call("/pastoral-submissions", {
      method: "POST",
      body: { stage: stage.value, attended_name, attended_by, data },
    });
    successMsg.value = "Etapa enviada com sucesso!";
    stage.value = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao enviar. Tente novamente.";
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>
