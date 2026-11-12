import os
import time
import base64
import logging
from typing import Dict, List, Optional
from google import genai
from google.genai import types

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_agent")

def get_configured_models() -> List[str]:
    """Obtiene la lista priorizada de modelos a partir de las variables de entorno."""
    primary = os.getenv("GEMINI_PRIMARY_IMAGE_MODEL", "imagen-3.0-generate-002").strip()
    fallback_1 = os.getenv("GEMINI_FALLBACK_MODEL_1", "imagen-3.0-fast-generate-001").strip()
    fallback_2 = os.getenv("GEMINI_FALLBACK_MODEL_2", "imagen-2.0-generate-001").strip()
    fallback_3 = os.getenv("GEMINI_FALLBACK_MODEL_3", "").strip()

    models = [primary]
    for fb in [fallback_1, fallback_2, fallback_3]:
        if fb and fb not in models:
            models.append(fb)
    return models

def _generate_single_image_with_resilience(
    prompt: str,
    aspect_ratio: str = "16:9"
) -> Dict[str, str]:
    """
    Intenta generar una imagen iterando sobre los modelos y aplicando reintentos por modelo.
    aspect_ratio: '16:9' para banner o '4:3' / '3:2' para ticket.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("tu_api_key"):
        logger.warning("No hay GEMINI_API_KEY válida configurada. Usando generación mock local.")
        return {
            "image_url": f"https://placehold.co/1200x630/1e1b4b/38bdf8?text={prompt[:30].replace(' ', '+')}",
            "model_used": "mock-local"
        }

    models_to_try = get_configured_models()
    max_retries = int(os.getenv("IMAGE_GEN_MAX_RETRIES_PER_MODEL", "2"))
    retry_delay = float(os.getenv("IMAGE_GEN_RETRY_DELAY_SECONDS", "2"))

    client = genai.Client(api_key=api_key)

    for model_name in models_to_try:
        logger.info(f"Intentando generación de imagen con el modelo: {model_name}")
        for attempt in range(1, max_retries + 1):
            try:
                # Invocación SDK Google GenAI (Imagen 3)
                result = client.models.generate_images(
                    model=model_name,
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        output_mime_type="image/jpeg",
                        aspect_ratio=aspect_ratio,
                        person_generation="ALLOW_ADULT",
                    )
                )

                if result.generated_images:
                    img_bytes = result.generated_images[0].image.image_bytes
                    base64_img = base64.b64encode(img_bytes).decode("utf-8")
                    data_url = f"data:image/jpeg;base64,{base64_img}"
                    logger.info(f"Generación exitosa con modelo: {model_name} (intento {attempt})")
                    return {"image_url": data_url, "model_used": model_name}

            except Exception as e:
                logger.error(f"Fallo en modelo {model_name} (intento {attempt}/{max_retries}): {str(e)}")
                if attempt < max_retries:
                    time.sleep(retry_delay)

    # Si todos los modelos y reintentos fallan, fallback seguro
    logger.error("Todos los modelos y reintentos fallaron. Retornando imagen fallback de emergencia.")
    return {
        "image_url": f"https://placehold.co/1200x630/1e1b4b/38bdf8?text=Fallback+Asset",
        "model_used": "emergency-fallback"
    }

def generate_raffle_assets(user_prompt: str, raffle_title: str) -> Dict[str, str]:
    """
    Genera los 2 activos visuales solicitados:
    1. Fondo / Banner del tablero público
    2. Plantilla / Arte publicitario del ticket
    """
    # 1. Prompt enriquecido para el fondo/banner
    board_prompt = (
        f"Professional promotional marketing banner background for a virtual raffle named '{raffle_title}'. "
        f"Art style and concept: {user_prompt}. Cinematic lighting, ultra high resolution, vibrant details, clean composition."
    )
    board_result = _generate_single_image_with_resilience(board_prompt, aspect_ratio="16:9")

    # 2. Prompt enriquecido para el ticket
    ticket_prompt = (
        f"Commemorative collectible lottery ticket card design for '{raffle_title}'. "
        f"Theme: {user_prompt}. Graphic design layout, vector luxury accents, premium digital pass, clean borders."
    )
    ticket_result = _generate_single_image_with_resilience(ticket_prompt, aspect_ratio="4:3")

    return {
        "background_image_url": board_result["image_url"],
        "ticket_template_url": ticket_result["image_url"],
        "board_model_used": board_result["model_used"],
        "ticket_model_used": ticket_result["model_used"],
        "generated_prompt": f"Tablero: {board_prompt} | Ticket: {ticket_prompt}"
    }