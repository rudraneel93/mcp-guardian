# DistilBERT prompt-injection ONNX

Fine-tuned model: `acuvity/distilbert-base-uncased-prompt-injection-v0.1`

## Generate ONNX weights (required before ML semantic guard runs)

```bash
pip install 'optimum[onnxruntime]' transformers torch onnx onnxruntime
pnpm ml:export
pnpm ml:preload
```

Weights are written to `onnx/model.onnx` (~256MB). Large binaries are gitignored; bake into images or artifact storage for production.

## Runtime

- Policy flag: `policy.ml_semantic: true` (default in `default-policy.yaml`)
- Env: `GUARDIAN_ML_MODEL_PATH` overrides the model directory
- Env: `GUARDIAN_ML_SEMANTIC_THRESHOLD` (default `0.5`)
