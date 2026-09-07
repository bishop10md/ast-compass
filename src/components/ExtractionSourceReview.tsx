import {useEffect,useState} from 'react';

/** Mounted only after full-image privacy clearance and user attestation. */
export default function ExtractionSourceReview({file}:{file:File}) {
  const [url,setUrl]=useState('');
  const [zoom,setZoom]=useState(1);
  useEffect(()=>{const next=URL.createObjectURL(file);setUrl(next);setZoom(1);return()=>URL.revokeObjectURL(next);},[file]);
  return <aside id="source-image-review" className="extraction-source panel" aria-label="Source image for field verification" tabIndex={-1}>
    <details open><summary>Source image — compare every field</summary>
      <label>Image zoom <input type="range" min={1} max={8} step={0.25} value={zoom} onChange={event=>setZoom(Number(event.target.value))}/><span>{zoom}×</span></label>
      <div className="extraction-source-scroll" tabIndex={0} aria-label="Scrollable original image">
        {url&&<img src={url} alt="Original de-identified image for manual comparison; extraction may be incomplete" style={{width:`${zoom*100}%`,maxWidth:'none'}}/>}
      </div>
      <p>Tap the heading to expand or collapse the source while reviewing rows. Zoom and scroll to inspect small symbols. No image leaves this browser.</p>
    </details>
  </aside>;
}
