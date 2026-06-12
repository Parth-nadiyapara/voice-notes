function createFallbackTitle(content) {
  const words = (content || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 6);

  return words.length ? words.join(" ") : "Untitled note";
}

function NoteCard({ note, onOpen }) {
  const title = note.title?.trim() || createFallbackTitle(note.content);
  const isProcessing = note.transcription_status === "processing";
  const isFailed = note.transcription_status === "failed";
  const preview = isProcessing
    ? "Transcription is processing..."
    : isFailed
      ? note.transcription_error || "Transcription failed."
      : note.content?.trim() || "No content yet.";

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(note.created_at));

  return (
    <button className="note-card" onClick={() => onOpen(note)}>
      <strong>{title}</strong>
      <p>{preview}</p>
      {isProcessing && <span className="note-status">Processing</span>}
      {isFailed && <span className="note-status error">Failed</span>}
      <time>{formattedDate}</time>
    </button>
  );
}

export default NoteCard;
