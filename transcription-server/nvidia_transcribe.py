import os
import subprocess
import sys
import tempfile


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    if len(sys.argv) < 2:
        print("Audio path is required", file=sys.stderr)
        sys.exit(1)

    api_key = os.environ.get("NVIDIA_NIM_API_KEY") or os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        print("Missing NVIDIA_NIM_API_KEY", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print("Audio file was not found", file=sys.stderr)
        sys.exit(1)

    try:
        import riva.client
    except ImportError:
        print("Missing Python package riva-client. Install it with: pip install nvidia-riva-client", file=sys.stderr)
        sys.exit(1)

    auth = riva.client.Auth(
        uri=os.environ.get("NVIDIA_RIVA_URI", "grpc.nvcf.nvidia.com:443"),
        use_ssl=True,
        metadata_args=[
            ["function-id", os.environ.get("NVIDIA_RIVA_FUNCTION_ID", "b702f636-f60c-4a3d-a6f4-f3568c13bd7d")],
            ["authorization", f"Bearer {api_key}"],
        ],
    )

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
        wav_path = temp_audio.name

    try:
        subprocess.run(
            [
                os.environ.get("FFMPEG_BIN", "ffmpeg"),
                "-y",
                "-i",
                audio_path,
                "-ac",
                "1",
                "-ar",
                "16000",
                "-acodec",
                "pcm_s16le",
                wav_path,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )

        asr_service = riva.client.ASRService(auth)
        config = riva.client.RecognitionConfig(
            encoding=riva.client.AudioEncoding.LINEAR_PCM,
            sample_rate_hertz=16000,
            audio_channel_count=1,
            language_code=os.environ.get("TRANSCRIPTION_LANGUAGE_CODE", "en-US"),
            max_alternatives=1,
            enable_automatic_punctuation=True,
        )

        with open(wav_path, "rb") as audio_file:
            response = asr_service.offline_recognize(audio_file.read(), config)
    except subprocess.CalledProcessError as error:
        print(f"ffmpeg conversion failed: {error.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass

    text = " ".join(result.alternatives[0].transcript.strip() for result in response.results)
    print(" ".join(text.split()))


if __name__ == "__main__":
    main()
