import type { ComponentConfig, ComponentCategory, EditableField } from "@/types/liveEdit";

// Extended types for this file
export interface EditableComponentConfig {
  type: string;
  displayName: string;
  icon: string;
  category: ComponentCategory;
  editableFields: EditableField[];
  capabilities: {
    draggable: boolean;
    resizable: boolean;
    deletable: boolean;
    duplicatable: boolean;
    hasChildren: boolean;
  };
  defaultProps: Record<string, any>;
}

export const componentRegistry: Record<string, EditableComponentConfig> = {
  // ===== Layout Components =====
  hero: {
    type: "hero",
    displayName: "Hero Section",
    icon: "🎯",
    category: "layout",
    editableFields: [
      {
        name: "title",
        type: "text",
        label: "Title",
        required: true,
      },
      {
        name: "subtitle",
        type: "text",
        label: "Subtitle",
      },
      {
        name: "backgroundImage",
        type: "image",
        label: "Background Image",
      },
      {
        name: "ctaText",
        type: "text",
        label: "Button Text",
      },
      {
        name: "ctaLink",
        type: "link",
        label: "Button Link",
      },
      {
        name: "alignment",
        type: "select",
        label: "Text Alignment",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      title: "Hero Title",
      subtitle: "Hero subtitle goes here",
      alignment: "center",
      ctaText: "Learn More",
      ctaLink: "/",
    },
  },

  spacer: {
    type: "spacer",
    displayName: "Spacer",
    icon: "↕️",
    category: "layout",
    editableFields: [
      {
        name: "height",
        type: "select",
        label: "Height",
        options: [
          { label: "Small (16px)", value: "16" },
          { label: "Medium (32px)", value: "32" },
          { label: "Large (64px)", value: "64" },
          { label: "Extra Large (96px)", value: "96" },
        ],
      },
    ],
    capabilities: {
      draggable: true,
      resizable: true,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      height: "32",
    },
  },

  divider: {
    type: "divider",
    displayName: "Divider",
    icon: "➖",
    category: "layout",
    editableFields: [
      {
        name: "style",
        type: "select",
        label: "Style",
        options: [
          { label: "Solid", value: "solid" },
          { label: "Dashed", value: "dashed" },
          { label: "Dotted", value: "dotted" },
        ],
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      style: "solid",
    },
  },

  // ===== Content Components =====
  contentCard: {
    type: "contentCard",
    displayName: "Content Card",
    icon: "📄",
    category: "content",
    editableFields: [
      {
        name: "contentRef",
        type: "text",
        label: "Content ID",
        required: true,
      },
      {
        name: "showImage",
        type: "boolean",
        label: "Show Image",
      },
      {
        name: "showDescription",
        type: "boolean",
        label: "Show Description",
      },
    ],
    capabilities: {
      draggable: true,
      resizable: true,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      showImage: true,
      showDescription: true,
    },
  },

  contentGrid: {
    type: "contentGrid",
    displayName: "Content Grid",
    icon: "📊",
    category: "content",
    editableFields: [
      {
        name: "columns",
        type: "select",
        label: "Columns",
        options: [
          { label: "2 Columns", value: "2" },
          { label: "3 Columns", value: "3" },
          { label: "4 Columns", value: "4" },
        ],
      },
      {
        name: "contentType",
        type: "select",
        label: "Content Type Filter",
        options: [
          { label: "All", value: "all" },
          { label: "Attractions", value: "attraction" },
          { label: "Hotels", value: "hotel" },
          { label: "Dining", value: "dining" },
          { label: "Articles", value: "article" },
        ],
      },
      {
        name: "limit",
        type: "number",
        label: "Max Items",
        defaultValue: 6,
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      columns: "3",
      contentType: "all",
      limit: 6,
    },
  },

  textBlock: {
    type: "textBlock",
    displayName: "Text Block",
    icon: "📝",
    category: "content",
    editableFields: [
      {
        name: "content",
        type: "richtext",
        label: "Content",
        required: true,
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      content: "<p>Enter your text here...</p>",
    },
  },

  heading: {
    type: "heading",
    displayName: "Heading",
    icon: "🔤",
    category: "content",
    editableFields: [
      {
        name: "text",
        type: "text",
        label: "Heading Text",
        required: true,
      },
      {
        name: "level",
        type: "select",
        label: "Heading Level",
        options: [
          { label: "H1", value: "h1" },
          { label: "H2", value: "h2" },
          { label: "H3", value: "h3" },
          { label: "H4", value: "h4" },
        ],
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      text: "New Heading",
      level: "h2",
    },
  },

  // ===== Media Components =====
  imageBlock: {
    type: "imageBlock",
    displayName: "Image",
    icon: "🖼️",
    category: "media",
    editableFields: [
      {
        name: "src",
        type: "image",
        label: "Image",
        required: true,
      },
      {
        name: "alt",
        type: "text",
        label: "Alt Text",
        required: true,
      },
      {
        name: "caption",
        type: "text",
        label: "Caption",
      },
    ],
    capabilities: {
      draggable: true,
      resizable: true,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      alt: "",
      caption: "",
    },
  },

  gallery: {
    type: "gallery",
    displayName: "Image Gallery",
    icon: "🎨",
    category: "media",
    editableFields: [
      {
        name: "layout",
        type: "select",
        label: "Layout",
        options: [
          { label: "Grid", value: "grid" },
          { label: "Masonry", value: "masonry" },
          { label: "Carousel", value: "carousel" },
        ],
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      images: [],
      layout: "grid",
    },
  },

  // ===== Interactive Components =====
  ctaButton: {
    type: "ctaButton",
    displayName: "CTA Button",
    icon: "🔘",
    category: "interactive",
    editableFields: [
      {
        name: "text",
        type: "text",
        label: "Button Text",
        required: true,
      },
      {
        name: "link",
        type: "link",
        label: "Link",
        required: true,
      },
      {
        name: "variant",
        type: "select",
        label: "Style",
        options: [
          { label: "Primary", value: "primary" },
          { label: "Secondary", value: "secondary" },
          { label: "Outline", value: "outline" },
        ],
      },
      {
        name: "size",
        type: "select",
        label: "Size",
        options: [
          { label: "Small", value: "sm" },
          { label: "Medium", value: "md" },
          { label: "Large", value: "lg" },
        ],
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      text: "Click Me",
      link: "/",
      variant: "primary",
      size: "md",
    },
  },

  faqAccordion: {
    type: "faqAccordion",
    displayName: "FAQ Accordion",
    icon: "❓",
    category: "interactive",
    editableFields: [
      {
        name: "title",
        type: "text",
        label: "Section Title",
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: true,
    },
    defaultProps: {
      items: [],
      title: "Frequently Asked Questions",
    },
  },

  // ===== TRAVI-Specific Components =====
  attractionsGrid: {
    type: "attractionsGrid",
    displayName: "Attractions Grid",
    icon: "🎢",
    category: "content",
    editableFields: [
      {
        name: "title",
        type: "text",
        label: "Section Title",
      },
      {
        name: "category",
        type: "select",
        label: "Category Filter",
        options: [
          { label: "All", value: "all" },
          { label: "Theme Parks", value: "theme-parks" },
          { label: "Observation", value: "observation" },
          { label: "Water Parks", value: "water-parks" },
          { label: "Museums", value: "museums" },
        ],
      },
      {
        name: "limit",
        type: "number",
        label: "Max Items",
        defaultValue: 6,
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      title: "Top Attractions",
      category: "all",
      limit: 6,
    },
  },

  hotelsGrid: {
    type: "hotelsGrid",
    displayName: "Hotels Grid",
    icon: "🏨",
    category: "content",
    editableFields: [
      {
        name: "title",
        type: "text",
        label: "Section Title",
      },
      {
        name: "area",
        type: "select",
        label: "Area Filter",
        options: [
          { label: "All", value: "all" },
          { label: "Downtown", value: "downtown" },
          { label: "Palm Jumeirah", value: "palm" },
          { label: "Marina", value: "marina" },
        ],
      },
      {
        name: "limit",
        type: "number",
        label: "Max Items",
        defaultValue: 6,
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      title: "Featured Hotels",
      area: "all",
      limit: 6,
    },
  },

  articlesGrid: {
    type: "articlesGrid",
    displayName: "Articles Grid",
    icon: "📰",
    category: "content",
    editableFields: [
      {
        name: "title",
        type: "text",
        label: "Section Title",
      },
      {
        name: "limit",
        type: "number",
        label: "Max Items",
        defaultValue: 3,
      },
    ],
    capabilities: {
      draggable: true,
      resizable: false,
      deletable: true,
      duplicatable: true,
      hasChildren: false,
    },
    defaultProps: {
      title: "Latest Articles",
      limit: 3,
    },
  },
};

// Helper functions
export function getComponentConfig(type: string): EditableComponentConfig | undefined {
  return componentRegistry[type];
}

export function getComponentsByCategory(category: ComponentCategory): EditableComponentConfig[] {
  return Object.values(componentRegistry).filter(c => c.category === category);
}

export function getAllComponents(): EditableComponentConfig[] {
  return Object.values(componentRegistry);
}

export function getComponentCategories(): ComponentCategory[] {
  return ["layout", "content", "media", "interactive"];
}

export function getCategoryLabel(category: ComponentCategory): string {
  const labels: Record<ComponentCategory, string> = {
    layout: "Layout",
    content: "Content",
    media: "Media",
    interactive: "Interactive",
  };
  return labels[category];
}
