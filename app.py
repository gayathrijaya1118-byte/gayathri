import os
from dotenv import load_dotenv
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = Flask(__name__)


def get_models():
    names = []
    try:
        for m in genai.list_.models():
            name = m.name
            if "generateContent" not in m.supported_generation_methods:
                continue
            if "flash" not in name:
                continue
            if any(x in name for x in ["image", "tts", "live", "audio"]):
                continue
            names.append(name)
    except Exception as e:
        print("Could not list models:", e)
    if not names:
        names = ["models/gemini-3.6-flash"]
    names.sort(key=lambda n: 0 if "lite" in n else 1)
    return names


MODEL_NAMES = get_models()
print("Models to try:", MODEL_NAMES)


def build_prompt(d):
    return f"""You are a friendly fitness coach. Create a simple, safe, personalised plan.

User details:
- Age: {d.get('age')}
- Gender: {d.get('gender')}
- Height: {d.get('height')} cm
- Weight: {d.get('weight')} kg
- Goal: {d.get('goal')}
- Activity level: {d.get('activity_level')}
- Workout days per week: {d.get('workout_days')}
- Diet preference: {d.get('diet') or 'No preference'}
- Health conditions / injuries: {d.get('conditions') or 'none'}

Give the answer using this exact structure with headings:

## Workout Plan
(day by day, one line per day)

## Diet Plan
(simple daily meals matching the diet preference)

## Tips
(three short tips)

Keep the whole answer under 400 words. Use plain text, no markdown tables."""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    prompt = build_prompt(data)
    last_error = "No model available"

    for name in MODEL_NAMES:
        try:
            model = genai.GenerativeModel(name)
            response = model.generate_content(
                prompt,
                request_options={"timeout": 120},
            )
            return jsonify({"plan": response.text})
        except Exception as e:
            last_error = str(e)
            print(f"Model {name} failed:", last_error[:200])
            continue

    if "429" in last_error:
        return jsonify({
            "error": "Daily free quota finished for all models. Please try again later."
        }), 429
    return jsonify({"error": last_error}), 500


if __name__ == "__main__":
    app.run(debug=True)