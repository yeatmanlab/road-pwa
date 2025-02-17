<template>
  <div :id="'tab-view-description-' + taskId" class="flex flex-col items-center justify-center mx-2">
    <Accordion v-if="taskInfoById[taskId]" class="mb-5 w-full" :active-index="0">
      <AccordionTab :header="('About ' + taskInfoById[taskId]?.subheader).toUpperCase()">
        <div>
          <div style="text-transform: uppercase" class="text-2xl font-bold">{{ taskInfoById[taskId]?.subheader }}</div>
          <!-- The following HTML is from a hard-coded source (below) -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p class="mt-1 text-md font-light" v-html="taskInfoById[taskId]?.desc"></p>
        </div>
      </AccordionTab>
    </Accordion>
  </div>
  <!-- <div class="grid grid-cols-2 w-full space-around items-center p-3"> -->
  <div v-if="tasksToDisplayGraphs.includes(taskId)" :id="'tab-view-chart-' + taskId" class="chart-toggle-wrapper">
    <div v-if="orgType === 'district'" class="mb-3" data-html2canvas-ignore="true">
      <div class="flex uppercase text-xs font-light">view rows by</div>
      <PvSelectButton
        v-model="facetMode"
        class="flex flex-row my-2 select-button"
        :allow-empty="false"
        :options="facetModes"
        option-label="name"
      />
    </div>
    <div class="chart-wrapper align-items-start">
      <div class="h-full flex flex-column align-items-center">
        <DistributionChartSupport
          :initialized="initialized"
          :administration-id="administrationId"
          :org-type="orgType"
          :org-id="orgId"
          :task-id="taskId"
          :runs="runs"
          :facet-mode="facetMode"
        />
      </div>
      <div class="h-full flex">
        <DistributionChartFacet
          :initialized="initialized"
          :administration-id="administrationId"
          :org-type="orgType"
          :org-id="orgId"
          :task-id="taskId"
          :runs="runs"
          :facet-mode="facetMode"
          :min-grade-by-runs="minGradeByRuns"
        />
      </div>
    </div>
  </div>
  <div class="my-2 mx-4">
    <SubscoreTable
      v-if="taskId === 'letter'"
      task-id="letter"
      :task-name="taskDisplayNames['letter'].name"
      :administration-id="administrationId"
      :org-type="orgType"
      :org-id="orgId"
      :administration-name="administrationInfo.name ?? undefined"
      :org-name="orgInfo.name ?? undefined"
      :computed-table-data="computedTableData"
    />
    <SubscoreTable
      v-if="taskId === 'pa'"
      task-id="pa"
      :task-name="taskDisplayNames['pa'].name"
      :administration-id="administrationId"
      :org-type="orgType"
      :org-id="orgId"
      :administration-name="administrationInfo.name ?? undefined"
      :org-name="orgInfo.name ?? undefined"
      :computed-table-data="computedTableData"
    />
  </div>
</template>
<script setup>
import DistributionChartFacet from '@/components/reports/DistributionChartFacet.vue';
import DistributionChartSupport from '@/components/reports/DistributionChartSupport.vue';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import { taskDisplayNames, tasksToDisplayGraphs, taskInfoById } from '@/helpers/reports.js';
import SubscoreTable from '@/components/reports/SubscoreTable.vue';
import { ref, computed } from 'vue';

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  initialized: {
    type: Boolean,
    required: true,
  },
  administrationId: {
    type: String,
    required: true,
  },
  administrationInfo: {
    type: Object,
    required: true,
  },
  computedTableData: {
    type: Array,
    required: true,
  },
  orgType: {
    type: String,
    required: true,
  },
  orgId: {
    type: String,
    required: true,
  },
  orgInfo: {
    type: Object,
    required: true,
  },
  taskId: {
    type: String,
    required: true,
  },
  runs: {
    type: Array,
    required: true,
  },
});

const facetMode = ref({ name: 'Grade', key: 'grade' });
const facetModes = [
  { name: 'Grade', key: 'grade' },
  { name: 'School', key: 'schoolName' },
];

const minGradeByRuns = computed(() => {
  return Math.min(
    ...props.runs.filter((run) => run.scores.rawScore || run.scores.stdPercentile).map((run) => run.grade),
  );
});
</script>

<style>
.chart-wrapper {
  display: flex;
  height: 100%;
  flex-wrap: wrap;
  justify-content: space-around;
}

.chart-toggle-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.task-card {
  background: #f6f6fe;
  padding: 2rem;
  text-align: center;
  margin-bottom: 1rem;
}

.task-title {
  font-size: 3.5rem;
  /* font-weight: bold; */
}

.task-description {
  font-size: 1.25rem;
  text-align: left;
}
</style>
