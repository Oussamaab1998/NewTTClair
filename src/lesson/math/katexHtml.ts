import katex from 'katex';

import { theme } from '../../theme';
import { KATEX_CSS } from './katexCss.generated';

/** KaTeX CSS sets `.katex { font-size: 1.21em }`; divide so sizes match the native renderer. */
const KATEX_SCALE = 1.21;

/**
 * Renders LaTeX to KaTeX HTML in the app's JS runtime (no KaTeX JS inside the
 * WebView), then wraps it in a self-contained page. The page posts its height
 * once fonts are ready so the WebView can size itself.
 */
export function renderKatexDocument(
  latex: string,
  opts: { fontSize: number; color: string },
): string {
  const body = katex.renderToString(latex, {
    displayMode: true,
    throwOnError: true,
    output: 'html',
    strict: 'error',
    trust: false,
  });
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${KATEX_CSS}
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
#m{direction:ltr;font-size:${(opts.fontSize / KATEX_SCALE).toFixed(
    2,
  )}px;color:${opts.color};padding:${theme.katex.paddingY}px 0}
.katex-display{margin:0}
</style></head><body><div id="m">${body}</div>
<script>
(function(){
  function send(){
    var h=Math.ceil(document.getElementById('m').getBoundingClientRect().height);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready',height:h}));
  }
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(send);
})();
</script></body></html>`;
}
