const RESIZE_HANDLE_SIZE = 20;

export function isResizeHandlePointer(
  pointer: { clientX: number; clientY: number },
  rect: { bottom: number; right: number },
) {
  return pointer.clientX >= rect.right - RESIZE_HANDLE_SIZE
    && pointer.clientY >= rect.bottom - RESIZE_HANDLE_SIZE;
}
