import { create } from "zustand";
import { Library, LibraryElement, LibraryValidation } from "@/types/libraries";

/**
 * State interface for libraries
 */
interface LibrariesState {
  // Libraries data
  libraries: Library[];
  filteredLibraries: Library[];
  selectedLibraryId: string | null;

  // UI states
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  sortBy: "title" | "author" | "downloadCount" | "createdAt";
  sortDirection: "asc" | "desc";

  // Actions
  setLibraries: (libraries: Library[]) => void;
  selectLibrary: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (sortBy: LibrariesState["sortBy"]) => void;
  setSortDirection: (direction: "asc" | "desc") => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Library operations
  addLibrary: (library: Library) => void;
  updateLibrary: (id: string, updates: Partial<Library>) => void;
  removeLibrary: (id: string) => void;

  // Utility functions
  getSelectedLibrary: () => Library | null;
  filterLibraries: () => void;
  sortLibraries: () => void;
}

/**
 * Create libraries store
 */
export const useLibrariesStore = create<LibrariesState>((set, get) => ({
  // Initial state
  libraries: [],
  filteredLibraries: [],
  selectedLibraryId: null,
  isLoading: false,
  error: null,
  searchTerm: "",
  sortBy: "downloadCount",
  sortDirection: "desc",

  // Actions
  setLibraries: (libraries) => {
    set({ libraries });
    get().filterLibraries();
    get().sortLibraries();
  },

  selectLibrary: (id) => {
    set({ selectedLibraryId: id });
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().filterLibraries();
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
    get().sortLibraries();
  },

  setSortDirection: (direction) => {
    set({ sortDirection: direction });
    get().sortLibraries();
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  // Library operations
  addLibrary: (library) => {
    if (LibraryValidation.isValidLibrary(library)) {
      set((state) => ({
        libraries: [...state.libraries, library],
      }));
      get().filterLibraries();
      get().sortLibraries();
    } else {
      set({ error: "Invalid library data" });
    }
  },

  updateLibrary: (id, updates) => {
    set((state) => ({
      libraries: state.libraries.map((lib) =>
        lib.id === id ? { ...lib, ...updates } : lib,
      ),
    }));
    get().filterLibraries();
    get().sortLibraries();
  },

  removeLibrary: (id) => {
    set((state) => ({
      libraries: state.libraries.filter((lib) => lib.id !== id),
    }));
    get().filterLibraries();
  },

  // Utility functions
  getSelectedLibrary: () => {
    const { libraries, selectedLibraryId } = get();
    return libraries.find((lib) => lib.id === selectedLibraryId) || null;
  },

  filterLibraries: () => {
    const { libraries, searchTerm } = get();

    if (!searchTerm) {
      set({ filteredLibraries: libraries });
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = libraries.filter((lib) => {
      return (
        lib.title.toLowerCase().includes(lowerSearchTerm) ||
        lib.description.toLowerCase().includes(lowerSearchTerm) ||
        lib.author.toLowerCase().includes(lowerSearchTerm) ||
        (lib.tags &&
          lib.tags.some((tag) => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    });

    set({ filteredLibraries: filtered });
    get().sortLibraries();
  },

  sortLibraries: () => {
    const { filteredLibraries, sortBy, sortDirection } = get();

    const sorted = [...filteredLibraries].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "author":
          comparison = a.author.localeCompare(b.author);
          break;
        case "downloadCount":
          comparison = a.downloadCount - b.downloadCount;
          break;
        case "createdAt":
          if (a.createdAt && b.createdAt) {
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
          }
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    set({ filteredLibraries: sorted });
  },
}));
