<template>
  <!-- Multi-Sport Field Background -->
  <div class="absolute inset-0">
    <!-- Grass texture with gradient -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700"
    ></div>

    <!-- Multi-Sport Field markings -->
    <svg
      class="absolute inset-0 w-full h-full opacity-20"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <!-- Baseball: Infield dirt circle -->
      <circle
        cx="600"
        cy="800"
        r="350"
        fill="none"
        stroke="white"
        stroke-width="3"
        opacity="0.4"
      />

      <!-- Baseball: Foul lines -->
      <line
        x1="600"
        y1="800"
        x2="100"
        y2="100"
        stroke="white"
        stroke-width="2"
        opacity="0.5"
      />
      <line
        x1="600"
        y1="800"
        x2="1100"
        y2="100"
        stroke="white"
        stroke-width="2"
        opacity="0.5"
      />

      <!-- Baseball: Basepaths -->
      <line
        x1="600"
        y1="800"
        x2="750"
        y2="650"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <line
        x1="750"
        y1="650"
        x2="600"
        y2="500"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <line
        x1="600"
        y1="500"
        x2="450"
        y2="650"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <line
        x1="450"
        y1="650"
        x2="600"
        y2="800"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />

      <!-- Baseball: Bases -->
      <rect x="595" y="795" width="10" height="10" fill="white" opacity="0.6" />
      <rect x="745" y="645" width="10" height="10" fill="white" opacity="0.6" />
      <rect x="595" y="495" width="10" height="10" fill="white" opacity="0.6" />
      <rect x="445" y="645" width="10" height="10" fill="white" opacity="0.6" />

      <!-- Baseball: Outfield arc -->
      <path
        d="M 200 200 Q 600 50 1000 200"
        fill="none"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />

      <!-- Football: Hash marks and yard lines (left side) -->
      <line
        x1="50"
        y1="150"
        x2="50"
        y2="650"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <line
        x1="50"
        y1="200"
        x2="100"
        y2="200"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="50"
        y1="300"
        x2="100"
        y2="300"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="50"
        y1="400"
        x2="120"
        y2="400"
        stroke="white"
        stroke-width="2"
        opacity="0.4"
      />
      <line
        x1="50"
        y1="500"
        x2="100"
        y2="500"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="50"
        y1="600"
        x2="100"
        y2="600"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />

      <!-- Football: Hash marks (right side) -->
      <line
        x1="1150"
        y1="150"
        x2="1150"
        y2="650"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <line
        x1="1100"
        y1="200"
        x2="1150"
        y2="200"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="1100"
        y1="300"
        x2="1150"
        y2="300"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="1080"
        y1="400"
        x2="1150"
        y2="400"
        stroke="white"
        stroke-width="2"
        opacity="0.4"
      />
      <line
        x1="1100"
        y1="500"
        x2="1150"
        y2="500"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="1100"
        y1="600"
        x2="1150"
        y2="600"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />

      <!-- Basketball: Court outline (top left) -->
      <rect
        x="100"
        y="50"
        width="300"
        height="200"
        fill="none"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <line
        x1="100"
        y1="150"
        x2="200"
        y2="150"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <path
        d="M 120 70 Q 180 100 120 180"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <rect
        x="100"
        y="120"
        width="60"
        height="60"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <circle
        cx="300"
        cy="150"
        r="30"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />

      <!-- Basketball: Court outline (top right) -->
      <rect
        x="800"
        y="50"
        width="300"
        height="200"
        fill="none"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <line
        x1="1000"
        y1="150"
        x2="1100"
        y2="150"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <path
        d="M 1080 70 Q 1020 100 1080 180"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <rect
        x="1040"
        y="120"
        width="60"
        height="60"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />

      <!-- Soccer: Penalty boxes -->
      <rect
        x="150"
        y="600"
        width="150"
        height="100"
        fill="none"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <rect
        x="200"
        y="650"
        width="50"
        height="50"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <path
        d="M 200 630 Q 225 600 250 630"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />

      <rect
        x="900"
        y="600"
        width="150"
        height="100"
        fill="none"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <rect
        x="950"
        y="650"
        width="50"
        height="50"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />
      <path
        d="M 950 630 Q 975 600 1000 630"
        fill="none"
        stroke="white"
        stroke-width="1"
        opacity="0.3"
      />

      <!-- Soccer: Center circle -->
      <circle
        cx="600"
        cy="200"
        r="60"
        fill="none"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
      <circle cx="600" cy="200" r="3" fill="white" opacity="0.4" />
      <line
        x1="300"
        y1="200"
        x2="900"
        y2="200"
        stroke="white"
        stroke-width="2"
        opacity="0.3"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
// Purely presentational component - no logic needed
</script>
