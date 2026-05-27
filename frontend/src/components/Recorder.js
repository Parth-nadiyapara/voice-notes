function Recorder({ isRecording, isProcessing, disabled, onStart, onStop }) {
  const status = isProcessing ? "Processing..." : isRecording ? "Recording..." : "Ready to record";
  const helper = isProcessing
    ? "Your audio is being transcribed and added as a note."
    : isRecording
      ? "Tap stop when your note is complete."
      : "Start a new note with your voice.";

  return (
    <section className={`recorder-panel ${isProcessing ? "is-processing" : ""}`}>
      <button
        className={`mic-button ${isRecording ? "is-recording" : ""}`}
        onClick={isRecording ? onStop : onStart}
        disabled={disabled || isProcessing}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <span>{isProcessing ? "…" : isRecording ? "■" : "●"}</span>
      </button>

      <div className="recorder-copy">
        <p>{status}</p>
        <span>{helper}</span>
      </div>
    </section>
  );
}

export default Recorder;
