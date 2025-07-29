import shutil
import time
import os
from fastapi import BackgroundTasks, FastAPI, UploadFile
from pydantic import BaseModel
import ai_services
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

results_db = {}

class AnalysisResult(BaseModel):
    task_id: str
    status: str
    transcript: str | None = None
    sentiment: str | None = None
    summary: str | None = None

def process_call_audio(task_id: str, audio_path: str):
    """The main background task to process a call and then clean up the file."""
    try:
        transcript = ai_services.transcribe_audio(audio_path)
        
        analysis = ai_services.analyze_text(transcript)
        
        results_db[task_id] = {
            "status": "completed",
            "transcript": transcript,
            "sentiment": analysis['sentiment'],
            "summary": analysis['summary']
        }
        print(f"Task {task_id} completed.")
    except Exception as e:
        print(f"Error processing task {task_id}: {e}")
        results_db[task_id] = {"status": "failed", "error": str(e)}
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
            print(f"Cleaned up temporary file: {audio_path}")


@app.post("/api/analyze-call", status_code=202)
def analyze_call(background_tasks: BackgroundTasks, file: UploadFile):
    """
    Accepts an audio file upload and starts the analysis.
    """
    task_id = f"task_{int(time.time())}"
    results_db[task_id] = {"status": "processing"}

    temp_file_path = f"temp_{task_id}_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    background_tasks.add_task(process_call_audio, task_id, temp_file_path)

    return {"message": "Analysis started", "task_id": task_id}


@app.get("/api/results/{task_id}", response_model=AnalysisResult)
def get_results(task_id: str):
    """Checks the status and gets the result of a task."""
    result = results_db.get(task_id, {})
    status = result.get("status", "not_found")
    
    if status == "completed":
        return AnalysisResult(task_id=task_id, **result)
    
    return AnalysisResult(task_id=task_id, status=status)