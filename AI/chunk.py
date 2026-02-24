try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        raise ImportError("Please install langchain or langchain-text-splitters: pip install langchain")

def split_text(text, chunk_size=1000, chunk_overlap=100):
    """
    Splits text into chunks recursively.
    Adjust chunk_size and chunk_overlap based on your needs.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter.split_text(text)
