"""App de Modal del worker DockMind (RA-10).

Despliegue (solo con autorización): `modal deploy modal_app.py` desde esta carpeta,
con el venv activo para que `dockmind` se empaquete desde el código local.

El secret `cargomesh-meta-worker` (nombre de la guía del equipo, docs/meta/prompts/ramon-jean.md) debe tener:
  META_MODEL_API_KEY        clave de la Meta API (empieza con LLM_)
  DOCKMIND_CALLBACK_SECRET  el mismo valor que DOCKMIND_CALLBACK_SECRET en la app web (firma del callback)
  DOCKMIND_ALLOWED_HOSTS    hosts permitidos, separados por coma: <ref>.supabase.co (clip y video anotado) y el host de
                            DOCKMIND_CALLBACK_URL
No lleva claves de Supabase: el worker solo usa las URLs firmadas que manda la app.

Referencias: https://modal.com/docs/guide/webhooks y https://modal.com/docs/guide/webhook-proxy-auth
"""

import os

import modal

app = modal.App("cargomesh-dockmind")
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install("numpy>=1.26", "opencv-python-headless>=4.9", "openai>=1.99", "httpx", "fastapi[standard]")
    .add_local_python_source("dockmind")
)
secret = modal.Secret.from_name("cargomesh-meta-worker")
launched = modal.Dict.from_name("cargomesh-dockmind-jobs", create_if_missing=True)
# Observaciones ya calculadas y recibos de entrega. Modal borra cada entrada tras 7 días sin uso:
# https://modal.com/docs/reference/modal.Dict
results = modal.Dict.from_name("cargomesh-dockmind-results", create_if_missing=True)


@app.function(image=image, secrets=[secret], timeout=900)
def analyze(payload: dict) -> dict:
    from dataclasses import asdict

    import httpx

    from dockmind.jobs import allowed_hosts_from_env, parse_job, run_job

    job = parse_job(payload, allowed_hosts_from_env())
    with httpx.Client(timeout=120, follow_redirects=False) as http:
        outcome = run_job(job, os.environ["DOCKMIND_CALLBACK_SECRET"], http, store=results)
    receipt = {
        "job_id": job.job_id,
        "attempt": job.attempt,
        "status": outcome.result["status"],
        "error": outcome.result["error"],
        "reused": outcome.reused,
        "delivery": asdict(outcome.delivery),
    }
    results.put(f"delivery:{job.job_id}:{job.attempt}", receipt)  # se consulta con `modal dict get`
    return receipt


@app.function(image=image, secrets=[secret])
@modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
def jobs(payload: dict) -> dict:
    """Valida el job y lanza el análisis sin esperar. El mismo job e intento nunca se lanza dos veces."""
    from fastapi import HTTPException

    from dockmind.jobs import JobRejected, allowed_hosts_from_env, parse_job

    try:
        job = parse_job(payload, allowed_hosts_from_env())
    except JobRejected as error:
        raise HTTPException(status_code=400, detail={"code": error.code, "message": str(error)}) from error
    key = f"{job.job_id}:{job.attempt}"
    if not launched.put(key, "pending", skip_if_exists=True):  # reserva el job antes de lanzarlo
        return {"job_id": job.job_id, "attempt": job.attempt, "call_id": launched.get(key), "duplicate": True}
    call = analyze.spawn(payload)
    launched[key] = call.object_id
    return {"job_id": job.job_id, "attempt": job.attempt, "call_id": call.object_id, "duplicate": False}
