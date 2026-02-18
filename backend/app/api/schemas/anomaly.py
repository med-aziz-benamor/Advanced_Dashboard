from pydantic import BaseModel


class AnomaliesResponse(BaseModel):
    anomalies: list[dict]
    window: str
    count: int
