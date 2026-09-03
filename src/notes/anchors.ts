import type { SelectionSnapshot } from '../content/selection';
import type { TextAnchor } from './session-note-storage';

const CONTEXT_LENGTH = 160;

export function createTextAnchor(range: Range, selectedText: string): TextAnchor {
  const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer as Element
    : range.commonAncestorContainer.parentElement;
  const text = root?.textContent ?? '';
  const index = text.indexOf(selectedText);
  return {
    selectedText,
    textBefore: index >= 0 ? text.slice(Math.max(0, index - CONTEXT_LENGTH), index) : '',
    textAfter: index >= 0 ? text.slice(index + selectedText.length, index + selectedText.length + CONTEXT_LENGTH) : '',
    cssPath: root ? createCssPath(root) : undefined,
  };
}

export function reanchorText(anchor: TextAnchor): Range | undefined {
  const roots = [
    anchor.cssPath ? document.querySelector(anchor.cssPath) : undefined,
    document.body,
  ].filter((root, index, all): root is Element => Boolean(root) && all.indexOf(root) === index);

  for (const root of roots) {
    const range = rangeForText(root, anchor.selectedText, anchor.textBefore, anchor.textAfter);
    if (range) {
      return range;
    }
  }
  return undefined;
}

export function snapshotFromRange(range: Range): SelectionSnapshot {
  const rect = toRect(range.getBoundingClientRect());
  return {
    text: range.toString().trim(),
    rect,
    rects: Array.from(range.getClientRects(), toRect),
  };
}

function rangeForText(root: Element, selectedText: string, textBefore: string, textAfter: string) {
  const sourceText = root.textContent ?? '';
  let index = sourceText.indexOf(selectedText);
  while (index >= 0) {
    const beforeMatches = !textBefore || sourceText.slice(Math.max(0, index - textBefore.length), index).endsWith(textBefore);
    const afterMatches = !textAfter || sourceText.slice(index + selectedText.length, index + selectedText.length + textAfter.length).startsWith(textAfter);
    if (beforeMatches && afterMatches) {
      return rangeAtOffsets(root, index, index + selectedText.length);
    }
    index = sourceText.indexOf(selectedText, index + 1);
  }
  return undefined;
}

function rangeAtOffsets(root: Element, start: number, end: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let offset = 0;
  let startNode: Text | undefined;
  let startOffset = 0;

  while (node) {
    const textNode = node as Text;
    const nextOffset = offset + textNode.data.length;
    if (!startNode && start >= offset && start <= nextOffset) {
      startNode = textNode;
      startOffset = start - offset;
    }
    if (startNode && end >= offset && end <= nextOffset) {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(textNode, end - offset);
      return range;
    }
    offset = nextOffset;
    node = walker.nextNode();
  }
  return undefined;
}

function createCssPath(element: Element) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body && parts.length < 6) {
    const siblings = Array.from(current.parentElement?.children ?? []).filter((child) => child.tagName === current?.tagName);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`);
    current = current.parentElement;
  }
  return parts.length > 0 ? `body > ${parts.join(' > ')}` : 'body';
}

function toRect(rect: DOMRect | DOMRectReadOnly) {
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
}
