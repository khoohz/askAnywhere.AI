import { createRoot } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

import { AnnotationLayer } from '../src/components/annotation-layer';
import '../src/components/annotation-layer.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-web-annotation',
      position: 'inline',
      anchor: 'body',
      isolateEvents: true,
      onMount(container) {
        const root = createRoot(container);
        root.render(<AnnotationLayer />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
