<template>
  <div class="page">
    <div class="toolbar">
      <NuxtLink to="/" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Serviço / <em>Manutenção</em></h1>

    <div class="tabs">
      <button class="tab" :class="{ 'is-active': tab === 'ficha' }" @click="tab = 'ficha'">Ficha do dia</button>
      <button class="tab" :class="{ 'is-active': tab === 'estoque' }" @click="tab = 'estoque'">Estoque</button>
    </div>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <!-- ABA 1: FICHA DE SERVIÇO -->
    <section v-if="tab === 'ficha'">
      <p>Registre o que foi feito hoje.</p>
      <div v-if="loadingFields" class="muted">Carregando...</div>
      <div v-else-if="!fields.length" class="empty">Nenhuma pergunta cadastrada ainda.</div>
      <template v-else>
        <div class="card">
          <PastoralField v-for="f in fields" :key="f.id" :field="f" v-model="formData[f.key]" />
        </div>
        <button class="btn btn--primary" :disabled="sendingFicha" @click="submitFicha">
          {{ sendingFicha ? "Enviando..." : "Enviar ficha" }}
        </button>
      </template>
    </section>

    <!-- ABA 2: ESTOQUE -->
    <section v-if="tab === 'estoque'">
      <p>Informe o que foi utilizado. O estoque é descontado automaticamente.</p>
      <div v-if="loadingStock" class="muted">Carregando...</div>
      <div v-else-if="!products.length" class="empty">Nenhum produto cadastrado ainda.</div>
      <template v-else>
        <div class="card">
          <div class="field">
            <label>Seu nome</label>
            <input v-model="stockName" type="text" placeholder="Nome de quem utilizou" />
          </div>
          <div class="field">
            <label>Observação (opcional)</label>
            <input v-model="stockNote" type="text" placeholder="Ex: limpeza do salão" />
          </div>
        </div>

        <details v-for="(g, idx) in productGroups" :key="g.label" class="group" :open="idx === 0">
          <summary>{{ g.label }} <span class="count">{{ g.items.length }}</span></summary>
          <div class="group__body">
            <div v-for="p in g.items" :key="p.id" class="card">
              <div class="list-item" style="border:none;padding:0;gap:12px;">
                <span style="min-width:0;">
                  <strong>{{ p.name }}</strong>
                  <div class="muted">Disponível: {{ p.quantity }} {{ p.unit }}</div>
                </span>
                <input
                  v-model.number="used[p.id]"
                  type="number"
                  min="0"
                  :max="p.quantity"
                  placeholder="0"
                  style="width:90px;"
                />
              </div>
            </div>
          </div>
        </details>

        <button class="btn btn--primary" :disabled="sendingStock" @click="submitStock">
          {{ sendingStock ? "Enviando..." : "Registrar utilização" }}
        </button>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
const { call } = useApi();

const tab = ref<"ficha" | "estoque">("ficha");
const errorMsg = ref("");
const successMsg = ref("");

// ---- Ficha ----
const fields = ref<any[]>([]);
const loadingFields = ref(true);
const formData = reactive<Record<string, any>>({});
const sendingFicha = ref(false);

function defaultValue(type: string) {
  if (type === "multi_select") return [];
  if (type === "number") return 0;
  return "";
}

function isEmpty(value: any) {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return false;
  return !value || !String(value).trim();
}

function resetFicha() {
  for (const f of fields.value) formData[f.key] = defaultValue(f.type);
}

async function loadFields() {
  loadingFields.value = true;
  try {
    fields.value = (await call("/service-fields")) || [];
    resetFicha();
  } catch {
    errorMsg.value = "Não foi possível carregar a ficha.";
  } finally {
    loadingFields.value = false;
  }
}

async function submitFicha() {
  errorMsg.value = "";
  successMsg.value = "";
  for (const f of fields.value) {
    if (f.required && isEmpty(formData[f.key])) {
      errorMsg.value = `Preencha: ${f.label}`;
      return;
    }
  }
  sendingFicha.value = true;
  try {
    const data = fields.value.map((f) => ({ key: f.key, label: f.label, type: f.type, value: formData[f.key] }));
    await call("/service-submissions", { method: "POST", body: { data } });
    successMsg.value = "Ficha enviada com sucesso!";
    resetFicha();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao enviar. Tente novamente.";
  } finally {
    sendingFicha.value = false;
  }
}

// ---- Estoque ----
const products = ref<any[]>([]);
const loadingStock = ref(true);
const used = reactive<Record<string, number>>({});
const stockName = ref("");
const stockNote = ref("");
const sendingStock = ref(false);

const productGroups = computed(() => {
  const map = new Map<string, any[]>();
  for (const p of products.value) {
    const label = p.stock_categories?.name || "Sem categoria";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(p);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([label, items]) => ({ label, items }));
});

async function loadStock() {
  loadingStock.value = true;
  try {
    products.value = (await call("/stock-products")) || [];
    for (const p of products.value) used[p.id] = 0;
  } catch {
    errorMsg.value = "Não foi possível carregar o estoque.";
  } finally {
    loadingStock.value = false;
  }
}

async function submitStock() {
  errorMsg.value = "";
  successMsg.value = "";
  if (!stockName.value.trim()) {
    errorMsg.value = "Informe seu nome.";
    return;
  }
  const items = Object.entries(used)
    .filter(([, q]) => Number(q) > 0)
    .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) }));
  if (!items.length) {
    errorMsg.value = "Informe a quantidade de ao menos um produto.";
    return;
  }
  sendingStock.value = true;
  try {
    await call("/stock-movements", {
      method: "POST",
      body: { items, respondent_name: stockName.value, note: stockNote.value },
    });
    successMsg.value = "Utilização registrada e estoque atualizado!";
    stockNote.value = "";
    await loadStock();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao registrar. Tente novamente.";
  } finally {
    sendingStock.value = false;
  }
}

onMounted(() => {
  loadFields();
  loadStock();
});
</script>
