// Extend JSX intrinsic elements with HTMX attributes so TypeScript doesn't
// complain about hx-* attrs on standard HTML elements.
declare namespace JSX {
  interface HtmxAttributes {
    'hx-get'?: string;
    'hx-post'?: string;
    'hx-put'?: string;
    'hx-delete'?: string;
    'hx-patch'?: string;
    'hx-trigger'?: string;
    'hx-target'?: string;
    'hx-swap'?: string;
    'hx-push-url'?: string;
    'hx-include'?: string;
    'hx-indicator'?: string;
    'hx-confirm'?: string;
    'hx-on'?: string;
    'hx-vals'?: string;
    'hx-boost'?: string;
    'hx-select'?: string;
    'hx-ext'?: string;
    'hx-encoding'?: string;
    'hx-headers'?: string;
    'hx-disabled-elt'?: string;
    'hx-replace-url'?: string;
    'hx-preserve'?: string;
  }

  interface IntrinsicElements {
    [elem: string]: HtmxAttributes & Record<string, unknown>;
  }
}
