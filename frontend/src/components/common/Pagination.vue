<template>
  <div class="pagination-container">
    <button 
      @click="$emit('page-change', currentPage - 1)" 
      :disabled="isPrevDisabled" 
      class="btn-page"
    >
      &lt; 上一页
    </button>
    
    <div class="page-info">
      <span v-if="showPageNumbers" class="page-numbers">
        <button 
          v-for="page in visiblePages" 
          :key="page"
          @click="$emit('page-change', page)"
          :class="['btn-page-number', { active: page === currentPage }]"
        >
          {{ page }}
        </button>
      </span>
      <span class="page-text">
        第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
      </span>
      <span v-if="totalItems" class="total-items">
        (共 {{ totalItems }} 条记录)
      </span>
    </div>
    
    <button 
      @click="$emit('page-change', currentPage + 1)" 
      :disabled="isNextDisabled" 
      class="btn-page"
    >
      下一页 &gt;
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
    validator: (value) => value >= 1
  },
  totalPages: {
    type: Number,
    required: true,
    validator: (value) => value >= 1
  },
  totalItems: {
    type: Number,
    default: null
  },
  showPageNumbers: {
    type: Boolean,
    default: false
  },
  maxVisiblePages: {
    type: Number,
    default: 5
  }
});

defineEmits(['page-change']);

const isPrevDisabled = computed(() => props.currentPage <= 1);
const isNextDisabled = computed(() => props.currentPage >= props.totalPages || props.totalPages <= 1);

const visiblePages = computed(() => {
  if (!props.showPageNumbers) return [];
  
  const pages = [];
  const start = Math.max(1, props.currentPage - Math.floor(props.maxVisiblePages / 2));
  const end = Math.min(props.totalPages, start + props.maxVisiblePages - 1);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
});
</script>

<style scoped>
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn-page {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn-page:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #007bff;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.btn-page-number {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  min-width: 2rem;
}

.btn-page-number:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

.btn-page-number.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.page-text {
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
}

.total-items {
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .pagination-container {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .page-info {
    flex-direction: column;
    text-align: center;
  }
}
</style>