from pydantic import BaseModel


class OverviewResponse(BaseModel):
    health_score: int | None = None
