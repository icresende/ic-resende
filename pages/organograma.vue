<template>
  <div class="page page--wide">
    <h1>Organograma</h1>
    <p class="muted">Visualização geral dos ministérios da igreja.</p>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!blueNodes.length" class="empty">Organograma ainda não cadastrado.</div>

    <template v-else>
      <div class="org-leadership">Liderança da Igreja</div>

      <div class="org-tree" style="margin-top:0;">
        <div v-for="(blue, i) in blueNodes" :key="blue.id" class="org-category">
          <div class="org-category__head">
            <span>{{ blue.title }}</span>
          </div>

          <div class="org-node" :style="{ '--accent': accentFor(i) }">
            <div class="org-node__title">{{ blue.title }}</div>
            <div class="org-node__count">{{ childrenOf(blue.id).length }} ministério(s)</div>
            <div class="org-node__leader">
              👑 {{ blue.leader_name || "Sem líder definido" }}
            </div>
          </div>

          <div class="org-members">
            <div
              v-for="w in childrenOf(blue.id)"
              :key="w.id"
              class="org-member"
              :style="{ '--accent': accentFor(i) }"
            >
              <span class="org-member__dot" />
              <span class="org-member__text">
                <strong>{{ w.title }}</strong>
                <span class="org-member__leaders">
                  👤 {{ w.leader_name || "Sem líder" }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { call } = useApi();

const nodes = ref<any[]>([]);
const loading = ref(true);

const ACCENTS = ["#146356", "#8a4b3a", "#2c3e6b", "#6b4b8a", "#8a6b1e", "#1e6b8a", "#4b6b3a", "#7a3a5a"];
function accentFor(i: number) {
  return ACCENTS[i % ACCENTS.length];
}

const blueNodes = computed(() => nodes.value.filter((n) => n.color === "blue").sort((a, b) => a.sort_order - b.sort_order));

function childrenOf(parentId: string) {
  return nodes.value
    .filter((n) => n.color === "white" && n.parent_id === parentId)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

async function load() {
  loading.value = true;
  try {
    nodes.value = await call("/org-nodes");
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
