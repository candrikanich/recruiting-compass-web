<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <div class="absolute inset-0">
      <!-- Grass texture with gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700"></div>

      <!-- Multi-Sport Field markings -->
      <svg
        class="absolute inset-0 w-full h-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <!-- Baseball: Infield dirt circle -->
        <circle cx="600" cy="800" r="350" fill="none" stroke="white" stroke-width="3" opacity="0.4" />

        <!-- Baseball: Foul lines -->
        <line x1="600" y1="800" x2="100" y2="100" stroke="white" stroke-width="2" opacity="0.5" />
        <line x1="600" y1="800" x2="1100" y2="100" stroke="white" stroke-width="2" opacity="0.5" />

        <!-- Baseball: Basepaths -->
        <line x1="600" y1="800" x2="750" y2="650" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="750" y1="650" x2="600" y2="500" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="600" y1="500" x2="450" y2="650" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="450" y1="650" x2="600" y2="800" stroke="white" stroke-width="2" opacity="0.3" />

        <!-- Baseball: Bases -->
        <rect x="595" y="795" width="10" height="10" fill="white" opacity="0.6" />
        <rect x="745" y="645" width="10" height="10" fill="white" opacity="0.6" />
        <rect x="595" y="495" width="10" height="10" fill="white" opacity="0.6" />
        <rect x="445" y="645" width="10" height="10" fill="white" opacity="0.6" />

        <!-- Baseball: Outfield arc -->
        <path d="M 200 200 Q 600 50 1000 200" fill="none" stroke="white" stroke-width="2" opacity="0.3" />

        <!-- Football: Hash marks and yard lines (left side) -->
        <line x1="50" y1="150" x2="50" y2="650" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="50" y1="200" x2="100" y2="200" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="50" y1="300" x2="100" y2="300" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="50" y1="400" x2="120" y2="400" stroke="white" stroke-width="2" opacity="0.4" />
        <line x1="50" y1="500" x2="100" y2="500" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="50" y1="600" x2="100" y2="600" stroke="white" stroke-width="1" opacity="0.3" />

        <!-- Football: Hash marks (right side) -->
        <line x1="1150" y1="150" x2="1150" y2="650" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="1100" y1="200" x2="1150" y2="200" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="1100" y1="300" x2="1150" y2="300" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="1080" y1="400" x2="1150" y2="400" stroke="white" stroke-width="2" opacity="0.4" />
        <line x1="1100" y1="500" x2="1150" y2="500" stroke="white" stroke-width="1" opacity="0.3" />
        <line x1="1100" y1="600" x2="1150" y2="600" stroke="white" stroke-width="1" opacity="0.3" />

        <!-- Basketball: Court outline (top left) -->
        <rect x="100" y="50" width="300" height="200" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="100" y1="150" x2="200" y2="150" stroke="white" stroke-width="1" opacity="0.3" />
        <path d="M 120 70 Q 180 100 120 180" fill="none" stroke="white" stroke-width="1" opacity="0.3" />
        <rect x="100" y="120" width="60" height="60" fill="none" stroke="white" stroke-width="1" opacity="0.3" />
        <circle cx="300" cy="150" r="30" fill="none" stroke="white" stroke-width="1" opacity="0.3" />

        <!-- Basketball: Court outline (top right) -->
        <rect x="800" y="50" width="300" height="200" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
        <line x1="1000" y1="150" x2="1100" y2="150" stroke="white" stroke-width="1" opacity="0.3" />
        <path d="M 1080 70 Q 1020 100 1080 180" fill="none" stroke="white" stroke-width="1" opacity="0.3" />
        <rect x="1040" y="120" width="60" height="60" fill="none" stroke="white" stroke-width="1" opacity="0.3" />

        <!-- Soccer: Penalty boxes -->
        <rect x="150" y="600" width="150" height="100" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
        <rect x="200" y="650" width="50" height="50" fill="none" stroke="white" stroke-width="1" opacity="0.3" />
        <path d="M 200 630 Q 225 600 250 630" fill="none" stroke="white" stroke-width="1" opacity="0.3" />

        <rect x="900" y="600" width="150" height="100" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
        <rect x="950" y="650" width="50" height="50" fill="none" stroke="white" stroke-width="1" opacity="0.3" />
        <path d="M 950 630 Q 975 600 1000 630" fill="none" stroke="white" stroke-width="1" opacity="0.3" />

        <!-- Soccer: Center circle -->
        <circle cx="600" cy="200" r="60" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
        <circle cx="600" cy="200" r="3" fill="white" opacity="0.4" />
        <line x1="300" y1="200" x2="900" y2="200" stroke="white" stroke-width="2" opacity="0.3" />
      </svg>

      <!-- Subtle pattern overlay -->
      <div
        class="absolute inset-0 opacity-5"
        :style="{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            rgba(255, 255, 255, 0.3) 20px,
            rgba(255, 255, 255, 0.3) 22px
          )`
        }"
      ></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
      <!-- Hero Section -->
      <div class="text-center max-w-4xl mx-auto mb-12">
        <!-- Compass Icon/Logo -->
        <div class="mb-8 flex justify-center">
          <div class="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center transform hover:scale-110 hover:rotate-12 transition-all duration-300">
            <svg class="w-14 h-14 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.5 9.5L9.5 14.5M9.5 9.5l5 5" />
              <polygon fill="currentColor" points="12,5 13,9 12,8 11,9" />
              <polygon fill="currentColor" points="12,19 11,15 12,16 13,15" />
              <polygon fill="currentColor" points="5,12 9,11 8,12 9,13" />
              <polygon fill="currentColor" points="19,12 15,13 16,12 15,11" />
            </svg>
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-lg">
          Recruiting Compass
        </h1>

        <!-- Subtitle -->
        <p class="text-xl md:text-2xl text-white/90 mb-12 drop-shadow">
          Navigate your college recruiting journey
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <NuxtLink
            to="/login"
            class="min-w-[200px] px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-blue-700 transition-all text-lg"
          >
            Sign In
          </NuxtLink>
          <NuxtLink
            to="/signup"
            class="min-w-[200px] px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-slate-800 hover:text-white transition-all text-lg"
          >
            Create Account
          </NuxtLink>
        </div>

        <!-- Features -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors">
            <div class="w-12 h-12 mx-auto mb-3">
              <AcademicCapIcon class="w-12 h-12 text-white" />
            </div>
            <h3 class="text-white text-lg font-medium mb-2">Track Schools</h3>
            <p class="text-white/80 text-sm">
              Organize and manage your target colleges in one place
            </p>
          </div>

          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors">
            <div class="w-12 h-12 mx-auto mb-3">
              <ChatBubbleLeftRightIcon class="w-12 h-12 text-white" />
            </div>
            <h3 class="text-white text-lg font-medium mb-2">Log Interactions</h3>
            <p class="text-white/80 text-sm">
              Keep track of every conversation with coaches
            </p>
          </div>

          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors">
            <div class="w-12 h-12 mx-auto mb-3">
              <ChartBarIcon class="w-12 h-12 text-white" />
            </div>
            <h3 class="text-white text-lg font-medium mb-2">Monitor Progress</h3>
            <p class="text-white/80 text-sm">
              Visualize your recruiting journey with insights
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Decorative elements -->
    <div class="absolute top-10 left-10 w-16 h-16 bg-white rounded-full opacity-10 animate-pulse"></div>
    <div class="absolute top-32 right-20 w-12 h-12 bg-white rounded-full opacity-10 animate-pulse" style="animation-delay: 100ms"></div>
    <div class="absolute bottom-20 left-1/4 w-20 h-20 bg-white rounded-full opacity-10 animate-pulse" style="animation-delay: 200ms"></div>
    <div class="absolute bottom-32 right-1/3 w-14 h-14 bg-white rounded-full opacity-10 animate-pulse" style="animation-delay: 300ms"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '~/stores/user'
import { AcademicCapIcon, ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/vue/24/outline'

const userStore = useUserStore()

onMounted(async () => {
  // Initialize user and redirect if already logged in
  await userStore.initializeUser()
  if (userStore.isAuthenticated && userStore.user) {
    await navigateTo('/dashboard')
  }
})
</script>
