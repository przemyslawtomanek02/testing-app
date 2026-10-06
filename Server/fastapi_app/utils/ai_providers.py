"""
Adaptery dostawcow modeli LLM dla generatora testow.

Klucz API nie jest nigdzie zapisywany - przychodzi w naglowku przy kazdym
zadaniu, zyje tylko w pamieci procesu na czas jednego wywolania.

Kazdy dostawca dostaje ten sam kontrakt (plaski schemat pytan) swoim
natywnym mechanizmem wymuszania JSON-a:
  * anthropic - oficjalne SDK, definicja narzedzia (tool use),
  * google    - REST Gemini, responseSchema,
  * openai    - REST /chat/completions, response_format json_object
                (ta sciezka obsluguje tez OpenRouter, Groq, DeepSeek,
                 Ollama i inne API zgodne z OpenAI - wystarczy base_url).
"""
import json
import logging
from typing import Any, Dict, List, Optional

import httpx

REQUEST_TIMEOUT = 180.0

PROVIDERS: Dict[str, Dict[str, Any]] = {
    "google": {
        "label": "Google Gemini",
        "key_url": "https://aistudio.google.com/apikey",
        "supports_pdf": True,
        "needs_base_url": False,
        "note": "Darmowy tier w Google AI Studio.",
    },
    "anthropic": {
        "label": "Anthropic Claude",
        "key_url": "https://console.anthropic.com/settings/keys",
        "supports_pdf": True,
        "needs_base_url": False,
        "note": "Wymaga pakietu 'anthropic' na serwerze.",
    },
    "openai": {
        "label": "OpenAI / zgodne z OpenAI",
        "key_url": "https://platform.openai.com/api-keys",
        "supports_pdf": False,
        "needs_base_url": True,
        "default_base_url": "https://api.openai.com/v1",
        "note": "Wlasny base_url pozwala podpiac OpenRouter, Groq, Ollama itp.",
    },
}


