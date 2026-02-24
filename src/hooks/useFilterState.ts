/**
 * Custom Hook untuk Filter State Management
 * Mengurangi duplikasi state management untuk filter di berbagai pages
 */

import { useState, useCallback } from 'react';

interface FilterState {
  wo: string;
  dateFrom: string;
  dateTo: string;
}

interface FilterModalState {
  showWoFilter: boolean;
  showDateFilter: boolean;
}

/**
 * Hook untuk manage filter state dan modal state
 */
export const useFilterState = () => {
  const [filterState, setFilterState] = useState<FilterState>({
    wo: '',
    dateFrom: '',
    dateTo: ''
  });

  const [modalState, setModalState] = useState<FilterModalState>({
    showWoFilter: false,
    showDateFilter: false
  });

  const setFilterWo = useCallback((wo: string) => {
    setFilterState(prev => ({ ...prev, wo }));
  }, []);

  const setFilterDateFrom = useCallback((dateFrom: string) => {
    setFilterState(prev => ({ ...prev, dateFrom }));
  }, []);

  const setFilterDateTo = useCallback((dateTo: string) => {
    setFilterState(prev => ({ ...prev, dateTo }));
  }, []);

  const setShowWoFilter = useCallback((show: boolean) => {
    setModalState(prev => ({ ...prev, showWoFilter: show }));
  }, []);

  const setShowDateFilter = useCallback((show: boolean) => {
    setModalState(prev => ({ ...prev, showDateFilter: show }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterState({ wo: '', dateFrom: '', dateTo: '' });
  }, []);

  return {
    filterState,
    modalState,
    setFilterWo,
    setFilterDateFrom,
    setFilterDateTo,
    setShowWoFilter,
    setShowDateFilter,
    resetFilters
  };
};
