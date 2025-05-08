# StoryFlicks Backend

This is the backend service for StoryFlicks application built with FastAPI.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000
API documentation will be available at http://localhost:8000/docs

## Project Structure

```
backend/
├── main.py          # Main application entry point
├── requirements.txt # Project dependencies
└── README.md       # Project documentation
```
