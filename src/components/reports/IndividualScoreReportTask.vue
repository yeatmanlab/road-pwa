<template>
  <div v-for="task in computedTaskData" :key="task" class="flex flex-column align-items-end justify-content-start">
    <div class="flex flex-column align-items-center justify-content-center mb-1 p-1 score-card">
      <div class="flex flex-column md:flex-row align-items-center justify-content-center">
        <div class="flex flex-column justify-content-center align-items-center mt-2">
          <div class="header-task-name">{{ taskDisplayNames[task.taskId]?.extendedTitle }}</div>
          <div class="text-xs uppercase font-thin text-gray-400">
            {{ task[task.scoreToDisplay].name }}
          </div>
          <div class="flex gap-2 mb-2">
            <div
              v-for="tag in task.tags"
              :key="tag"
              class="flex flex-row w-full align-items-center justify-content-center"
            >
              <PvTag
                v-tooltip.top="tag.tooltip"
                :icon="tag.icon"
                :value="tag.value"
                :severity="tag.severity"
                class="text-xs"
              />
            </div>
          </div>
          <PvKnob
            :value-template="
              task.scoreToDisplay == 'percentileScore' ? getPercentileSuffix(task.percentileScore.value) : undefined
            "
            :model-value="task[task.scoreToDisplay].value"
            :size="180"
            :range-color="gray"
            :value-color="task[task.scoreToDisplay].supportColor"
            :min="task[task.scoreToDisplay].min"
            :max="task[task.scoreToDisplay].max"
          />
        </div>
      </div>

      <div v-if="rawOnlyTasks.includes(task.taskId)" class="score-description px-4 py-2">
        {{ studentFirstName }} achieved a composite score of
        <strong>{{ task.rawScore.value }}</strong>
        in {{ taskDisplayNames[task.taskId]?.extendedName }}. {{ extendedDescriptions[task.taskId] }}
      </div>
      <div v-else-if="grade >= 6" class="px-4 py-2 score-description">
        {{ studentFirstName }} scored a standard score of <strong>{{ Math.round(task.standardScore.value) }}</strong
        >, which indicates they
        <strong>{{
          getSupportLevelLanguage(grade, task?.percentileScore.value, task?.rawScore.value, task.taskId)
        }}</strong>
        {{ taskDisplayNames[task.taskId]?.extendedName }}. {{ extendedDescriptions[task.taskId] }}
      </div>

      <div v-else class="px-4 py-2 score-description">
        {{ studentFirstName }} scored in the
        <strong>{{ getPercentileWithSuffix(Math.round(task?.percentileScore.value)) }} percentile</strong>, which
        indicates they
        <strong>{{
          getSupportLevelLanguage(grade, task.percentileScore.value, task.rawScore.value, task.taskId)
        }}</strong>
        {{ taskDisplayNames[task.taskId]?.extendedName }}. {{ extendedDescriptions[task.taskId] }}
      </div>
      <div v-if="!rawOnlyTasks.includes(task.taskId)">
        <PvAccordion class="my-2 w-full" :active-index="expanded ? 0 : null">
          <PvAccordionTab header="Score Breakdown">
            <div v-for="[key, rawScore, rangeMin, rangeMax] in task.scoresArray" :key="key">
              <div class="flex justify-content-between score-table">
                <div class="mr-2">
                  <b>{{ key }}</b
                  ><span v-if="rangeMax" class="text-500"> ({{ rangeMin }}-{{ rangeMax }}):</span> <span v-else>:</span>
                </div>
                <div class="ml-2">
                  <b>{{ isNaN(rawScore) ? rawScore : Math.round(rawScore) }}</b>
                </div>
              </div>
            </div>
          </PvAccordionTab>
        </PvAccordion>
      </div>
      <div v-if="task.taskId === 'letter'">
        <PvAccordion class="my-2 w-full" :active-index="expanded ? 0 : null">
          <PvAccordionTab header="Score Breakdown">
            <div v-for="[key, rawScore, rangeMin, rangeMax] in task.scoresArray" :key="key">
              <div class="flex justify-content-between score-table">
                <div class="mr-2">
                  <b>{{ key }}</b
                  ><span v-if="rangeMax" class="text-500">({{ rangeMin }}-{{ rangeMax }}):</span> <span v-else>:</span>
                </div>
                <div class="ml-2">
                  <b>{{ isNaN(rawScore) ? rawScore : Math.round(rawScore) }}</b>
                </div>
              </div>
            </div>
          </PvAccordionTab>
        </PvAccordion>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import _lowerCase from 'lodash/lowerCase';
