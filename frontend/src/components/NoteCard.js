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
  const preview = note.content?.trim() || "No content yet.";

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(note.created_at));

  return (
    <button className="note-card" onClick={() => onOpen(note)}>
      <strong>{title}</strong>
      <p>{preview}</p>
      <time>{formattedDate}</time>
    </button>
  );
}

export default NoteCard;
