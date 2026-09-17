<template>
  <div class="page">
    <div class="toolbar" v-if="step > 1">
      <button class="btn btn--ghost" @click="step = step - 1">← Voltar</button>
    </div>
    <h1>Casa <em>Pastoral</em></h1>
    <p>Relatório de atendimento. Preencha as duas etapas abaixo.</p>

    <div class="steps">
      <div class="step" :class="{ 'is-active': step === 1, 'is-done': step > 1 }" />
      <div class="step" :class="{ 'is-active': step === 2 }" />
    </div>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else>
      <section v-if="step === 1">
        <h2>1. Sobre quem vai ser atendido</h2>
        <div class="card">
          <PastoralField v-for="f in stage1Fields" :key="f.id" :field="f" v-model="formData1[f.key]" />
        </div>
        <button class="btn btn--primary" @click="goStep2">Continuar</button>
      </section>

      <section v-if="step === 2">
        <h2>2. Sobre o atendimento</h2>
        <p class="muted">Preenchido por quem realizou o atendimento.</p>
        <div class="card">
          <PastoralField v-for="f in stage2Fields" :key="f.id" :field="f" v-model="formData2[f.key]" />
        </div>
        <button class="btn btn--primary" :disabled="submitting" @click="submit">
          {{ submitting ? "Enviando..." : "Enviar ficha" }}
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
const { call } = useApi();

const loading = ref(true);
const step = ref(1);
const fields = ref<any[]>([]);
const formData1 = reactive<Record<string, any>>({});
const formData2 = reactive<Record<string, any>>({});
const submitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const stage1Fields = computed(() => fields.value.filter((f) => f.stage === 1).sort((a, b) => a.sort_order - b.sort_order));
const stage2Fields = computed(() => fields.value.filter((f) => f.stage === 2).sort((a, b) => a.sort_order - b.sort_order));

function defaultValue(type: string) {
  return type === "multi_select" ? [] : "";
}

function isEmpty(value: any) {
  if (Array.isArray(value)) return value.length === 0;
  return !value || !String(value).trim();
}

function validate(list: any[], data: Record<string, any>) {
  for (const f of list) {
    if (f.required && isEmpty(data[f.key])) {
      return `Preencha: ${f.label}`;
    }
  }
  return "";
}

async function load() {
  loading.value = true;
  try {
    fields.value = await call("/pastoral-fields");
    for (const f of fields.value) {
      const target = f.stage === 1 ? formData1 : formData2;
      target[f.key] = defaultValue(f.type);
    }
  } catch (e: any) {
    errorMsg.value = "Não foi possível carregar o formulário.";
  } finally {
    loading.value = false;
  }
}

function goStep2() {
  errorMsg.value = "";
  const err = validate(stage1Fields.value, formData1);
  if (err) {
    errorMsg.value = err;
    return;
  }
  step.value = 2;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function submit() {
  errorMsg.value = "";
  const err = validate(stage2Fields.value, formData2);
  if (err) {
    errorMsg.value = err;
    return;
  }
  submitting.value = true;
  try {
    const stage1_data = stage1Fields.value.map((f) => ({ key: f.key, label: f.label, type: f.type, value: formData1[f.key] }));
    const stage2_data = stage2Fields.value.map((f) => ({ key: f.key, label: f.label, type: f.type, value: formData2[f.key] }));
    await call("/pastoral-submissions", {
      method: "POST",
      body: {
        attended_name: formData1.nome_completo || "",
        attended_by: formData2.atendente_nome || "",
        stage1_data,
        stage2_data,
      },
    });
    successMsg.value = "Ficha enviada com sucesso!";
    step.value = 1;
    for (const f of fields.value) {
      const target = f.stage === 1 ? formData1 : formData2;
      target[f.key] = defaultValue(f.type);
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao enviar. Tente novamente.";
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>
