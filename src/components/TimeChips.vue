<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  timestamps: number[]
  selectedIndex?: number
  reverse?: boolean,
  useUtc?: boolean,
  dateOnly?: boolean
  hourOnly?: boolean
}

interface Emits {
  (e: 'select', payload: { value: number; index: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedIndex: -1,
  reverse: false,
  useUtc: false,
  dateOnly: false,
  hourOnly: false
});

const emit = defineEmits<Emits>();


const formatDate = (timestamp: number): string => {
  if (props.useUtc) {
    const date = new Date(timestamp);
    timestamp = date.getTime() + date.getTimezoneOffset() * 60*1000; // Adjust for UTC offset
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (timestamp: number): string => {
  if (props.useUtc) {
    const date = new Date(timestamp);
    timestamp = date.getTime() + date.getTimezoneOffset() * 60*1000; // Adjust for UTC offset
  }
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};



const timestampsComputed = computed(() => 
  props.reverse ? [...props.timestamps].sort((a,b) => b-a) : [...props.timestamps].sort((a,b) => a-b)
);

const formattedDates = computed(() => 
  timestampsComputed.value.map(timestamp => formatDate(timestamp))
);

const formattedTimes = computed(() => 
  timestampsComputed.value.map(timestamp => formatTime(timestamp))
);
const handleChipClick = (value: number, index: number) => {
  emit('select', { value, index });
};
</script>

<template>
  <div class="time-chips-container">
    <div class="chips-grid">
      <button
        v-for="(timestamp, index) in timestampsComputed"
        :key="timestamp"
        :class="[
          'time-chip',
          { 'active': index === selectedIndex }
        ]"
        @click="handleChipClick(timestamp, index)"
      >
        <div class="chip-content">
          <span 
            v-if="!hourOnly"
            class="chip-date">{{ formattedDates[index] }}</span>
          <span 
            v-if="!dateOnly"
            class="chip-time">{{ formattedTimes[index] }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.time-chips-container {
  width: 100%;
  max-height: 300px;
  background: transparent;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.chips-grid {
  /* display: grid; */
  /* grid-template-columns: repeat(5, 1fr); */
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
  gap: 8px;
  max-height: 276px;
  overflow-y: auto;
}



.time-chip {
  flex-basis: 15%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: fit-content;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  user-select: none;
}

.time-chip:hover {
  background: #8cc5ff;
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.time-chip:active {
  background: #8cc5ff;
}

.time-chip.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.3);
}

.time-chip.active:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.chip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
  line-height: 1.2;
}

.chip-date {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.9;
}

.chip-time {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.8;
}

.time-chip.active .chip-date,
.time-chip.active .chip-time {
  opacity: 1;
}

@media (max-width: 768px) {
  .time-chips-container {
    padding: 8px;
    max-height: 250px;
  }
  
  .chips-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    max-height: 234px;
  }
  
  .time-chip {
    height: 48px;
    padding: 6px;
  }
  
  .chip-date {
    font-size: 10px;
  }
  
  .chip-time {
    font-size: 9px;
  }
}
</style>