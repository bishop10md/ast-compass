export default function TrustPage() {
  return <>
    <div className="page-head">
      <p className="eyebrow">Security and institutional review</p>
      <h1>AST Compass Trust Center</h1>
      <p>Plain-language information for users, hospital IT teams, university networks, and security reviewers.</p>
    </div>
    <section className="panel legal-intro">
      <h2>Educational purpose</h2>
      <p>AST Compass is an educational antimicrobial-susceptibility and resistance-learning platform. It is not represented as a clinical decision system, patient-record system, or validated medical device.</p>
    </section>
    <div className="legal-sections">
      <section><h2>No-PHI policy</h2><p>Do not upload protected health information or patient-identifiable material. Public image workflows accept only de-identified educational images, process them in the browser for the current session, and do not add them to persistent personal history.</p></section>
      <section><h2>Image processing</h2><p>Image decoding, OCR, privacy screening, and AST-text extraction run in the browser using application-hosted resources. Uploaded AST images are not sent to a general-purpose AI service.</p></section>
      <section><h2>Network and hosting</h2><p>The public application is served over HTTPS from astcompass.com using Netlify. Supabase supports feedback and retained future account architecture. Optional error and aggregate usage telemetry may be blocked without preventing core educational pages from opening.</p></section>
      <section><h2>Authentication status</h2><p>Public accounts are currently disabled. All public scientific and educational tools work without signing in. Account routes are not linked or indexed while validation continues.</p></section>
      <section><h2>Supported browsers</h2><p>Current versions of Chrome, Edge, Firefox, and Safari are the intended targets. Browsers without optional barcode or face-detection APIs receive a clearly labeled degraded privacy-screening state; the PHI gate is not silently bypassed.</p></section>
      <section><h2>Responsible reporting</h2><p>Security or privacy concerns can be submitted through the public Feedback page. AST Compass does not publish an unmonitored security mailbox or claim third-party certification, penetration testing, HIPAA compliance, or clinical validation.</p></section>
    </div>
  </>;
}
