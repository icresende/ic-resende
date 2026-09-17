<template>
  <div class="page page--wide">
    <AdminTabs />
    <h1>Estoque</h1>
    <p class="muted">Cadastre categorias e produtos. O consumo informado pelos voluntários já desconta a quantidade.</p>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="tabs">
      <button class="tab" :class="{ 'is-active': tab === 'produtos' }" @click="tab = 'produtos'">Produtos</button>
      <button class="tab" :class="{ 'is-active': tab === 'categorias' }" @click="tab = 'categorias'">Categorias</button>
      <button class="tab" :class="{ 'is-active': tab === 'historico' }" @click="loadMovements">Histórico</button>
    </div>

    <!-- PRODUTOS -->
    <section v-if="tab === 'produtos'">
      <div class="card">
        <h2>{{ editingProduct ? "Editar produto" : "Novo produto" }}</h2>
        <div class="grid-2">
          <div class="field">
            <label>Categoria</label>
            <select v-model="pForm.category_id">
              <option value="">Selecione...</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>Produto</label>
            <input v-model="pForm.name" type="text" placeholder="Ex: Detergente" />
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label>Quantidade</label>
            <input v-model.number="pForm.quantity" type="number" min="0" />
          </div>
          <div class="field">
            <label>Unidade</label>
            <input v-model="pForm.unit" type="text" placeholder="un, L, kg..." />
          </div>
        </div>
        <div class="field">
          <label>Alerta de estoque baixo (avisa quando ficar igual ou abaixo)</label>
          <input v-model.number="pForm.min_quantity" type="number" min="0" />
        </div>
        <button class="btn btn--primary" :disabled="saving" @click="saveProduct">
          {{ saving ? "Salvando..." : editingProduct ? "Salvar alterações" : "Cadastrar produto" }}
        </button>
        <button v-if="editingProduct" class="btn btn--ghost" style="margin-left:8px;" @click="cancelProduct">Cancelar</button>
      </div>

      <div v-if="loading" class="muted">Carregando...</div>
      <div v-else-if="!products.length" class="empty">Nenhum produto cadastrado.</div>
      <details v-for="(g, idx) in productGroups" :key="g.label" class="group" :open="idx === 0">
        <summary>{{ g.label }} <span class="count">{{ g.items.length }}</span></summary>
        <div class="group__body">
          <div v-for="p in g.items" :key="p.id" class="card">
            <div class="list-item" style="border:none;padding:0;">
              <span style="min-width:0;">
                <strong>{{ p.name }}</strong>
                <div class="muted">
                  <span :class="{ 'stock-low': Number(p.quantity) <= Number(p.min_quantity) }">
                    {{ p.quantity }} {{ p.unit }}
                  </span>
                  <span v-if="Number(p.quantity) <= Number(p.min_quantity)" class="stock-low"> · estoque baixo</span>
                </div>
              </span>
              <div>
                <button class="btn btn--ghost" @click="startProduct(p)">Editar</button>
                <button class="btn btn--danger" @click="removeProduct(p.id)">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>

    <!-- CATEGORIAS -->
    <section v-if="tab === 'categorias'">
      <div class="card">
        <h2>{{ editingCategory ? "Editar categoria" : "Nova categoria" }}</h2>
        <div class="field">
          <label>Nome da categoria</label>
          <input v-model="cForm.name" type="text" placeholder="Ex: Limpeza" />
        </div>
        <button class="btn btn--primary" :disabled="saving" @click="saveCategory">
          {{ saving ? "Salvando..." : editingCategory ? "Salvar alterações" : "Cadastrar categoria" }}
        </button>
        <button v-if="editingCategory" class="btn btn--ghost" style="margin-left:8px;" @click="cancelCategory">Cancelar</button>
      </div>

      <div v-if="!categories.length" class="empty">Nenhuma categoria cadastrada.</div>
      <div v-for="c in categories" :key="c.id" class="card">
        <div class="list-item" style="border:none;padding:0;">
          <strong>{{ c.name }}</strong>
          <div>
            <button class="btn btn--ghost" @click="startCategory(c)">Editar</button>
            <button class="btn btn--danger" @click="removeCategory(c.id)">Excluir</button>
          </div>
        </div>
      </div>
    </section>

    <!-- HISTÓRICO -->
    <section v-if="tab === 'historico'">
      <div v-if="loadingMovements" class="muted">Carregando...</div>
      <div v-else-if="!movements.length" class="empty">Nenhuma movimentação registrada.</div>
      <div v-for="m in movements" :key="m.id" class="card">
        <div class="list-item" style="border:none;padding:0;">
          <span style="min-width:0;">
            <strong>{{ kindLabel(m.kind) }} {{ m.quantity }} {{ m.stock_products?.unit }} · {{ m.stock_products?.name || "Produto removido" }}</strong>
            <div class="muted">
              {{ formatDateTime(m.created_at) }} · saldo {{ m.balance_after }}
              <template v-if="m.respondent_name"> · {{ m.respondent_name }}</template>
            </div>
            <div v-if="m.note" class="muted">{{ m.note }}</div>
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const tab = ref<"produtos" | "categorias" | "historico">("produtos");
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const categories = ref<any[]>([]);
const products = ref<any[]>([]);
const movements = ref<any[]>([]);
const loadingMovements = ref(false);

