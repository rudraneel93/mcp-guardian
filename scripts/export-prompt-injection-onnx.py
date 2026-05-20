#!/usr/bin/env python3
"""
Export DistilBERT prompt-injection classifier to ONNX for @xenova/transformers.
Model: acuvity/distilbert-base-uncased-prompt-injection-v0.1
"""
from pathlib import Path

from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer

MODEL_ID = "acuvity/distilbert-base-uncased-prompt-injection-v0.1"
OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "ml" / "prompt-injection"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Exporting {MODEL_ID} -> {OUT_DIR}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = ORTModelForSequenceClassification.from_pretrained(
        MODEL_ID,
        export=True,
        provider="CPUExecutionProvider",
    )
    tokenizer.save_pretrained(OUT_DIR)
    model.save_pretrained(OUT_DIR)
    onnx_dir = OUT_DIR / "onnx"
    onnx_dir.mkdir(exist_ok=True)
    src = OUT_DIR / "model.onnx"
    if src.exists():
        dest = onnx_dir / "model.onnx"
        if not dest.exists():
            dest.symlink_to("../model.onnx")
        quant = onnx_dir / "model_quantized.onnx"
        if not quant.exists():
            quant.symlink_to("../model.onnx")
    print("Export complete.")


if __name__ == "__main__":
    main()
