<template>
  <div>
    <header class="topbar">
      <NuxtLink to="/" class="topbar__brand">
        <img src="/logo-verde.png" alt="IC. Resende" class="topbar__logo" />
        <span>IC. Resende</span>
      </NuxtLink>
      <nav class="topbar__nav">
        <NuxtLink to="/">Responder</NuxtLink>
        <NuxtLink to="/casa-pastoral">Casa Pastoral</NuxtLink>
        <NuxtLink to="/organograma">Organograma</NuxtLink>
        <NuxtLink to="/admin">Administrador</NuxtLink>
      </nav>
    </header>
    <NuxtPage />
  </div>
</template>
