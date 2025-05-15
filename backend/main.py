import os
import uuid
import logging
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from datetime import datetime

# Import the rental analysis module
from analysis.analysis import analyzer as rental_analyzer
# Import utility functions
from utils.file_utils import extract_text, save_results_to_json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the FastAPI app
app = FastAPI(
    title="Legal Document Analysis API",
    description="API for analyzing legal documents",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary storage for demonstration
# In a real app, this would be a database
UPLOADS_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ANALYSES = {}

# Create folders if they don't exist
os.makedirs(UPLOADS_FOLDER, exist_ok=True)
RESULTS_FOLDER = os.path.join(os.path.dirname(__file__), 'analysis_results')
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Define Pydantic models for responses
class Category(str):
    FEHLEND = "fehlend"
    UNGEWOEHNLICH = "ungewöhnlich"
    NICHTIG = "nichtig"

class AnalysisItem(BaseModel):
    text: str
    category: Optional[List[str]] = []
    description: str

class EssentialsResponse(BaseModel):
    vertragsparteien: Optional[str]
    mietgegenstand: Optional[str]
    miete: Optional[str]
    mietbeginn: Optional[str]

class UploadResponse(BaseModel):
    id: str
    message: str

class AnalysisResponse(BaseModel):
    id: str
    results: List[AnalysisItem]
    essentials: Optional[EssentialsResponse] = None

class SearchResult(BaseModel):
    text: str
    similarity: float
    category: str

class SearchResponse(BaseModel):
    query: str
    invalid_clauses: List[SearchResult]
    sample_clauses: List[SearchResult]

class UploadedDocument(BaseModel):
    id: str
    filename: str
    upload_date: str

class UploadedDocumentsList(BaseModel):
    documents: List[UploadedDocument]

def analyze_legal_text(text):
    """
    Analyze legal text to identify issues
    Uses the rental agreement analyzer for more sophisticated analysis
    """
    try:
        # Split text into sentences
        sentences = rental_analyzer.split_text_into_sections(text)
        
        logger.info(f"Analyzing document with {len(sentences)} sentences")
        
        # Analyze using the rental agreement analyzer
        results = rental_analyzer.analyze_document_for_issues(sentences, {"source": "api_upload"})
        
        # Log analysis results
        logger.info(f"Analysis complete. Found {len(results)} issues.")
        
        return results
    except Exception as e:
        logger.error(f"Error analyzing with rental analyzer: {e}")
        
        # Fallback to basic analysis
        results = []
        if text.strip():
            results.append({
                "text": "Keine spezifischen problematischen Klauseln identifiziert.",
                "category": "fehlend",
                "description": "Es wurden keine offensichtlich problematischen Klauseln gefunden."
            })
        
        return results

def analyze_essentials(text):
    """
    Analyze the essential contents of a rental agreement
    Uses the rental analyzer to call OpenAI API
    """
    try:
        # Use the rental agreement analyzer for essentials analysis
        results = rental_analyzer.analyze_essentials(text)
        
        # Log analysis results
        logger.info(f"Essentials analysis complete")
        
        return results
    except Exception as e:
        logger.error(f"Error analyzing essentials with rental analyzer: {e}")
        
        # Fallback if analysis fails
        return {
            "analysis": "Fehler bei der Analyse der wesentlichen Vertragsinhalte.",
            "status": "error",
            "error": str(e)
        }

# API endpoints


@app.middleware("http")
async def verify_origin(request: Request, call_next):
    allowed_origin = request.headers.get("x-allowed-origin")
    if allowed_origin != f"https://{os.getenv('DOMAIN')}":
        raise HTTPException(status_code=403, detail="Forbidden: Invalid origin")
    return await call_next(request)

@app.post("/api/upload", response_model=UploadResponse, status_code=201)
async def upload_document(file: UploadFile = File(...)):
    """Upload a document and generate a UUID for it"""
    if not file:
        raise HTTPException(status_code=400, detail="No file part")
    
    if file.filename == "":
        raise HTTPException(status_code=400, detail="No selected file")
    
    # Generate a unique ID
    analysis_id = str(uuid.uuid4())
    
    # Save the file
    file_path = os.path.join(UPLOADS_FOLDER, f"{analysis_id}_{file.filename}")
    
    try:
        # Save uploaded file
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Extract text from the document
        extracted_text = extract_text(file_path)
        
        # Analyze the text
        results = analyze_legal_text(extracted_text)

        essentials = analyze_essentials(extracted_text)
        
        # Format and save the results
        analysis_response = {
            "id": analysis_id,
            "results": results,
            "essentials": essentials
        }
        
        # Store results for API access
        ANALYSES[analysis_id] = analysis_response
        
        # Save to JSON file
        json_path = os.path.join(RESULTS_FOLDER, f"analysis_{analysis_id}.json")
        save_results_to_json(json_path, analysis_response)
        
        return {"id": analysis_id, "message": "File uploaded successfully"}
    
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@app.get("/api/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    """Get analysis results by ID directly from the saved JSON file"""
    # Construct the file path
    file_path = os.path.join(RESULTS_FOLDER, f"analysis_{analysis_id}.json")
    
    # Check if file exists
    if not os.path.exists(file_path):
        # Fallback to in-memory cache
        if analysis_id in ANALYSES:
            analysis = ANALYSES[analysis_id]
        else:
            raise HTTPException(status_code=404, detail="Analysis not found")
    else:
        try:
            # Read analysis from file
            with open(file_path, 'r', encoding='utf-8') as f:
                analysis = json.load(f)
        except Exception as e:
            logger.error(f"Error reading analysis file {file_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading analysis file: {str(e)}")
    
    return {
        "id": analysis["id"],
        "results": analysis["results"],
        "essentials": analysis.get("essentials")
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000) 