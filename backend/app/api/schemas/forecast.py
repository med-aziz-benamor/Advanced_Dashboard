from pydantic import BaseModel


class ForecastResponse(BaseModel):
    history: list[dict]
    forecast: list[dict]
    horizon: str