const editingProduct = ref<string | null>(null);
const editingCategory = ref<string | null>(null);

const emptyProduct = () => ({ category_id: "", name: "", quantity: 0, unit: "un", min_quantity: 0 });
const pForm = reactive(emptyProduct());
const cForm = reactive({ name: "" });

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

function kindLabel(kind: string) {
  return { out: "Saída", in: "Entrada", adjust: "Correção" }[kind] || kind;
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
  try {
    const token = await getToken();
    categories.value = await call("/stock-categories", { token });
    products.value = await call("/stock-products?all=true", { token });
  } catch {
    errorMsg.value = "Erro ao carregar o estoque.";
  } finally {
    loading.value = false;
  }
}

async function loadMovements() {
  tab.value = "historico";
  loadingMovements.value = true;
  try {
    const token = await getToken();
    movements.value = await call("/stock-movements", { token });
  } catch {
    errorMsg.value = "Erro ao carregar o histórico.";
  } finally {
    loadingMovements.value = false;
  }
}

// ---- Produtos ----
function startProduct(p: any) {
  editingProduct.value = p.id;
  Object.assign(pForm, {
    category_id: p.category_id,
    name: p.name,
    quantity: Number(p.quantity),
    unit: p.unit,
    min_quantity: Number(p.min_quantity),
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelProduct() {
  editingProduct.value = null;
  Object.assign(pForm, emptyProduct());
}

async function saveProduct() {
  errorMsg.value = "";
  successMsg.value = "";
  if (!pForm.category_id || !pForm.name.trim()) {
    errorMsg.value = "Escolha a categoria e informe o nome do produto.";
    return;
  }
  saving.value = true;
  try {
    const token = await getToken();
    const body = {
      category_id: pForm.category_id,
      name: pForm.name.trim(),
      quantity: Number(pForm.quantity) || 0,
      unit: pForm.unit || "un",
      min_quantity: Number(pForm.min_quantity) || 0,
    };
    if (editingProduct.value) {
      await call("/stock-products/" + editingProduct.value, { method: "PUT", token, body });
      successMsg.value = "Produto atualizado!";
    } else {
      await call("/stock-products", { method: "POST", token, body });
      successMsg.value = "Produto cadastrado!";
    }
    cancelProduct();
    await load();
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao salvar produto.";
  } finally {
    saving.value = false;
  }
}

async function removeProduct(id: string) {
  if (!confirm("Excluir este produto? O histórico dele também será apagado.")) return;
  const token = await getToken();
  await call("/stock-products/" + id, { method: "DELETE", token });
  await load();
}

// ---- Categorias ----
function startCategory(c: any) {
  editingCategory.value = c.id;
  cForm.name = c.name;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelCategory() {
  editingCategory.value = null;
  cForm.name = "";
}

async function saveCategory() {
  errorMsg.value = "";
  successMsg.value = "";
  if (!cForm.name.trim()) {
    errorMsg.value = "Informe o nome da categoria.";
    return;
  }
  saving.value = true;
  try {
    const token = await getToken();
    if (editingCategory.value) {
      await call("/stock-categories/" + editingCategory.value, { method: "PUT", token, body: { name: cForm.name.trim() } });
      successMsg.value = "Categoria atualizada!";
    } else {
      await call("/stock-categories", {
        method: "POST",
        token,
        body: { name: cForm.name.trim(), sort_order: categories.value.length + 1 },
      });
      successMsg.value = "Categoria cadastrada!";
    }
    cancelCategory();
    await load();
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao salvar categoria.";
  } finally {
    saving.value = false;
  }
}

async function removeCategory(id: string) {
  if (!confirm("Excluir esta categoria? Todos os produtos dela também serão excluídos.")) return;
  const token = await getToken();
  await call("/stock-categories/" + id, { method: "DELETE", token });
  await load();
}

onMounted(load);
</script>
