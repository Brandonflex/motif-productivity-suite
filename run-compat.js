// Add the missing global feature that Node 18 lacks for Vite 6+
if (!globalThis.CustomEvent) {
    globalThis.CustomEvent = class CustomEvent extends Event {
      constructor(event, params = { detail: null }) {
        super(event, params);
        this.detail = params.detail;
      }
    };
  }