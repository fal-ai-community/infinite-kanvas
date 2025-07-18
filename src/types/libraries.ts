/**
 * Library types for the Inspiration Libraries feature
 */

/**
 * Represents a library of design elements or templates
 */
export interface Library {
  /** Unique identifier for the library */
  id: string;

  /** Display name of the library */
  title: string;

  /** Detailed description of the library and its contents */
  description: string;

  /** URL to the library's thumbnail image */
  thumbnailUrl: string;

  /** Name of the library's author or creator */
  author: string;

  /** When the library was created */
  createdAt?: Date;

  /** When the library was last updated */
  updatedAt?: Date;

  /** Number of times the library has been downloaded */
  downloadCount: number;

  /** Tags for categorizing and searching libraries */
  tags?: string[];

  /** Elements contained in the library */
  elements?: LibraryElement[];
}

/**
 * Types of elements that can be in a library
 */
export type LibraryElementType =
  | "shape"
  | "template"
  | "component"
  | "image"
  | "other";

/**
 * Represents an individual element within a library
 */
export interface LibraryElement {
  /** Unique identifier for the element */
  id: string;

  /** Type of element */
  type: LibraryElementType;

  /** Display name of the element */
  name: string;

  /** URL to the element's thumbnail image */
  thumbnailUrl: string;

  /** The actual element data to be rendered on canvas */
  data: any;

  /** Additional metadata about the element */
  metadata?: {
    /** Width of the element in pixels */
    width?: number;

    /** Height of the element in pixels */
    height?: number;

    /** When the element was created */
    createdAt?: Date;

    /** Tags for categorizing and searching elements */
    tags?: string[];

    /** Additional properties specific to the element type */
    [key: string]: any;
  };
}

/**
 * Validation functions for library data
 */
export const LibraryValidation = {
  /**
   * Validates a library object
   * @param library The library to validate
   * @returns True if the library is valid, false otherwise
   */
  isValidLibrary(library: Partial<Library>): boolean {
    return !!(
      library.id &&
      library.title &&
      library.description &&
      library.thumbnailUrl &&
      library.author
    );
  },

  /**
   * Validates a library element object
   * @param element The element to validate
   * @returns True if the element is valid, false otherwise
   */
  isValidLibraryElement(element: Partial<LibraryElement>): boolean {
    return !!(
      element.id &&
      element.type &&
      element.name &&
      element.thumbnailUrl &&
      element.data
    );
  },
};
