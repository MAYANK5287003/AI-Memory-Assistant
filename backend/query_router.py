# query_router.py

class QueryRoute:
    TEXT = "text"
    FACE = "face"
    OCR = "ocr"
    HYBRID = "hybrid"


class SmartQueryRouter:
    """
    Routes user queries to the correct memory pipeline.
    """

    TEXT_KEYWORDS = [
        "notes", "explain", "what is", "define",
        "cnn", "dbms", "os", "theory"
    ]

    FACE_KEYWORDS = [
        "photo", "photos", "picture", "pictures",
        "image of", "person", "who is"
    ]

    OCR_KEYWORDS = [
        "from image", "from pdf", "from document",
        "scanned", "ocr"
    ]

    def detect_route(self, query: str) -> str:
        q = query.lower()
        matches = set()

        # TEXT intent
        if any(k in q for k in self.TEXT_KEYWORDS):
            matches.add(QueryRoute.TEXT)

        # FACE intent
        if any(k in q for k in self.FACE_KEYWORDS):
            matches.add(QueryRoute.FACE)

        # OCR intent
        if any(k in q for k in self.OCR_KEYWORDS):
            matches.add(QueryRoute.OCR)

        # Routing decision
        if len(matches) == 1:
            return matches.pop()

        if len(matches) > 1:
            return QueryRoute.HYBRID

        # Default fallback
        return QueryRoute.TEXT
