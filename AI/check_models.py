import google.generativeai as genai
import os
from dotenv import load_dotenv

# Path to backend .env
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
load_dotenv(dotenv_path)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Listing all available models:")
try:
    for m in genai.list_models():
        print(f"Name: {m.name}, Display: {m.display_name}, Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Error: {e}")
