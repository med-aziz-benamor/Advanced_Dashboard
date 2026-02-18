"""Compatibility entrypoint. Use backend.app.main moving forward."""

from backend.app.main import app


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        'backend.app.main:app',
        host='0.0.0.0',
        port=8000,
        reload=True,
        log_level='info',
    )
