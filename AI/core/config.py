import os
from dotenv import load_dotenv
import google.generativeai as genai

# Determine paths relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ENV_PATH = os.path.join(BASE_DIR, '..', 'backend', '.env')
CORPUS_DIR = os.path.join(BASE_DIR, '..', 'UPI_Corpus')

# Load environment variables
if os.path.exists(BACKEND_ENV_PATH):
    load_dotenv(dotenv_path=BACKEND_ENV_PATH)
    print(f"Loaded environment from {BACKEND_ENV_PATH}")
else:
    print(f"Warning: .env file not found at {BACKEND_ENV_PATH}")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables. Please check your .env file.")

# Configure Gemini globally
genai.configure(api_key=GEMINI_API_KEY)
