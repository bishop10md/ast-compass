import { CONTACT_CHANNELS, contactHref, type ContactChannel } from "../config/contactChannels";

export default function ContactChannels({
  channels,
  title = "Contact AST Compass",
  compact = false,
}: {
  channels: ContactChannel[];
  title?: string;
  compact?: boolean;
}) {
  return <section className={`contact-channels${compact ? " compact" : ""}`} aria-labelledby={`contact-${channels.join("-")}`}>
    <h2 id={`contact-${channels.join("-")}`}>{title}</h2>
    <div>
      {channels.map((channel) => {
        const contact = CONTACT_CHANNELS[channel];
        return <article key={channel}>
          <b>{contact.label}</b>
          <span>{contact.purpose}</span>
          <a href={contactHref(channel)}>{contact.address}</a>
        </article>;
      })}
    </div>
    <small>Do not send patient information, identifiable clinical reports, credentials, or other sensitive data by email.</small>
  </section>;
}
