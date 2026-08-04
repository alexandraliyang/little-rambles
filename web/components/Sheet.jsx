/* Sheet — the bottom sheet, extracted so components outside app.jsx can use it.
   Viewport-anchored and scrolled to its own top (FB6-04/FB8-02): .phone is
   min-height:100vh and on iOS 100vh is taller than the visible screen, so an
   absolutely positioned overlay lands partly below the fold. */
import React, { useRef, useEffect } from "react";

export default function Sheet({ children, onClose }) {
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollTop = 0; }, []);
  return <div className="sheetbg" onClick={onClose}>
    <div className="sheet" ref={box} onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>;
}