class ProviderError(Exception):
    """Blad po stronie dostawcy modelu - przenoszony do odpowiedzi HTTP."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class GenerationResult:
    def __init__(
        self,
        data: Optional[Dict[str, Any]] = None,
        text: str = "",
        usage: Optional[Dict[str, Any]] = None,
        notes: Optional[List[str]] = None,
    ):
        self.data = data
        self.text = text
        self.usage = usage or {}
        self.notes = notes or []


def _usage(model: str, prompt_tokens: Any, completion_tokens: Any) -> Dict[str, Any]:
    return {
        "model": model,
        "input_tokens": int(prompt_tokens or 0),
        "output_tokens": int(completion_tokens or 0),
    }


# --- Anthropic -------------------------------------------------------------

async def _generate_anthropic(
    model: str,
    api_key: str,
    system_prompt: str,
    messages: List[Dict[str, str]],
    schema: Dict[str, Any],
    documents: List[Dict[str, str]],
) -> GenerationResult:
    try:
        import anthropic
    except ImportError:
        raise ProviderError(
            "Na serwerze brakuje pakietu 'anthropic'. Zainstaluj go "
            "(pip install anthropic) albo wybierz innego dostawce.",
            status_code=503,
        )

    client = anthropic.AsyncAnthropic(api_key=api_key, timeout=REQUEST_TIMEOUT, max_retries=1)

    sdk_messages: List[Dict[str, Any]] = []
    for index, message in enumerate(messages):
        role = "assistant" if message["role"] == "assistant" else "user"
        blocks: List[Dict[str, Any]] = []
        if index == 0 and documents:
            for doc in documents:
                blocks.append({
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": doc.get("media_type", "application/pdf"),
                        "data": doc["data"],
                    },
                })
        blocks.append({"type": "text", "text": message["content"]})
        sdk_messages.append({"role": role, "content": blocks})

    tool = {
        "name": "create_test",
        "description": "Zapisuje wygenerowany test egzaminacyjny w ustalonym formacie.",
        "input_schema": schema,
    }

    try:
        async with client.messages.stream(
            model=model,
            max_tokens=32000,
            system=system_prompt,
            messages=sdk_messages,
            tools=[tool],
            tool_choice={"type": "auto"},
        ) as stream:
            message = await stream.get_final_message()
    except anthropic.AuthenticationError:
        raise ProviderError("Anthropic odrzucil klucz API (401).", status_code=401)
    except anthropic.RateLimitError:
        raise ProviderError("Limit zapytan Anthropic (429). Spróbuj za chwile.", status_code=429)
    except anthropic.APIStatusError as exc:
        raise ProviderError("Anthropic zwrocil blad %s: %s" % (exc.status_code, exc.message))
    except anthropic.APIConnectionError as exc:
        raise ProviderError("Nie udalo sie polaczyc z Anthropic: %s" % exc, status_code=504)

    if message.stop_reason == "refusal":
        raise ProviderError("Model odmowil wykonania tego zadania.", status_code=422)

    data = None
    texts: List[str] = []
    for block in message.content:
        if block.type == "tool_use" and block.name == "create_test":
            data = block.input
        elif block.type == "text":
            texts.append(block.text)

    return GenerationResult(
        data=data,
        text="\n".join(texts),
        usage=_usage(model, message.usage.input_tokens, message.usage.output_tokens),
    )


# --- Google Gemini ---------------------------------------------------------

_GEMINI_SCHEMA_KEYS = {
    "type", "format", "description", "nullable", "enum",
    "items", "properties", "required", "minItems", "maxItems",
}


def _to_gemini_schema(node: Any) -> Any:
    """Przycina JSON Schema do podzbioru akceptowanego przez responseSchema."""
    if isinstance(node, list):
        return [_to_gemini_schema(item) for item in node]
    if not isinstance(node, dict):
        return node

    cleaned: Dict[str, Any] = {}
    for key, value in node.items():
        if key not in _GEMINI_SCHEMA_KEYS:
            continue
        if key == "type" and isinstance(value, str):
            cleaned[key] = value.upper()
        elif key in ("minItems", "maxItems"):
            # Schema Gemini typuje te pola jako int64, ktore w JSON-ie
            # proto3 przenosi sie jako string.
            cleaned[key] = str(value)
        elif key == "properties" and isinstance(value, dict):
            cleaned[key] = {k: _to_gemini_schema(v) for k, v in value.items()}
        else:
            cleaned[key] = _to_gemini_schema(value)
    return cleaned


def _strip_array_limits(node: Any) -> Any:
    """Kopia schematu bez minItems/maxItems - gdy dostawca ich nie przyjmuje."""
    if isinstance(node, list):
        return [_strip_array_limits(item) for item in node]
    if not isinstance(node, dict):
        return node
    return {
        key: _strip_array_limits(value)
        for key, value in node.items()
        if key not in ("minItems", "maxItems")
    }


async def _generate_google(
    model: str,
    api_key: str,
    system_prompt: str,
    messages: List[Dict[str, str]],
    schema: Dict[str, Any],
    documents: List[Dict[str, str]],
    max_output_tokens: int = 32768,
) -> GenerationResult:
    contents: List[Dict[str, Any]] = []
    for index, message in enumerate(messages):
        parts: List[Dict[str, Any]] = []
        if index == 0 and documents:
            for doc in documents:
                parts.append({
                    "inlineData": {
                        "mimeType": doc.get("media_type", "application/pdf"),
                        "data": doc["data"],
                    }
                })
        parts.append({"text": message["content"]})
        contents.append({
            "role": "model" if message["role"] == "assistant" else "user",
            "parts": parts,
        })

    body = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _to_gemini_schema(schema),
            "maxOutputTokens": max_output_tokens,
        },
    }

    url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % model
    notes: List[str] = []

    async def post(payload: Dict[str, Any]) -> httpx.Response:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            try:
                return await client.post(
                    url,
                    headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                    json=payload,
                )
            except httpx.RequestError as exc:
                raise ProviderError("Nie udalo sie polaczyc z Gemini: %s" % exc, status_code=504)

    response = await post(body)

    # Nie kazda wersja API przyjmuje limity dlugosci tablic w responseSchema.
    # Zamiast blokowac generowanie, powtarzamy raz bez nich.
    if response.status_code == 400:
        # Odrzucony bywa i schemat z limitami tablic, i zbyt wysoki budzet
        # wyjscia - ponawiamy raz w najbardziej zachowawczej wersji.
        retry_config = dict(body["generationConfig"])
        retry_config["responseSchema"] = _strip_array_limits(retry_config["responseSchema"])
        retry_config["maxOutputTokens"] = min(retry_config.get("maxOutputTokens", 32768), 32768)
        changed = retry_config != body["generationConfig"]

        if changed:
            logging.warning(
                "Gemini odrzucil zadanie - ponawiam w wersji zachowawczej. Szczegoly: %s",
                _http_error_message("Gemini", response),
            )
            retry_body = dict(body)
            retry_body["generationConfig"] = retry_config
            retried = await post(retry_body)
            if retried.status_code < 400:
                notes.append(
                    "Dostawca nie przyjal pelnej konfiguracji zadania - powtorzono "
                    "w wersji zachowawczej, wiec liczba pytan moze sie roznic od zamowionej."
                )
                response = retried

    if response.status_code >= 400:
        raise ProviderError(_http_error_message("Gemini", response), status_code=_map_status(response.status_code))

    payload = response.json()
    candidates = payload.get("candidates") or []
    if not candidates:
        reason = (payload.get("promptFeedback") or {}).get("blockReason")
        raise ProviderError(
            "Gemini nie zwrocil odpowiedzi%s." % (" (blockReason: %s)" % reason if reason else ""),
            status_code=422,
        )

    first = candidates[0]
    text = "".join(
        part.get("text", "") for part in (first.get("content") or {}).get("parts") or []
    )
    finish_reason = first.get("finishReason")
    if finish_reason in ("SAFETY", "RECITATION", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"):
        raise ProviderError(
            "Gemini zatrzymal generowanie (powod: %s). Przeformuluj polecenie." % finish_reason,
            status_code=422,
        )

    if finish_reason == "MAX_TOKENS":
        if not text.strip():
            raise ProviderError(
                "Gemini zuzylo caly budzet tokenow, zanim zdazylo cokolwiek zwrocic. "
                "Zmniejsz liczbe pytan lub liczbe typow pytan.",
                status_code=422,
            )
        notes.append(
            "Model przerwal generowanie na limicie tokenow - zachowano pytania, "
            "ktore zdazyl dokonczyc. Przy tylu typach pytan zamawiaj mniejsze partie."
        )

    meta = payload.get("usageMetadata") or {}
    return GenerationResult(
        text=text,
        usage=_usage(model, meta.get("promptTokenCount"), meta.get("candidatesTokenCount")),
        notes=notes,
    )


# --- OpenAI oraz API zgodne z OpenAI ---------------------------------------

async def _generate_openai(
    model: str,
    api_key: str,
    system_prompt: str,
    messages: List[Dict[str, str]],
    schema: Dict[str, Any],
    documents: List[Dict[str, str]],
    base_url: Optional[str],
) -> GenerationResult:
    api_messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for index, message in enumerate(messages):
        if index == 0 and documents:
            content: List[Dict[str, Any]] = []
            for doc in documents:
                content.append({
                    "type": "file",
                    "file": {
                        "filename": doc.get("filename", "source.pdf"),
                        "file_data": "data:%s;base64,%s" % (
                            doc.get("media_type", "application/pdf"), doc["data"],
                        ),
                    },
                })
            content.append({"type": "text", "text": message["content"]})
            api_messages.append({"role": message["role"], "content": content})
        else:
            api_messages.append({"role": message["role"], "content": message["content"]})

    root = (base_url or PROVIDERS["openai"]["default_base_url"]).rstrip("/")
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        try:
            response = await client.post(
                "%s/chat/completions" % root,
                headers={
                    "Authorization": "Bearer %s" % api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": api_messages,
                    "response_format": {"type": "json_object"},
                },
            )
        except httpx.RequestError as exc:
            raise ProviderError("Nie udalo sie polaczyc z %s: %s" % (root, exc), status_code=504)

    if response.status_code >= 400:
        raise ProviderError(_http_error_message(root, response), status_code=_map_status(response.status_code))

    payload = response.json()
    choices = payload.get("choices") or []
    if not choices:
        raise ProviderError("Dostawca nie zwrocil zadnej odpowiedzi.", status_code=422)

    text = (choices[0].get("message") or {}).get("content") or ""
    usage = payload.get("usage") or {}
    return GenerationResult(
        text=text,
        usage=_usage(model, usage.get("prompt_tokens"), usage.get("completion_tokens")),
    )


# --- Wspolne ---------------------------------------------------------------

def _map_status(status_code: int) -> int:
    if status_code in (401, 403):
        return 401
    if status_code == 429:
        return 429
    return 502


def _http_error_message(provider_label: str, response: httpx.Response) -> str:
    try:
        payload = response.json()
        error = payload.get("error")
        if isinstance(error, dict):
            parts = [error.get("message") or ""]
            if error.get("status"):
                parts.append("[%s]" % error["status"])
            # Google chowa prawdziwa przyczyne w error.details[].fieldViolations
            for entry in error.get("details") or []:
                if not isinstance(entry, dict):
                    continue
                for violation in entry.get("fieldViolations") or []:
                    field = violation.get("field")
                    description = violation.get("description")
                    parts.append("%s: %s" % (field, description) if field else str(description))
                if entry.get("reason"):
                    parts.append("reason=%s" % entry["reason"])
            detail = " ".join(p for p in parts if p).strip() or json.dumps(error)[:300]
        elif error is None:
            detail = json.dumps(payload)[:300]
        else:
            detail = str(error)[:300]
    except ValueError:
        detail = response.text[:300]

    if response.status_code in (401, 403):
        return "%s odrzucil klucz API (%s): %s" % (provider_label, response.status_code, detail)
    return "%s zwrocil blad %s: %s" % (provider_label, response.status_code, detail)


# --- Lista dostepnych modeli -----------------------------------------------

async def _list_models_google(api_key: str) -> List[Dict[str, str]]:
    models: List[Dict[str, str]] = []
    page_token: Optional[str] = None
    pages_left = 20  # zabezpieczenie przed powtarzajacym sie nextPageToken

    async with httpx.AsyncClient(timeout=60.0) as client:
        while pages_left > 0:
            pages_left -= 1
            params: Dict[str, Any] = {"pageSize": 200}
            if page_token:
                params["pageToken"] = page_token
            try:
                response = await client.get(
                    "https://generativelanguage.googleapis.com/v1beta/models",
                    headers={"x-goog-api-key": api_key},
                    params=params,
                )
            except httpx.RequestError as exc:
                raise ProviderError("Nie udalo sie polaczyc z Gemini: %s" % exc, status_code=504)

            if response.status_code >= 400:
                raise ProviderError(
                    _http_error_message("Gemini", response),
                    status_code=_map_status(response.status_code),
                )

            payload = response.json()
            for entry in payload.get("models") or []:
                # Pole z lista metod zmienialo juz nazwe - jesli go nie ma,
                # wolimy pokazac model niz wyciac cala liste.
                methods = (
                    entry.get("supportedGenerationMethods")
                    or entry.get("supportedActions")
                )
                if methods and "generateContent" not in methods:
                    continue
                model_id = (entry.get("name") or "").replace("models/", "", 1)
                if not model_id:
                    continue
                models.append({
                    "id": model_id,
                    "label": entry.get("displayName") or model_id,
                })

            next_token = payload.get("nextPageToken")
            if not next_token or next_token == page_token:
                break
            page_token = next_token

    return models


async def _list_models_anthropic(api_key: str) -> List[Dict[str, str]]:
    try:
        import anthropic
    except ImportError:
        raise ProviderError(
            "Na serwerze brakuje pakietu 'anthropic'. Zainstaluj go "
            "(pip install anthropic) albo wybierz innego dostawce.",
            status_code=503,
        )

    client = anthropic.AsyncAnthropic(api_key=api_key, timeout=60.0, max_retries=1)
    try:
        page = await client.models.list(limit=100)
    except anthropic.AuthenticationError:
        raise ProviderError("Anthropic odrzucil klucz API (401).", status_code=401)
    except anthropic.APIStatusError as exc:
        raise ProviderError("Anthropic zwrocil blad %s: %s" % (exc.status_code, exc.message))
    except anthropic.APIConnectionError as exc:
        raise ProviderError("Nie udalo sie polaczyc z Anthropic: %s" % exc, status_code=504)

    return [
        {"id": model.id, "label": getattr(model, "display_name", None) or model.id}
        for model in page.data
    ]


async def _list_models_openai(api_key: str, base_url: Optional[str]) -> List[Dict[str, str]]:
    root = (base_url or PROVIDERS["openai"]["default_base_url"]).rstrip("/")
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.get(
                "%s/models" % root,
                headers={"Authorization": "Bearer %s" % api_key},
            )
        except httpx.RequestError as exc:
            raise ProviderError("Nie udalo sie polaczyc z %s: %s" % (root, exc), status_code=504)

    if response.status_code >= 400:
        raise ProviderError(
            _http_error_message(root, response),
            status_code=_map_status(response.status_code),
        )

    payload = response.json()
    entries = payload.get("data") if isinstance(payload, dict) else payload
    models: List[Dict[str, str]] = []
    for entry in entries or []:
        model_id = entry.get("id") if isinstance(entry, dict) else entry
        if model_id:
            models.append({"id": str(model_id), "label": str(model_id)})
    return models


async def list_models(
    provider: str,
    api_key: str,
    base_url: Optional[str] = None,
) -> List[Dict[str, str]]:
    """
    Zwraca modele dostepne dla danego klucza. Lista pochodzi zawsze z API
    dostawcy - nazwy modeli zmieniaja sie i znikaja, wiec nie trzymamy
    ich na sztywno w kodzie.
    """
    if provider not in PROVIDERS:
        raise ProviderError("Nieznany dostawca '%s'." % provider, status_code=400)

    if provider == "google":
        models = await _list_models_google(api_key)
    elif provider == "anthropic":
        models = await _list_models_anthropic(api_key)
    else:
        models = await _list_models_openai(api_key, base_url)

    # Alfabetycznie - modele jednej rodziny trafiaja obok siebie
    # (gemini-2.x, gemini-3.x, gemma..., learnlm...), co najlatwiej przejrzec.
    models.sort(key=lambda m: m["id"])
    return models


async def generate_test_json(
    provider: str,
    model: str,
    api_key: str,
    system_prompt: str,
    messages: List[Dict[str, str]],
    schema: Dict[str, Any],
    documents: Optional[List[Dict[str, str]]] = None,
    base_url: Optional[str] = None,
    max_output_tokens: int = 32768,
) -> GenerationResult:
    if provider not in PROVIDERS:
        raise ProviderError("Nieznany dostawca '%s'." % provider, status_code=400)

    documents = documents or []
    if documents and not PROVIDERS[provider]["supports_pdf"]:
        logging.info("Dostawca %s moze nie obslugiwac zalacznikow PDF.", provider)

    if provider == "anthropic":
        return await _generate_anthropic(model, api_key, system_prompt, messages, schema, documents)
    if provider == "google":
        return await _generate_google(
            model, api_key, system_prompt, messages, schema, documents, max_output_tokens
        )
    return await _generate_openai(
        model, api_key, system_prompt, messages, schema, documents, base_url
    )


def _repair_truncated_json(text: str) -> Optional[str]:
    """
    Ratuje odpowiedz ucieta w polowie: przycina ja do ostatniego kompletnego
    obiektu w tablicy i domyka nawiasy. Dzieki temu z przerwanej generacji
    zostaja pytania, ktore model zdazyl dokonczyc.
    """
    stack: List[str] = []
    in_string = False
    escaped = False
    last_safe: Optional[tuple] = None

    for index, char in enumerate(text):
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            stack.append("}")
        elif char == "[":
            stack.append("]")
        elif char in ("}", "]"):
            if not stack or stack[-1] != char:
                return None
            stack.pop()
            # Zamkniecie obiektu lezacego w tablicy to bezpieczne miejsce ciecia.
            if char == "}" and stack and stack[-1] == "]":
                last_safe = (index + 1, list(stack))

    if not last_safe:
        return None

    cut_at, open_brackets = last_safe
    return text[:cut_at] + "".join(reversed(open_brackets))


def extract_json_object(text: str, notes: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Wyciaga obiekt JSON z odpowiedzi tekstowej. Modele czasem owijaja
    wynik w ```json ... ```, dopisuja komentarz albo zostaja ucieci
    w polowie na limicie tokenow.
    """
    if not text or not text.strip():
        raise ValueError("Model zwrocil pusta odpowiedz.")

    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.split("```")[1] if "```" in candidate[3:] else candidate[3:]
        if candidate.lstrip().lower().startswith("json"):
            candidate = candidate.lstrip()[4:]
        candidate = candidate.strip()

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(candidate[start:end + 1])
        except json.JSONDecodeError:
            pass

    if start != -1:
        repaired = _repair_truncated_json(candidate[start:])
        if repaired:
            try:
                data = json.loads(repaired)
            except json.JSONDecodeError:
                data = None
            if data is not None:
                if notes is not None:
                    notes.append(
                        "Odpowiedz modelu zostala ucieta - odzyskano kompletne pytania "
                        "z poczatku odpowiedzi."
                    )
                return data

    raise ValueError("Odpowiedz modelu nie jest poprawnym JSON-em.")
