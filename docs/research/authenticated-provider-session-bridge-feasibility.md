# Authenticated provider-session bridge feasibility spike

**Status:** completed historical research; browser-session adapter blocked for production use  
**Provider assessed:** ChatGPT first; Claude reviewed only as the specified fallback comparison  
**Research date:** 2026-09-02  
**Scope:** public Chrome extension and provider documentation only. This investigation did not inspect, call, or reverse-engineer private provider endpoints.

> **V1 decision update:** This report's browser-session conclusion is retained as rationale, not as a V1 prerequisite. V1 now uses a locally supplied API key with the official OpenAI API through a provider-neutral `OpenAIDirectProvider`. It does not implement private endpoints, DOM scraping, credential/session-token extraction, or provider-page UI automation. Direct API-key access is prototype-only; a future AskAnywhere backend replaces it in V2.

## Decision

Chrome extension primitives can technically connect a provider-domain content script to the extension and stream UI-visible events over extension messaging. That is enough to validate the provider-agnostic messaging and cancellation seams with a mock provider.

It is **not** a viable production approach for ChatGPT under the current public terms: a response bridge would need to automatically extract ChatGPT output from the provider page, which OpenAI expressly prohibits. There is also no public, documented ChatGPT web-session bridge or browser automation interface that authorizes an extension to submit prompts and consume streamed responses. Do not implement or test a ChatGPT DOM/UI adapter unless OpenAI gives explicit permission for this use case.

Claude is not a safe fallback for the same hypothesis. Anthropic's Consumer Terms expressly prohibit accessing its services by automated or non-human means unless using an Anthropic API key or Anthropic explicitly permits it. A Claude UI bridge would therefore be more clearly prohibited, not easier to release.

**Historical recommendation:** preserve the no-key hypothesis as a documented feasibility blocker; build and test only provider-agnostic seams with a mock adapter. Re-open a live-provider spike only after obtaining provider authorization or a documented supported integration. Do not advance to product UI or a provider-specific adapter on the basis of DOM automation. This recommendation is superseded for V1 by the official OpenAI API-key prototype decision above.

## Answers to the five questions

| Question | Finding | Confidence |
| --- | --- | --- |
| Can an extension send a prompt through an existing signed-in provider page? | Chrome permits a content script on a permitted host to access the page DOM and communicate with the extension. It could technically attempt DOM-level form interaction. Chrome does not give it access to the provider app's JavaScript state. No public OpenAI bridge documents or authorizes using ChatGPT this way. | High for Chrome capability; high that no documented ChatGPT bridge was found in the official sources reviewed. |
| Can it stream the response back? | A provider-page content script could technically observe DOM changes and forward JSON events over a long-lived extension port. For ChatGPT, the required automatic extraction of output conflicts with OpenAI's Terms. | High. |
| Can this avoid credential storage? | Yes at the extension design level: omit cookie permissions and never read or transmit cookies, browser storage, auth headers, tokens, passwords, or account information. The provider page's ordinary, already-authenticated browser flow would use its own session. This does not remove the policy issue around automated output extraction. | High. |
| How fragile is it? | Very high. DOM selectors, event semantics, rendering timing, component/shadow-DOM structure, accessibility labels, rate-limit UX, and login/challenge flows are private UI implementation details. Chrome's isolated-world model also prevents direct use of provider-page JavaScript state. Every provider UI release could break prompt send, cancellation, or streaming extraction. | High. |
| Are there provider or Chrome Web Store release concerns? | Yes. Provider terms block the necessary automation/extraction. Separately, Chrome Web Store treats page content, form data, browsing activity, and authentication data as user data; requires disclosure/consent, data-use limits, minimum permissions, and a packaged/reviewable MV3 implementation. Chrome rules do not by themselves make a user-initiated DOM bridge categorically forbidden, but they do not override provider terms. | High. |

## Technical architecture: technically possible boundaries, not a provider authorization

Chrome content scripts run in an isolated JavaScript world, but share the DOM with the provider page. They can be injected only on declared/approved hosts and can exchange messages with an extension service worker. A long-lived `runtime.Port` is Chrome's documented multi-message channel; it is suitable for `started`, `delta`, `complete`, `failed`, and `cancelled` events, as well as cancellation commands. [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) · [Message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)

So the *technical* sequence would be:

```text
Host-page UI content script
  <-> service worker (provider-neutral contract and cancellation)
  <-> provider-page content script
  <-> provider page DOM
```

The provider-page script could only use UI-visible DOM state. It cannot directly depend on application variables from the ChatGPT page because Chrome isolates the content-script and page JavaScript contexts. The obvious workarounds—injecting page-context code, observing internal network calls, or replaying authenticated requests—either remain brittle or cross into private-implementation/endpoint reverse engineering. They are out of scope for this spike. [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)

## ChatGPT assessment

### Prompt send

