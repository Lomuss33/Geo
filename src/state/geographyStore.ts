import { create } from 'zustand';
import { countryInScope, type GeographicScopeId } from '../lib/geography';

type GeographyState = {
  scope: GeographicScopeId;
  selectedIso: string | null;
  notice: string;
  setScope: (scope: GeographicScopeId) => void;
  selectCountry: (iso3: string) => void;
};

export const useGeographyStore = create<GeographyState>((set) => ({
  scope: 'world',
  selectedIso: null,
  notice: '',
  setScope: (scope) =>
    set((state) => {
      const retained =
        state.selectedIso && countryInScope(state.selectedIso, scope);
      return {
        scope,
        selectedIso: retained ? state.selectedIso : null,
        notice:
          state.selectedIso && !retained
            ? 'Previous selection cleared: outside this scope.'
            : '',
      };
    }),
  selectCountry: (selectedIso) => set({ selectedIso, notice: '' }),
}));