import _toUpper from 'lodash/toUpper';
import _get from 'lodash/get';
import { getGrade } from '@bdelab/roar-utils';
import {
  rawOnlyTasks,
  taskDisplayNames,
  extendedDescriptions,
  getSupportLevel,
  getRawScoreRange,
  getScoreKeys,
} from '@/helpers/reports';

const props = defineProps({
  studentData: {
    type: Object,
    required: true,
  },
  taskData: {
    type: Object,
    required: true,
  },
  expanded: {
    type: Boolean,
    required: false,
  },
});

const studentFirstName = computed(() => {
  if (props.studentData?.name && props.studentData?.name?.first) return props.studentData.name.first;
  if (props.studentData.username) return props.studentData.username;
  else return 'The student';
});

const grade = computed(() => getGrade(props.studentData?.studentData?.grade));

const tasksBlacklist = ['vocab', 'cva'];
// compute standard score, raw score, and percentile score for each of the tasks
const computedTaskData = computed(() => {
  const computedTaskAcc = {};

  for (const { taskId, scores, reliable, optional, engagementFlags } of props.taskData) {
    const { percentileScoreKey, standardScoreKey, rawScoreKey } = getScoreKeys(taskId, grade.value);
    const compositeScores = scores?.composite;
    const rawScore =
      !taskId.includes('vocab') && !taskId.includes('letter') && !taskId.includes('es')
        ? _get(compositeScores, rawScoreKey)
        : compositeScores;
    if (!isNaN(rawScore) && !tasksBlacklist.includes(taskId)) {
      const percentileScore = _get(compositeScores, percentileScoreKey);
      const standardScore = _get(compositeScores, standardScoreKey);
      const rawScoreRange = getRawScoreRange(taskId);
      const supportColor = getSupportLevel(grade.value, percentileScore, rawScore, taskId).tag_color;

      const scoresForTask = {
        standardScore: {
          name: 'Standard Score',
          value: Math.round(standardScore),
          min: 0,
          max: 180,
          supportColor: supportColor,
        },
        rawScore: {
          name: 'Raw Score',
          value: Math.round(rawScore),
          min: rawScoreRange?.min,
          max: rawScoreRange?.max,
          supportColor: 'gray',
        },
        percentileScore: {
          name: 'Percentile Score',
          value: Math.round(percentileScore),
          min: 0,
          max: 99,
          supportColor: supportColor,
        },
      };

      // compute tags for reliable, optional, and add engagement flags if unreliable
      const tags = [];
      if (optional === true) {
        tags.push({
          icon: '',
          value: 'Optional',
          severity: 'secondary',
          tooltip: 'This task was a optional assignment.',
        });
      } else {
        tags.push({
          icon: '',
          value: 'Required',
          severity: 'secondary',
          tooltip: 'This task was a required assignment.',
        });
      }
      if (reliable === false) {
        tags.push({
          value: 'Unreliable',
          icon: 'pi pi-times',
          severity: 'warning',
          tooltip: engagementFlags
            ? `The run was marked unreliable because of the following flags: \n \n ${Object.keys(engagementFlags)
                .map((flag) => _lowerCase(flag))
                .join(', ')}`
            : 'The run was marked as unreliable.',
        });
      } else {
        tags.push({
          value: 'Reliable',
          severity: 'success',
          icon: 'pi pi-check',
          tooltip: `The student's behavior did not trigger any flags and the run can be considered reliable`,
        });
      }

      // determine which score to display in the card based on grade
      let scoreToDisplay = grade.value >= 6 ? 'standardScore' : 'percentileScore';
      if (rawOnlyTasks.includes(taskId)) {
        scoreToDisplay = 'rawScore';
      }

      computedTaskAcc[taskId] = {
        taskId: taskId,
        scoreToDisplay: scoreToDisplay,
        ...scoresForTask,
        tags: tags,
      };

      // initialize array with precomputed raw, std, percentile scores
      let formattedScoresArray = Object.keys(scoresForTask).map((key) => {
        const score = computedTaskAcc[taskId][key];
        if (score.name != undefined) {
          return [score.name, score.value, score.min, score.max];
        }
        return;
      });

      if (taskId === 'pa') {
        const first = scores?.FSM?.roarScore;
        const last = scores?.LSM?.roarScore;
        const deletion = scores?.DEL?.roarScore;
        let skills = [];
        if (first < 15) skills.push('FSM');
        if (last < 15) skills.push('LSM');
        if (deletion < 15) skills.push('DEL');

        const skillsString = skills.length >= 0 ? skills.join(', ') : 'None';

        formattedScoresArray.push(['First Sound Matching (FSM)', first]);
        formattedScoresArray.push(['Last Sound Matching (LSM)', last]);
        formattedScoresArray.push(['Deletion (DEL)', deletion]);
        formattedScoresArray.push(['Skills to work on', skillsString]);
      } else if (taskId === 'letter') {
        formattedScoresArray;
        const incorrectLetters = [
          scores?.UppercaseNames?.upperIncorrect ?? ''.split(','),
          scores?.LowercaseNames?.lowerIncorrect ?? ''.split(','),
        ]
          .sort((a, b) => _toUpper(a) - _toUpper(b))
          .filter(Boolean)
          .join(', ');

        const incorrectPhonemes = scores?.Phonemes?.phonemeIncorrect ?? ''.split(',').join(', ');

        const lowerCaseScore = scores?.LowercaseNames?.subScore;
        const upperCaseScore = scores?.UppercaseNames?.subScore;
        const letterSoundsScore = scores?.Phonemes?.subScore;
        formattedScoresArray.push(['Lower Case Letters', lowerCaseScore, 0, 26]);
        formattedScoresArray.push(['Upper Case Letters', upperCaseScore, 0, 26]);
        formattedScoresArray.push(['Letter Sounds', letterSoundsScore, 0, 38]);
        formattedScoresArray.push(['Letters to work on', incorrectLetters]);
        formattedScoresArray.push(['Sounds to work on', incorrectPhonemes]);
      }

      // Ensure scores are in consistent order
      const order = { 'Raw Score': 2, 'Percentile Score': 1, 'Standard Score': 0 };
      // remove percentile score from datatable for grades at and over sixth
      if (grade.value >= 6) {
        formattedScoresArray = formattedScoresArray.filter(([key]) => key !== 'Percentile Score');
      }

      const sortedScoresArray = formattedScoresArray.sort((first, second) => {
        return order[first[0]] - order[second[0]];
      });

      computedTaskAcc[taskId].scoresArray = sortedScoresArray;
    }
  }

  // sort tasks by order of appearance in the taskDisplayNames object
  return Object.keys(computedTaskAcc)
    .sort((a, b) => taskDisplayNames[a].order - taskDisplayNames[b].order)
    .map((taskId) => computedTaskAcc[taskId]);
});

