<template>
  <div class="min-h-screen bg-white">
    <HelpHeader />

    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="flex gap-8">
        <HelpSidebar />

        <main class="min-w-0 flex-1 py-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