The Chrome portion is mechanically possible: with an explicit ChatGPT host permission, a content script can find visible controls in the DOM and relay a user-initiated `send` command through extension messaging. That would reuse the page's browser session without the extension storing credentials.

But OpenAI publishes API/business terms for developer integrations and does not publish a supported consumer-web-session automation interface. More importantly, a useful bridge must consume the answer, and the Terms for ChatGPT individual services prohibit automatically or programmatically extracting data or output. The interaction cannot be treated as a stable, production-safe adapter. [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/)

### Streaming response

DOM mutation observation could yield incremental visible text, but that is automatic extraction of output. It therefore fails the release criterion even if the prototype appears to work. The spike must not work around this with private API calls, browser-network instrumentation, token/cookie extraction, or endpoint replay.

### Credentials and session handling

The safe technical design would deliberately request no `cookies` permission and retain none of the browser session material. It would not read provider local/session storage, authorization headers, CSRF values, password fields, or cookies. Chrome identifies authentication information, website content, form data, and browsing activity as user data, so accidentally collecting any of them expands privacy obligations. [Chrome Web Store user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

This is an important distinction: **not storing a credential does not authorize automated use of the logged-in service or extraction of its output.**

## Claude fallback comparison

Claude should not be tried as the next live DOM bridge. Its Consumer Terms prohibit accessing the service through automated or non-human means (including a bot or script), except through an Anthropic API key or where Anthropic explicitly permits it. They also prohibit collecting information from the service except where the Terms permit it. That directly covers a content-script prompt sender and a streamed-DOM response reader. [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)

As a result, Claude-first can validate the product concept only if Anthropic supplies an explicit authorization or supported integration; it cannot validate the no-key browser-session automation hypothesis through an undocumented UI adapter.

## Chrome Web Store implications if a provider later authorizes the bridge

The product's selected page text, provider prompt/response, URLs, and any provider-page data are user data under Chrome Web Store policy, including when handled only locally. A release would need all of the following:

- Minimal, provider-specific host permissions—prefer optional host permissions requested only after a user chooses a provider; do not request broad host access for future providers.
- A privacy policy and Chrome Web Store privacy disclosures that accurately describe selection/page-content collection, the local/session retention period, and transmission to the user-selected provider.
- Prominent in-product disclosure plus affirmative consent before handling the data; a privacy policy alone is insufficient.
- A user-facing, user-confirmed send action for every provider prompt. The Chrome Web Store policies prohibit sending messages on the user's behalf without the ability to confirm content and recipients.
- No background collection, ads, monetization, human review, credential capture, bypass of logins/protective measures, or interference with provider functionality.
- Packaged MV3 adapter logic. Do not fetch selector/automation logic from a server to react to provider UI changes; Web Store review requires the extension's functionality to be discernible from the submitted code.

These requirements are a release checklist, not approval from ChatGPT, Claude, or another provider. [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies) · [Chrome Web Store user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

## Safe feasibility protocol

The live provider portion stops here. The remaining permitted spike validates only public Chrome seams and the provider-neutral architecture.

1. Implement an `LLMProvider` contract that emits incremental text and supports `AbortSignal`/explicit cancellation, without provider-specific assumptions.
2. Implement a mock provider-page content script on an extension-owned local fixture or test page. It should simulate `started`/`delta`/`complete`/`failed`/`cancelled` events and use a long-lived Chrome port to the service worker.
3. Test that the host-page content script can start one request, receive ordered deltas, cancel mid-stream, handle disconnection, and prevent a stale stream from writing to a new request.
4. Test the service worker's message validation: tab ID, frame/origin, request ID, event sequence, payload size/type, and cancellation ownership. Treat content-script messages as untrusted as Chrome recommends.
5. Confirm the mock path requests only the permissions necessary for the fixture and does not read cookies, local/session storage, request headers, credentials, or provider-page data.
6. Record the decision as **`browser-session provider integration blocked pending explicit provider authorization`**. Do not add a ChatGPT or Claude production adapter, selector workaround, private endpoint probe, DOM scraper, or automation test against a real account.

## Sources reviewed

All sources below are primary publisher documentation, accessed 2026-09-02.

- [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/) — ChatGPT individual-service terms; prohibits automatically/programmatically extracting data or output and bypassing protective measures.
- [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms) — prohibits automated/non-human access except API-key or explicit permission, and prohibits unpermitted data collection.
- [Chrome: Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) — isolated worlds, shared DOM, injection, and host-permission model.
- [Chrome: Message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) — content-script/service-worker messages and long-lived ports; validates the generic streaming boundary.
- [Chrome: Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — host permissions and content-script origin constraints.
- [Chrome Web Store: User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) — data categories, local handling, disclosure/consent, minimum permission, and annotation example.
- [Chrome Web Store: Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies) — user-data, user-confirmation, interference, and MV3 packaged-code obligations.
