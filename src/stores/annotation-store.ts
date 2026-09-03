import { create } from 'zustand';

import type { SelectionSnapshot } from '../content/selection';

interface AnnotationStore {
  enabled: boolean;
  selection?: SelectionSnapshot;
  setEnabled(enabled: boolean): void;
  setSelection(selection: SelectionSnapshot): void;
  clearSelection(): void;
}

export const useAnnotationStore = create<AnnotationStore>((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: undefined }),
}));
