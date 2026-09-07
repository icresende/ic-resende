<template>
  <div class="page" style="max-width:400px;">
    <h1>Acesso <em>Admin</em></h1>
    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div class="card">
      <div class="field">
        <label>E-mail</label>
        <input v-model="email" type="email" />
      </div>
      <div class="field">
        <label>Senha</label>
        <input v-model="password" type="password" @keyup.enter="login" />
      </div>
      <button class="btn btn--primary btn--block" :disabled="loading" @click="login">
        {{ loading ? "Entrando..." : "Entrar" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");
const supabase = useSupabaseClient();
const router = useRouter();

async function login() {
  loading.value = true;
  errorMsg.value = "";
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  loading.value = false;
  if (error) {
    errorMsg.value = "E-mail ou senha inválidos.";
    return;
  }
  router.push("/admin");
}
</script>
