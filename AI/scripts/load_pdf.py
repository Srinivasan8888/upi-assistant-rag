from pypdf import PdfReader
import os

def load_pdf(file_path):
    """
    Loads text from a PDF file.
    Returns empty string if file not found or unreadable.
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return ""
        
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        return ""