function getSupportLevelLanguage(grade, percentile, rawScore, taskId) {
  const { support_level } = getSupportLevel(grade, percentile, rawScore, taskId);
  if (support_level) {
    if (support_level === 'Achieved Skill') {
      return 'have achieved the skill of';
    } else if (support_level === 'Developing Skill') {
      return 'are developing the skill of';
    } else if (support_level === 'Needs Extra Support') {
      return 'need extra support in';
    }
  }
}

function getPercentileWithSuffix(percentile) {
  if (percentile % 10 === 1 && percentile !== 11) {
    return percentile + 'st';
  } else if (percentile % 10 === 2 && percentile !== 12) {
    return percentile + 'nd';
  } else if (percentile % 10 === 3 && percentile !== 13) {
    return percentile + 'rd';
  } else {
    return percentile + 'th';
  }
}

function getPercentileSuffix(percentile) {
  if (percentile % 10 === 1 && percentile !== 11) {
    return '{value}st';
  } else if (percentile % 10 === 2 && percentile !== 12) {
    return '{value}nd';
  } else if (percentile % 10 === 3 && percentile !== 13) {
    return '{value}rd';
  } else {
    return '{value}th';
  }
}
</script>

<style scoped>
.score {
  position: relative;
  font-size: 1.7rem;
}

.score-card {
  outline: 3px solid var(--primary-color);
  width: fit-content;
  border-radius: 1rem;
  min-height: 30rem;
}

.score-description {
  font-size: 1.1rem;
  margin-top: 1rem;
  max-width: 22rem;
}

.score-table {
  max-width: 18rem;
}

.header-task-name {
  font-size: 1.4rem;
  font-weight: bold;
  border-radius: 12px;
}

.error {
  color: red;
  font-size: 1.2rem;
  border: 2px solid red;
  border-radius: 12px;
}

.score-wrapper {
  border-radius: 0.3rem;
}

@media (min-width: 768px) {
  .score {
    margin-top: 156px;
    right: 50%;
  }
}
</style>
