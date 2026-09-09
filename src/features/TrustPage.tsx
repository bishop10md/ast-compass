import {
  aiScientificContentStatement,
  clinicalContextBoundary,
  representedStandardScopes,
  scientificReviewStatusDefinitions,
  scientificSourceHierarchy,
  scientificUpdateWorkflow,
  unsupportedStandardMessage,
} from "../data";
import ScientificIssueLink from "../components/ScientificIssueLink";
import { trackReferenceViewed } from "../lib/productAnalytics";
import ContactChannels from "../components/ContactChannels";

const statusClass = (status: "Demo" | "Reviewed" | "Verified") => status === "Demo" ? "demo" : status.toLowerCase();

export default function TrustPage() {
  return <>
    <div className="page-head">
      <p className="eyebrow">Scientific review, privacy, and security</p>
      <h1>AST Compass Trust Center</h1>
      <p>How scientific content is sourced, reviewed, versioned, bounded, and corrected—and how the public application protects an account-free educational experience.</p>
    </div>

    <section className="panel legal-intro" aria-labelledby="scientific-purpose">
      <h2 id="scientific-purpose">Scientific purpose</h2>
      <p>AST Compass connects antimicrobial-susceptibility results, resistance mechanisms, molecular markers, expected phenotypes, and source context for education and structured laboratory learning. It is not represented as a clinical decision system, patient-record system, validated medical device, or replacement for professional judgment.</p>
    </section>

    <div className="legal-sections">
      <section aria-labelledby="scientific-sourcing">
        <h2 id="scientific-sourcing">Scientific Review &amp; Governance</h2>
        <h3>How scientific content is sourced</h3>
        <p>Scientific claims should remain traceable to identifiable sources. The source hierarchy includes:</p>
        <ul>{scientificSourceHierarchy.map((source) => <li key={source}>{source}</li>)}</ul>
        <p>Source inclusion does not itself mean that a record has completed review or independent verification.</p>
        <h3>How content is reviewed</h3>
        {scientificReviewStatusDefinitions.map((definition) => <div className="content-status" key={definition.status}>
          <span className={`review-badge ${statusClass(definition.status)}`}>{definition.publicLabel}</span>
          <span>{definition.meaning}</span>
        </div>)}
        <p>Current records keep their documented status. AST Compass does not display reviewer names, qualifications, dates, or verification claims unless real review metadata exists.</p>
      </section>

      <section aria-labelledby="standards-scope">
        <h2 id="standards-scope">Supported Standards &amp; Scope</h2>
        <p>AST practices may differ by country or region, standard-setting organization, laboratory, method, organism, antimicrobial, and specimen or clinical context. CLSI, EUCAST, and regulatory criteria are distinct systems: AST Compass does not treat them as interchangeable and does not convert values between standards.</p>
        <p>The following source contexts are represented in the current architecture. A catalog entry does not establish comprehensive clinical implementation; each displayed scientific result must identify its own applicable standard, edition or version, source, content-review status, and last-reviewed date when documented.</p>
        <dl>
          {representedStandardScopes.map((standard) => <div key={standard.id}>
            <dt>{standard.organization} · {standard.document}</dt>
            <dd><strong>{standard.editionOrVersion}</strong> — {standard.scope}. {standard.sourceUrl ? <a href={standard.sourceUrl} target="_blank" rel="noreferrer" onClick={() => trackReferenceViewed(standard.sourceId)}>Source: {standard.sourceLabel} ↗</a> : <>Source record: {standard.sourceLabel}</>}</dd>
          </div>)}
        </dl>
        <aside className="warning-box" aria-label="Unsupported standard guidance">
          <b>UNSUPPORTED STANDARD</b>
          <p>{unsupportedStandardMessage}</p>
        </aside>
      </section>

      <section aria-labelledby="ai-transparency">
        <h2 id="ai-transparency">AI &amp; Scientific Content</h2>
        <p>{aiScientificContentStatement}</p>
        <p>AST Compass does not describe scientific content as “AI validated.”</p>
      </section>

      <section aria-labelledby="update-policy">
        <h2 id="update-policy">Scientific Content Update Policy</h2>
        <p>Relevant standards and guidance are monitored, but a new publication does not automatically replace an existing scientific record. Proposed changes require controlled source review, impact assessment, testing, and a versioned release.</p>
        <ol>{scientificUpdateWorkflow.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>Breakpoint values and other scientific rules are not injected from AI output or uncontrolled web sources. Governance metadata is designed to preserve prior and new versions, sources, reasons, dates, reviewers, and affected organisms, antimicrobials, or modules when a controlled change occurs.</p>
      </section>

      <section aria-labelledby="clinical-boundary">
        <h2 id="clinical-boundary">Clinical Context Boundary</h2>
        <p>{clinicalContextBoundary}</p>
        <p>AST Compass does not request patient diagnosis, medical history, prior therapy, renal function, pregnancy, comorbidities, or other patient-specific treatment inputs.</p>
      </section>

      <section aria-labelledby="no-phi-policy">
        <h2 id="no-phi-policy">Privacy &amp; No-PHI policy</h2>
        <p>Do not upload protected health information or patient-identifiable material. Public image workflows accept only de-identified educational images, process them in the browser for the current session, and do not add them to persistent personal history.</p>
        <p>Image decoding, OCR, privacy screening, and AST-text extraction run in the browser using application-hosted resources. Uploaded AST images are not sent to a general-purpose AI service.</p>
      </section>

      <section aria-labelledby="security">
        <h2 id="security">Security</h2>
        <p>The public application is served over HTTPS from astcompass.com using Netlify. Supabase supports private feedback and retained future account architecture. Optional error and aggregate usage telemetry may be blocked without preventing core educational pages from opening.</p>
        <p>Public accounts are currently disabled. Current Chrome, Edge, Firefox, and Safari versions are the intended browser targets. Browsers without optional privacy-screening APIs receive a clearly labeled degraded state; the PHI gate is not silently bypassed.</p>
        <p>AST Compass does not claim third-party certification, penetration testing, HIPAA compliance, hospital approval, FDA approval, or clinical validation.</p>
      </section>

      <section aria-labelledby="report-issue">
        <h2 id="report-issue">Report an Issue</h2>
        <p>Report a suspected scientific error or outdated source to the scientific-review mailbox. Send access, privacy, or security concerns to support. The Feedback form remains available for structured reports. Reports may identify the page route, a non-patient content ID, and the AST Compass application version; they must not include patient data, image content, MIC tables, or private analysis content.</p>
        <ContactChannels channels={["review", "support"]} title="Issue-reporting contacts" compact/>
        <ScientificIssueLink contentId="trust-center"/>
      </section>
    </div>
  </>;
}
