// @wordpress/block-editor ships no top-level types. Only what the label
// editor uses, typed loosely.
declare module "@wordpress/block-editor" {
  type Component<P = Record<string, unknown>> = import("react").ComponentType<
    P & { children?: import("react").ReactNode }
  >;
  type WpBlock = import("@wordpress/blocks").Block;

  export const BlockEditorProvider: Component<{
    value: WpBlock[];
    onInput: (blocks: WpBlock[]) => void;
    onChange: (blocks: WpBlock[]) => void;
    settings?: Record<string, unknown>;
    useSubRegistry?: boolean;
  }>;
  export const BlockList: Component<{
    renderAppender?: false | Component;
    className?: string;
  }>;
  export const BlockTools: Component<{ className?: string }>;
  export const BlockInspector: Component;
  export const BlockSelectionClearer: Component<{
    className?: string;
    style?: import("react").CSSProperties;
  }>;
  export const WritingFlow: Component;
  export const ObserveTyping: Component;
  export const InspectorControls: Component;
  export const __experimentalListView: Component<{
    showBlockMovers?: boolean;
    isExpanded?: boolean;
    description?: string;
  }>;
  export function useBlockEditContext(): {
    clientId: string;
    name: string;
    isSelected: boolean;
  };
  export const BlockEditorKeyboardShortcuts: Component & {
    Register: Component;
  };
  export function useBlockProps(
    props?: Record<string, unknown>,
  ): Record<string, unknown> & { ref?: import("react").Ref<HTMLDivElement> };
  export const store: import("@wordpress/data").StoreDescriptor<
    import("@wordpress/data").ReduxStoreConfig<
      unknown,
      Record<string, (...args: never[]) => unknown>,
      Record<string, (...args: never[]) => unknown>
    >
  >;
}
