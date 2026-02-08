<template>
  <!-- Row 1: Charts (2 cols) + Recruiting Packet & School Size (1 col) -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InteractionTrendChart :interactions="interactions" />
        <SchoolInterestChart :schools="schools" />
      </div>
    </div>
    <div class="lg:col-span-1 space-y-6">
      <RecruitingPacketWidget
        :recruiting-packet-loading="recruitingPacketLoading"
        :recruiting-packet-error="recruitingPacketError"
        :has-generated-packet="hasGeneratedPacket"
        @generate-packet="$emit('generate-packet')"
        @email-packet="$emit('email-packet')"
      />
      <SchoolsBySizeWidget
        :breakdown="schoolSizeBreakdown"
        :count="schoolCount"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import InteractionTrendChart from "./InteractionTrendChart.vue";
import SchoolInterestChart from "./SchoolInterestChart.vue";
import RecruitingPacketWidget from "./RecruitingPacketWidget.vue";
import SchoolsBySizeWidget from "./SchoolsBySizeWidget.vue";
import type { School, Interaction } from "~/types/models";

defineProps<{
  schools: School[];
  interactions: Interaction[];
  schoolSizeBreakdown: Record<string, number>;
  schoolCount: number;
  recruitingPacketLoading: boolean;
  recruitingPacketError: string | null;
  hasGeneratedPacket: boolean;
}>();

defineEmits<{
  "generate-packet": [];
  "email-packet": [];
}>();
</script>
