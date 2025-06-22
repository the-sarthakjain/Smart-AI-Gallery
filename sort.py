import os
import clip
import torch
from PIL import Image
import shutil

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

def sort_images(input_folder, output_folder, categories=None):
    if categories is None:
        categories = ["food", "group photo", "solo photo", "nature"]

    text_tokens = clip.tokenize(categories).to(device)
    os.makedirs(output_folder, exist_ok=True)

    for filename in os.listdir(input_folder):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            image_path = os.path.join(input_folder, filename)
            image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)

            with torch.no_grad():
                image_features = model.encode_image(image)
                text_features = model.encode_text(text_tokens)

                image_features /= image_features.norm(dim=-1, keepdim=True)
                text_features /= text_features.norm(dim=-1, keepdim=True)

                similarity = (image_features @ text_features.T).squeeze(0)
                best_category = categories[similarity.argmax().item()]

            category_path = os.path.join(output_folder, best_category)
            os.makedirs(category_path, exist_ok=True)
            shutil.copy(image_path, os.path.join(category_path, filename))

    return True

