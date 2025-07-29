# ai_services.py
import whisper
from transformers import pipeline

print("Loading AI models...")
whisper_model = whisper.load_model("tiny")
summarizer = pipeline("summarization", model="t5-small")
sentiment_analyzer = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
print("AI models loaded successfully!")

def transcribe_audio(audio_path: str):
    """Transcribes an audio file using Whisper."""
    print(f"Starting transcription for {audio_path}...")
    result = whisper_model.transcribe(audio_path)
    print("Transcription finished.")
    return result['text']

def analyze_text(text: str):
    """Analyzes text for sentiment and provides a summary."""
    print("Starting analysis...")
    sentiment = sentiment_analyzer(text)[0]
    word_count = len(text.split())
    if word_count > 50:
        summary = summarizer(text, max_length=50, min_length=15, do_sample=False)[0]['summary_text']
    else:
        summary = "Text too short to summarize."
    print("Analysis finished.")
    return {
        "sentiment": sentiment['label'],
        "sentiment_score": round(sentiment['score'], 2),
        "summary": summary
    }